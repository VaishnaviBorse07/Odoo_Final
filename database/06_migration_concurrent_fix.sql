-- ============================================================
-- Migration: Concurrent Booking Safety Net
-- Run once against your PostgreSQL database.
-- ============================================================

-- Unique partial index: prevents two non-cancelled bookings from occupying
-- the exact same (resource, date, start_time) when capacity is NOT managed.
-- For capacity-managed slots the SUM check in the app handles limits.
CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_slot_exclusive
ON bookings (resource_id, booking_date, start_time)
WHERE status <> 'cancelled';

-- Optional: speed up the booked-capacity SUM query used in create_booking
CREATE INDEX IF NOT EXISTS idx_bookings_resource_date_status
ON bookings (resource_id, booking_date, status)
WHERE status <> 'cancelled';
