-- ZenFlow: seed users, classes, resources, slots, questions, sample bookings.
-- Requires 01_schema.sql. All seeded users: password ZenFlow@2025 (bcrypt 10 rounds, matches prompt.md).

INSERT INTO users (full_name, email, password_hash, role, status) VALUES
  ('Admin User', 'admin@zenflow.com', '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'admin', 'active'),
  ('Meera Sharma', 'meera@zenflow.com', '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'organiser', 'active'),
  ('Rohan Verma', 'rohan@zenflow.com', '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'organiser', 'active'),
  ('Ananya Patel', 'ananya@gmail.com', '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer', 'active'),
  ('Vikram Singh', 'vikram@gmail.com', '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer', 'active'),
  ('Priya Nair', 'priya@gmail.com', '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer', 'active'),
  ('Sara Khan', 'sara@gmail.com', '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer', 'pending_verification');

INSERT INTO appointment_types (
  organiser_id, name, description, duration_minutes, location, status, slot_type,
  max_capacity, manage_capacity, advance_payment, payment_amount,
  confirmation_type, assignment_type, share_token
) VALUES
  ((SELECT id FROM users WHERE email = 'meera@zenflow.com'), 'Morning Hatha Yoga',
   'Gentle Hatha to start your day.', 60, 'Studio Hall A', 'published', 'weekly',
   15, TRUE, TRUE, 500.00, 'automatic', 'auto', replace(gen_random_uuid()::text, '-', '')),
  ((SELECT id FROM users WHERE email = 'meera@zenflow.com'), 'Vinyasa Flow',
   'Dynamic flow sequences.', 60, 'Studio Hall B', 'published', 'weekly',
   8, TRUE, TRUE, 600.00, 'automatic', 'auto', replace(gen_random_uuid()::text, '-', '')),
  ((SELECT id FROM users WHERE email = 'meera@zenflow.com'), 'Guided Meditation',
   'Mindfulness and breath.', 45, 'Studio Hall B', 'published', 'weekly',
   8, TRUE, TRUE, 150.00, 'automatic', 'auto', replace(gen_random_uuid()::text, '-', '')),
  ((SELECT id FROM users WHERE email = 'meera@zenflow.com'), 'Private Yoga Session',
   'One-on-one instruction.', 60, 'Studio Hall C', 'published', 'flexible',
   1, FALSE, TRUE, 1500.00, 'manual', 'manual', replace(gen_random_uuid()::text, '-', '')),
  ((SELECT id FROM users WHERE email = 'meera@zenflow.com'), 'Ashtanga Intensive Workshop',
   'Deep Ashtanga practice.', 90, 'Open Terrace', 'published', 'flexible',
   20, TRUE, TRUE, 1200.00, 'automatic', 'auto', replace(gen_random_uuid()::text, '-', '')),
  ((SELECT id FROM users WHERE email = 'meera@zenflow.com'), 'Kids Yoga',
   'Fun yoga for children.', 45, 'Studio Hall A', 'unpublished', 'weekly',
   12, TRUE, TRUE, 250.00, 'automatic', 'auto', replace(gen_random_uuid()::text, '-', ''));

INSERT INTO resources (appointment_type_id, user_id, resource_name) VALUES
  ((SELECT id FROM appointment_types WHERE name = 'Morning Hatha Yoga'),
   (SELECT id FROM users WHERE email = 'meera@zenflow.com'), 'Instructor Meera'),
  ((SELECT id FROM appointment_types WHERE name = 'Vinyasa Flow'),
   (SELECT id FROM users WHERE email = 'rohan@zenflow.com'), 'Instructor Rohan'),
  ((SELECT id FROM appointment_types WHERE name = 'Guided Meditation'),
   (SELECT id FROM users WHERE email = 'meera@zenflow.com'), 'Instructor Meera'),
  ((SELECT id FROM appointment_types WHERE name = 'Private Yoga Session'),
   NULL, 'Instructor Priya'),
  ((SELECT id FROM appointment_types WHERE name = 'Ashtanga Intensive Workshop'),
   (SELECT id FROM users WHERE email = 'rohan@zenflow.com'), 'Instructor Rohan'),
  ((SELECT id FROM appointment_types WHERE name = 'Kids Yoga'),
   (SELECT id FROM users WHERE email = 'meera@zenflow.com'), 'Instructor Meera');

INSERT INTO working_hours (resource_id, day_of_week, start_time, end_time, is_available)
SELECT r.id, t.dow, t.st, t.en, TRUE
FROM resources r
JOIN appointment_types at ON at.id = r.appointment_type_id
CROSS JOIN (VALUES
  (1, TIME '07:00', TIME '08:00'),
  (3, TIME '07:00', TIME '08:00'),
  (5, TIME '07:00', TIME '08:00')
) AS t(dow, st, en)
WHERE at.name = 'Morning Hatha Yoga' AND r.resource_name = 'Instructor Meera';

INSERT INTO working_hours (resource_id, day_of_week, start_time, end_time, is_available)
SELECT r.id, d.dow, TIME '08:00', TIME '09:00', TRUE
FROM resources r
JOIN appointment_types at ON at.id = r.appointment_type_id
CROSS JOIN (VALUES (2), (4), (6)) AS d(dow)
WHERE at.name = 'Vinyasa Flow';

INSERT INTO working_hours (resource_id, day_of_week, start_time, end_time, is_available)
SELECT r.id, d.dow, TIME '09:00', TIME '09:45', TRUE
FROM resources r
JOIN appointment_types at ON at.id = r.appointment_type_id
CROSS JOIN (VALUES (1), (3), (5)) AS d(dow)
WHERE at.name = 'Guided Meditation';

INSERT INTO working_hours (resource_id, day_of_week, start_time, end_time, is_available)
SELECT r.id, 6, TIME '10:00', TIME '10:45', TRUE
FROM resources r
JOIN appointment_types at ON at.id = r.appointment_type_id
WHERE at.name = 'Kids Yoga';

INSERT INTO flexible_slots (resource_id, slot_date, start_time, end_time, is_available)
SELECT r.id, CURRENT_DATE + n, TIME '07:00', TIME '08:00', TRUE
FROM resources r
JOIN appointment_types at ON at.id = r.appointment_type_id
CROSS JOIN (VALUES (1), (3), (5), (7), (9)) AS v(n)
WHERE at.name = 'Private Yoga Session';

INSERT INTO flexible_slots (resource_id, slot_date, start_time, end_time, is_available)
SELECT r.id, CURRENT_DATE + 14, TIME '06:00', TIME '07:30', TRUE
FROM resources r
JOIN appointment_types at ON at.id = r.appointment_type_id
WHERE at.name = 'Ashtanga Intensive Workshop'
UNION ALL
SELECT r.id, CURRENT_DATE + 21, TIME '06:00', TIME '07:30', TRUE
FROM resources r
JOIN appointment_types at ON at.id = r.appointment_type_id
WHERE at.name = 'Ashtanga Intensive Workshop';

INSERT INTO appointment_questions (appointment_type_id, question_text, is_required, display_order) VALUES
  ((SELECT id FROM appointment_types WHERE name = 'Morning Hatha Yoga'), 'What is your yoga experience level?', TRUE, 1),
  ((SELECT id FROM appointment_types WHERE name = 'Morning Hatha Yoga'), 'Do you have any injuries we should know about?', TRUE, 2),
  ((SELECT id FROM appointment_types WHERE name = 'Morning Hatha Yoga'), 'Preferred mat type: foam / cork / travel?', FALSE, 3),
  ((SELECT id FROM appointment_types WHERE name = 'Private Yoga Session'), 'What are your specific yoga goals?', TRUE, 1),
  ((SELECT id FROM appointment_types WHERE name = 'Private Yoga Session'), 'Any health conditions or physical limitations?', TRUE, 2),
  ((SELECT id FROM appointment_types WHERE name = 'Private Yoga Session'), 'Have you had private sessions before?', FALSE, 3),
  ((SELECT id FROM appointment_types WHERE name = 'Ashtanga Intensive Workshop'), 'Have you practiced Ashtanga before?', TRUE, 1),
  ((SELECT id FROM appointment_types WHERE name = 'Ashtanga Intensive Workshop'), 'Please rate your current fitness level: 1-5', TRUE, 2);

INSERT INTO bookings (
  appointment_type_id, resource_id, customer_id, booking_date, start_time, end_time,
  status, capacity_booked, payment_status, payment_amount
) VALUES
  ((SELECT id FROM appointment_types WHERE name = 'Morning Hatha Yoga'),
   (SELECT id FROM resources WHERE resource_name = 'Instructor Meera' AND appointment_type_id = (SELECT id FROM appointment_types WHERE name = 'Morning Hatha Yoga')),
   (SELECT id FROM users WHERE email = 'ananya@gmail.com'),
   CURRENT_DATE + 3, TIME '07:00', TIME '08:00', 'confirmed', 1, 'paid', 500.00),
  ((SELECT id FROM appointment_types WHERE name = 'Vinyasa Flow'),
   (SELECT id FROM resources WHERE resource_name = 'Instructor Rohan' AND appointment_type_id = (SELECT id FROM appointment_types WHERE name = 'Vinyasa Flow')),
   (SELECT id FROM users WHERE email = 'vikram@gmail.com'),
   CURRENT_DATE + 5, TIME '08:00', TIME '09:00', 'confirmed', 1, 'paid', 600.00),
  ((SELECT id FROM appointment_types WHERE name = 'Private Yoga Session'),
   (SELECT id FROM resources WHERE resource_name = 'Instructor Priya'),
   (SELECT id FROM users WHERE email = 'priya@gmail.com'),
   CURRENT_DATE + 1, TIME '07:00', TIME '08:00', 'pending', 1, 'pending', 1500.00),
  ((SELECT id FROM appointment_types WHERE name = 'Guided Meditation'),
   (SELECT id FROM resources WHERE resource_name = 'Instructor Meera' AND appointment_type_id = (SELECT id FROM appointment_types WHERE name = 'Guided Meditation')),
   (SELECT id FROM users WHERE email = 'ananya@gmail.com'),
   CURRENT_DATE + 2, TIME '09:00', TIME '09:45', 'confirmed', 1, 'not_required', 0.00),
  ((SELECT id FROM appointment_types WHERE name = 'Morning Hatha Yoga'),
   (SELECT id FROM resources WHERE resource_name = 'Instructor Meera' AND appointment_type_id = (SELECT id FROM appointment_types WHERE name = 'Morning Hatha Yoga')),
   (SELECT id FROM users WHERE email = 'vikram@gmail.com'),
   CURRENT_DATE - 10, TIME '07:00', TIME '08:00', 'completed', 1, 'paid', 500.00);
