-- Dev helper: quick row counts / sanity checks (run manually in psql or GUI).
SELECT * FROM users;
SELECT * FROM otp_verifications;
SELECT * FROM appointment_types;
SELECT * FROM resources;
SELECT * FROM working_hours;
SELECT * FROM flexible_slots;
SELECT * FROM appointment_questions;
SELECT * FROM bookings;
SELECT * FROM booking_answers;
SELECT * FROM reschedule_history;

-- From 03_views_and_functions.sql
SELECT * FROM v_booking_details;
SELECT * FROM v_appointment_summary;