-- ZenFlow: reporting views, slot-availability function, updated_at triggers.

CREATE OR REPLACE VIEW v_booking_details AS
SELECT
  b.id AS booking_id,
  b.booking_date,
  b.start_time,
  b.end_time,
  b.status AS booking_status,
  b.payment_status,
  b.payment_amount,
  b.capacity_booked,
  b.confirmation_token,
  b.cancellation_reason,
  b.created_at,
  c.id AS customer_id,
  c.full_name AS customer_name,
  c.email AS customer_email,
  c.phone AS customer_phone,
  at.id AS appointment_type_id,
  at.name AS service_name,
  at.duration_minutes,
  at.location,
  at.advance_payment,
  at.manage_capacity,
  at.max_capacity,
  at.confirmation_type,
  r.id AS resource_id,
  r.resource_name,
  o.full_name AS organiser_name,
  o.email AS organiser_email,
  o.id AS organiser_id
FROM bookings b
JOIN users c ON b.customer_id = c.id
JOIN appointment_types at ON b.appointment_type_id = at.id
LEFT JOIN resources r ON b.resource_id = r.id
JOIN users o ON at.organiser_id = o.id;

CREATE OR REPLACE VIEW v_appointment_summary AS
SELECT
  at.id,
  at.name,
  at.status,
  at.slot_type,
  at.duration_minutes,
  at.location,
  at.advance_payment,
  at.payment_amount,
  at.share_token,
  at.manage_capacity,
  at.max_capacity,
  at.confirmation_type,
  at.assignment_type,
  at.organiser_id,
  o.full_name AS organiser_name,
  COUNT(DISTINCT r.id) AS resource_count,
  COUNT(DISTINCT b.id) FILTER (
    WHERE b.status IN ('confirmed', 'pending')
      AND b.booking_date >= CURRENT_DATE
  ) AS total_upcoming_bookings
FROM appointment_types at
JOIN users o ON at.organiser_id = o.id
LEFT JOIN resources r ON r.appointment_type_id = at.id AND r.is_active = TRUE
LEFT JOIN bookings b ON b.appointment_type_id = at.id
GROUP BY at.id, o.full_name, o.id;

-- Overlap check: exclusive when manage_capacity is false; otherwise capacity-aware.
CREATE OR REPLACE FUNCTION is_slot_available(
  p_resource_id INT,
  p_date DATE,
  p_start TIME,
  p_end TIME,
  p_exclude_booking_id INT DEFAULT NULL,
  p_appointment_type_id INT DEFAULT NULL,
  p_new_capacity INT DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INT;
  v_manage BOOLEAN;
  v_max INT;
  v_booked_sum INT;
BEGIN
  IF p_appointment_type_id IS NULL THEN
    SELECT COUNT(*) INTO conflict_count
    FROM bookings
    WHERE resource_id = p_resource_id
      AND booking_date = p_date
      AND status != 'cancelled'
      AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
      AND start_time < p_end
      AND end_time > p_start;
    RETURN conflict_count = 0;
  END IF;

  SELECT manage_capacity, COALESCE(max_capacity, 1) INTO v_manage, v_max
  FROM appointment_types WHERE id = p_appointment_type_id;

  SELECT COALESCE(SUM(capacity_booked), 0) INTO v_booked_sum
  FROM bookings
  WHERE resource_id = p_resource_id
    AND booking_date = p_date
    AND status != 'cancelled'
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
    AND start_time < p_end
    AND end_time > p_start;

  IF NOT v_manage THEN
    RETURN v_booked_sum = 0;
  END IF;

  RETURN (v_booked_sum + p_new_capacity) <= v_max;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_apt_updated_at ON appointment_types;
CREATE TRIGGER trg_apt_updated_at
  BEFORE UPDATE ON appointment_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
