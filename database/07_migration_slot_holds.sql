-- ============================================================
-- Migration: Slot Hold System (BookMyShow-style reservation)
-- Run once against your PostgreSQL database.
-- ============================================================

-- Step 1: Add hold_timeout_minutes to appointment_types
-- Organiser configures how many minutes a customer has to pay after selecting a slot.
-- NULL means no hold (instant booking flow, no timer).
ALTER TABLE appointment_types
  ADD COLUMN IF NOT EXISTS hold_timeout_minutes INT DEFAULT 10
    CHECK (hold_timeout_minutes IS NULL OR hold_timeout_minutes BETWEEN 2 AND 60);

COMMENT ON COLUMN appointment_types.hold_timeout_minutes IS
  'Minutes a slot is held for a customer after selection (payment-required only). NULL disables holding.';

-- Step 2: Create the slot_holds table
CREATE TABLE IF NOT EXISTS slot_holds (
  id                  SERIAL PRIMARY KEY,
  customer_id         INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_id         INT          NOT NULL,
  booking_date        DATE         NOT NULL,
  start_time          TIME         NOT NULL,
  end_time            TIME         NOT NULL,
  appointment_type_id INT          NOT NULL REFERENCES appointment_types(id) ON DELETE CASCADE,
  capacity_held       INT          NOT NULL DEFAULT 1 CHECK (capacity_held >= 1),
  expires_at          TIMESTAMPTZ  NOT NULL,
  created_at          TIMESTAMPTZ  DEFAULT NOW()
);

-- Fast expiry cleanup queries
CREATE INDEX IF NOT EXISTS idx_slot_holds_expires
  ON slot_holds (expires_at);

-- Fast availability lookups (resource + date + time range)
CREATE INDEX IF NOT EXISTS idx_slot_holds_resource_date
  ON slot_holds (resource_id, booking_date, start_time, end_time);

-- Allow the same customer to re-hold a slot (updated hold) but not two
-- different customers to hold the exact same non-capacity-managed slot.
-- For capacity-managed slots the SUM approach is used instead (see is_slot_available).
COMMENT ON TABLE slot_holds IS
  'Temporary slot reservations (BookMyShow-style). Rows auto-cleaned by background task.';


-- Step 3: Update is_slot_available() to respect active holds
-- Drop and recreate with hold awareness.
-- The new signature adds an optional p_customer_id so a customer's own hold
-- does not block them from completing their own booking.
DROP FUNCTION IF EXISTS is_slot_available(int, date, time, time, int, int, int);

CREATE OR REPLACE FUNCTION is_slot_available(
    p_resource_id        INT,
    p_date               DATE,
    p_start              TIME,
    p_end                TIME,
    p_exclude_booking_id INT,      -- booking being rescheduled (or NULL)
    p_apt_type_id        INT,
    p_capacity_needed    INT,
    p_customer_id        INT DEFAULT NULL  -- customer placing the hold/booking (exclude their own holds)
) RETURNS BOOLEAN
LANGUAGE plpgsql AS $$
DECLARE
    v_manage_cap    BOOLEAN;
    v_max_cap       INT;
    v_booked_sum    INT;
    v_held_sum      INT;
BEGIN
    SELECT manage_capacity, COALESCE(max_capacity, 1)
    INTO v_manage_cap, v_max_cap
    FROM appointment_types
    WHERE id = p_apt_type_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF v_manage_cap THEN
        -- Capacity-managed: check sum of booked + held capacity
        SELECT COALESCE(SUM(capacity_booked), 0)
        INTO v_booked_sum
        FROM bookings
        WHERE resource_id = p_resource_id
          AND booking_date = p_date
          AND status <> 'cancelled'
          AND start_time < p_end
          AND end_time > p_start
          AND (p_exclude_booking_id IS NULL OR id <> p_exclude_booking_id);

        SELECT COALESCE(SUM(capacity_held), 0)
        INTO v_held_sum
        FROM slot_holds
        WHERE resource_id = p_resource_id
          AND booking_date = p_date
          AND start_time < p_end
          AND end_time > p_start
          AND expires_at > NOW()
          AND (p_customer_id IS NULL OR customer_id <> p_customer_id);

        RETURN (v_booked_sum + v_held_sum + p_capacity_needed) <= v_max_cap;
    ELSE
        -- Non-capacity-managed: slot must be completely free (no bookings, no holds)
        RETURN NOT EXISTS (
            SELECT 1 FROM bookings
            WHERE resource_id = p_resource_id
              AND booking_date = p_date
              AND status <> 'cancelled'
              AND start_time < p_end
              AND end_time > p_start
              AND (p_exclude_booking_id IS NULL OR id <> p_exclude_booking_id)
        ) AND NOT EXISTS (
            SELECT 1 FROM slot_holds
            WHERE resource_id = p_resource_id
              AND booking_date = p_date
              AND start_time < p_end
              AND end_time > p_start
              AND expires_at > NOW()
              AND (p_customer_id IS NULL OR customer_id <> p_customer_id)
        );
    END IF;
END;
$$;
