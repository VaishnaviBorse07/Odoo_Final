-- ZenFlow: rich seed data — users, appointments, resources, multiple slots, questions, bookings.
-- Password for ALL seeded users: ZenFlow@2025 (bcrypt 10 rounds)
-- Run order: 01_schema → 02_seed_data → 03_views_and_functions → 04_payments_and_otp

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. USERS
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO users (full_name, email, password_hash, role, status) VALUES
  -- Admin
  ('Admin User',      'admin@zenflow.com',   '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'admin',     'active'),

  -- Organisers / Instructors
  ('Meera Sharma',    'meera@zenflow.com',   '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'organiser', 'active'),
  ('Rohan Verma',     'rohan@zenflow.com',   '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'organiser', 'active'),
  ('Divya Menon',     'divya@zenflow.com',   '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'organiser', 'active'),

  -- Customers
  ('Ananya Patel',    'ananya@gmail.com',    '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer',  'active'),
  ('Vikram Singh',    'vikram@gmail.com',    '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer',  'active'),
  ('Priya Nair',      'priya@gmail.com',     '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer',  'active'),
  ('Sara Khan',       'sara@gmail.com',      '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer',  'pending_verification'),
  ('Arjun Mehta',     'arjun@gmail.com',     '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer',  'active'),
  ('Neha Gupta',      'neha@gmail.com',      '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer',  'active');


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. APPOINTMENT TYPES
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO appointment_types (
  organiser_id, name, description, duration_minutes, location, status,
  slot_type, max_capacity, manage_capacity, advance_payment, payment_amount,
  confirmation_type, assignment_type, share_token
) VALUES
  -- Meera's classes
  ((SELECT id FROM users WHERE email='meera@zenflow.com'),
   'Morning Hatha Yoga',
   'Gentle Hatha Yoga to awaken your body and calm your mind. Perfect for all levels.',
   60, 'Studio Hall A', 'published', 'weekly',
   15, TRUE, TRUE, 500.00, 'automatic', 'auto', replace(gen_random_uuid()::text,'-','')),

  ((SELECT id FROM users WHERE email='meera@zenflow.com'),
   'Guided Meditation',
   'A deeply relaxing mindfulness session focused on breath, body scan and visualization.',
   45, 'Studio Hall B', 'published', 'weekly',
   10, TRUE, TRUE, 150.00, 'automatic', 'auto', replace(gen_random_uuid()::text,'-','')),

  ((SELECT id FROM users WHERE email='meera@zenflow.com'),
   'Private Yoga Session',
   'One-on-one instruction tailored to your specific goals and fitness level.',
   60, 'Studio Hall C', 'published', 'flexible',
   1, FALSE, TRUE, 1500.00, 'manual', 'manual', replace(gen_random_uuid()::text,'-','')),

  ((SELECT id FROM users WHERE email='meera@zenflow.com'),
   'Kids Yoga',
   'Fun, playful yoga designed for children aged 5-12. Improves focus and flexibility.',
   45, 'Studio Hall A', 'published', 'weekly',
   12, TRUE, TRUE, 250.00, 'automatic', 'auto', replace(gen_random_uuid()::text,'-','')),

  -- Rohan's classes
  ((SELECT id FROM users WHERE email='rohan@zenflow.com'),
   'Vinyasa Flow',
   'Dynamic flow sequences linking breath with movement. Energizing and fun for all levels.',
   60, 'Studio Hall B', 'published', 'weekly',
   8, TRUE, TRUE, 600.00, 'automatic', 'auto', replace(gen_random_uuid()::text,'-','')),

  ((SELECT id FROM users WHERE email='rohan@zenflow.com'),
   'Ashtanga Intensive Workshop',
   'Deep dive into the traditional Ashtanga primary series with expert guidance.',
   90, 'Open Terrace', 'published', 'flexible',
   20, TRUE, TRUE, 1200.00, 'automatic', 'auto', replace(gen_random_uuid()::text,'-','')),

  ((SELECT id FROM users WHERE email='rohan@zenflow.com'),
   'Power Yoga Bootcamp',
   'High-intensity power yoga to build strength, stamina and mental toughness.',
   75, 'Studio Hall A', 'published', 'weekly',
   10, TRUE, TRUE, 700.00, 'automatic', 'auto', replace(gen_random_uuid()::text,'-','')),

  -- Divya's classes
  ((SELECT id FROM users WHERE email='divya@zenflow.com'),
   'Yin Yoga & Sound Healing',
   'Slow-paced Yin postures held for 3-5 minutes combined with singing bowl therapy.',
   75, 'Healing Room', 'published', 'weekly',
   8, TRUE, TRUE, 800.00, 'automatic', 'auto', replace(gen_random_uuid()::text,'-','')),

  ((SELECT id FROM users WHERE email='divya@zenflow.com'),
   'Prenatal Yoga',
   'Safe, nurturing yoga practice designed for expectant mothers at all trimesters.',
   60, 'Studio Hall C', 'published', 'weekly',
   8, TRUE, TRUE, 600.00, 'automatic', 'auto', replace(gen_random_uuid()::text,'-','')),

  ((SELECT id FROM users WHERE email='divya@zenflow.com'),
   'Corporate Wellness Session',
   'Desk yoga, breathing exercises and stress relief techniques for office teams.',
   60, 'Online / Zoom', 'published', 'flexible',
   25, TRUE, FALSE, 0.00, 'automatic', 'auto', replace(gen_random_uuid()::text,'-',''));


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RESOURCES (one instructor per appointment type)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO resources (appointment_type_id, user_id, resource_name) VALUES
  ((SELECT id FROM appointment_types WHERE name='Morning Hatha Yoga'),
   (SELECT id FROM users WHERE email='meera@zenflow.com'), 'Instructor Meera'),

  ((SELECT id FROM appointment_types WHERE name='Guided Meditation'),
   (SELECT id FROM users WHERE email='meera@zenflow.com'), 'Instructor Meera'),

  ((SELECT id FROM appointment_types WHERE name='Private Yoga Session'),
   NULL, 'Instructor Meera'),

  ((SELECT id FROM appointment_types WHERE name='Kids Yoga'),
   (SELECT id FROM users WHERE email='meera@zenflow.com'), 'Instructor Meera'),

  ((SELECT id FROM appointment_types WHERE name='Vinyasa Flow'),
   (SELECT id FROM users WHERE email='rohan@zenflow.com'), 'Instructor Rohan'),

  ((SELECT id FROM appointment_types WHERE name='Ashtanga Intensive Workshop'),
   (SELECT id FROM users WHERE email='rohan@zenflow.com'), 'Instructor Rohan'),

  ((SELECT id FROM appointment_types WHERE name='Power Yoga Bootcamp'),
   (SELECT id FROM users WHERE email='rohan@zenflow.com'), 'Instructor Rohan'),

  ((SELECT id FROM appointment_types WHERE name='Yin Yoga & Sound Healing'),
   (SELECT id FROM users WHERE email='divya@zenflow.com'), 'Instructor Divya'),

  ((SELECT id FROM appointment_types WHERE name='Prenatal Yoga'),
   (SELECT id FROM users WHERE email='divya@zenflow.com'), 'Instructor Divya'),

  ((SELECT id FROM appointment_types WHERE name='Corporate Wellness Session'),
   (SELECT id FROM users WHERE email='divya@zenflow.com'), 'Instructor Divya');


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. WORKING HOURS — 4 to 5 time slots per instructor per weekly session
-- ─────────────────────────────────────────────────────────────────────────────

-- Morning Hatha Yoga — Mon/Wed/Fri — 5 slots across the day
INSERT INTO working_hours (resource_id, day_of_week, start_time, end_time, is_available)
SELECT r.id, t.dow, t.st, t.en, TRUE
FROM resources r
JOIN appointment_types at ON at.id = r.appointment_type_id
CROSS JOIN (VALUES
  (1, TIME '06:00', TIME '07:00'),
  (1, TIME '07:00', TIME '08:00'),
  (1, TIME '08:00', TIME '09:00'),
  (3, TIME '06:00', TIME '07:00'),
  (3, TIME '07:00', TIME '08:00'),
  (3, TIME '08:00', TIME '09:00'),
  (5, TIME '06:00', TIME '07:00'),
  (5, TIME '07:00', TIME '08:00'),
  (5, TIME '08:00', TIME '09:00'),
  (5, TIME '09:00', TIME '10:00'),
  (5, TIME '10:00', TIME '11:00')
) AS t(dow, st, en)
WHERE at.name = 'Morning Hatha Yoga';

-- Guided Meditation — Mon/Wed/Fri — 4 slots
INSERT INTO working_hours (resource_id, day_of_week, start_time, end_time, is_available)
SELECT r.id, t.dow, t.st, t.en, TRUE
FROM resources r
JOIN appointment_types at ON at.id = r.appointment_type_id
CROSS JOIN (VALUES
  (1, TIME '09:00', TIME '09:45'),
  (1, TIME '10:00', TIME '10:45'),
  (3, TIME '09:00', TIME '09:45'),
  (3, TIME '10:00', TIME '10:45'),
  (5, TIME '09:00', TIME '09:45'),
  (5, TIME '10:00', TIME '10:45'),
  (5, TIME '11:00', TIME '11:45'),
  (5, TIME '17:00', TIME '17:45')
) AS t(dow, st, en)
WHERE at.name = 'Guided Meditation';

-- Kids Yoga — Sat/Sun — 5 slots
INSERT INTO working_hours (resource_id, day_of_week, start_time, end_time, is_available)
SELECT r.id, t.dow, t.st, t.en, TRUE
FROM resources r
JOIN appointment_types at ON at.id = r.appointment_type_id
CROSS JOIN (VALUES
  (6, TIME '09:00', TIME '09:45'),
  (6, TIME '10:00', TIME '10:45'),
  (6, TIME '11:00', TIME '11:45'),
  (0, TIME '09:00', TIME '09:45'),
  (0, TIME '10:00', TIME '10:45')
) AS t(dow, st, en)
WHERE at.name = 'Kids Yoga';

-- Vinyasa Flow — Tue/Thu/Sat — 4 slots per day
INSERT INTO working_hours (resource_id, day_of_week, start_time, end_time, is_available)
SELECT r.id, t.dow, t.st, t.en, TRUE
FROM resources r
JOIN appointment_types at ON at.id = r.appointment_type_id
CROSS JOIN (VALUES
  (2, TIME '06:30', TIME '07:30'),
  (2, TIME '07:30', TIME '08:30'),
  (2, TIME '08:30', TIME '09:30'),
  (2, TIME '18:00', TIME '19:00'),
  (4, TIME '06:30', TIME '07:30'),
  (4, TIME '07:30', TIME '08:30'),
  (4, TIME '18:00', TIME '19:00'),
  (4, TIME '19:00', TIME '20:00'),
  (6, TIME '07:00', TIME '08:00'),
  (6, TIME '08:00', TIME '09:00'),
  (6, TIME '09:00', TIME '10:00'),
  (6, TIME '10:00', TIME '11:00')
) AS t(dow, st, en)
WHERE at.name = 'Vinyasa Flow';

-- Power Yoga Bootcamp — Mon/Wed/Fri — 4 slots (morning & evening)
INSERT INTO working_hours (resource_id, day_of_week, start_time, end_time, is_available)
SELECT r.id, t.dow, t.st, t.en, TRUE
FROM resources r
JOIN appointment_types at ON at.id = r.appointment_type_id
CROSS JOIN (VALUES
  (1, TIME '05:30', TIME '06:45'),
  (1, TIME '06:45', TIME '08:00'),
  (1, TIME '17:30', TIME '18:45'),
  (1, TIME '18:45', TIME '20:00'),
  (3, TIME '05:30', TIME '06:45'),
  (3, TIME '06:45', TIME '08:00'),
  (3, TIME '17:30', TIME '18:45'),
  (3, TIME '18:45', TIME '20:00'),
  (5, TIME '05:30', TIME '06:45'),
  (5, TIME '06:45', TIME '08:00'),
  (5, TIME '17:30', TIME '18:45'),
  (5, TIME '18:45', TIME '20:00')
) AS t(dow, st, en)
WHERE at.name = 'Power Yoga Bootcamp';

-- Yin Yoga & Sound Healing — Tue/Thu/Sat — 4 slots
INSERT INTO working_hours (resource_id, day_of_week, start_time, end_time, is_available)
SELECT r.id, t.dow, t.st, t.en, TRUE
FROM resources r
JOIN appointment_types at ON at.id = r.appointment_type_id
CROSS JOIN (VALUES
  (2, TIME '10:00', TIME '11:15'),
  (2, TIME '16:00', TIME '17:15'),
  (4, TIME '10:00', TIME '11:15'),
  (4, TIME '16:00', TIME '17:15'),
  (6, TIME '09:00', TIME '10:15'),
  (6, TIME '10:30', TIME '11:45'),
  (6, TIME '15:00', TIME '16:15'),
  (6, TIME '16:30', TIME '17:45')
) AS t(dow, st, en)
WHERE at.name = 'Yin Yoga & Sound Healing';

-- Prenatal Yoga — Mon/Wed/Sat — 4 slots
INSERT INTO working_hours (resource_id, day_of_week, start_time, end_time, is_available)
SELECT r.id, t.dow, t.st, t.en, TRUE
FROM resources r
JOIN appointment_types at ON at.id = r.appointment_type_id
CROSS JOIN (VALUES
  (1, TIME '10:00', TIME '11:00'),
  (1, TIME '11:30', TIME '12:30'),
  (3, TIME '10:00', TIME '11:00'),
  (3, TIME '11:30', TIME '12:30'),
  (6, TIME '09:00', TIME '10:00'),
  (6, TIME '10:30', TIME '11:30'),
  (6, TIME '11:30', TIME '12:30'),
  (6, TIME '12:30', TIME '13:30')
) AS t(dow, st, en)
WHERE at.name = 'Prenatal Yoga';


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. FLEXIBLE SLOTS — for Private Session, Ashtanga Workshop, Corporate Wellness
-- ─────────────────────────────────────────────────────────────────────────────

-- Private Yoga Session — multiple slots spread over next 14 days (5 slots)
INSERT INTO flexible_slots (resource_id, slot_date, start_time, end_time, is_available)
SELECT r.id, CURRENT_DATE + v.n, v.st, v.en, TRUE
FROM resources r
JOIN appointment_types at ON at.id = r.appointment_type_id
CROSS JOIN (VALUES
  (1,  TIME '07:00', TIME '08:00'),
  (2,  TIME '09:00', TIME '10:00'),
  (4,  TIME '07:00', TIME '08:00'),
  (6,  TIME '11:00', TIME '12:00'),
  (8,  TIME '07:00', TIME '08:00'),
  (10, TIME '09:00', TIME '10:00'),
  (12, TIME '07:00', TIME '08:00'),
  (14, TIME '11:00', TIME '12:00')
) AS v(n, st, en)
WHERE at.name = 'Private Yoga Session';

-- Ashtanga Intensive Workshop — 5 batch dates (weekends, 4 slots each)
INSERT INTO flexible_slots (resource_id, slot_date, start_time, end_time, is_available)
SELECT r.id, CURRENT_DATE + v.n, v.st, v.en, TRUE
FROM resources r
JOIN appointment_types at ON at.id = r.appointment_type_id
CROSS JOIN (VALUES
  (7,  TIME '05:30', TIME '07:00'),
  (7,  TIME '07:00', TIME '08:30'),
  (14, TIME '05:30', TIME '07:00'),
  (14, TIME '07:00', TIME '08:30'),
  (21, TIME '05:30', TIME '07:00'),
  (21, TIME '07:00', TIME '08:30'),
  (28, TIME '05:30', TIME '07:00'),
  (28, TIME '07:00', TIME '08:30')
) AS v(n, st, en)
WHERE at.name = 'Ashtanga Intensive Workshop';

-- Corporate Wellness Session — 5 weekday slots
INSERT INTO flexible_slots (resource_id, slot_date, start_time, end_time, is_available)
SELECT r.id, CURRENT_DATE + v.n, v.st, v.en, TRUE
FROM resources r
JOIN appointment_types at ON at.id = r.appointment_type_id
CROSS JOIN (VALUES
  (1,  TIME '12:00', TIME '13:00'),
  (3,  TIME '12:00', TIME '13:00'),
  (5,  TIME '12:00', TIME '13:00'),
  (8,  TIME '13:00', TIME '14:00'),
  (10, TIME '13:00', TIME '14:00'),
  (12, TIME '12:00', TIME '13:00'),
  (15, TIME '12:00', TIME '13:00'),
  (17, TIME '13:00', TIME '14:00')
) AS v(n, st, en)
WHERE at.name = 'Corporate Wellness Session';


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. APPOINTMENT QUESTIONS
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO appointment_questions (appointment_type_id, question_text, is_required, display_order) VALUES
  -- Morning Hatha Yoga
  ((SELECT id FROM appointment_types WHERE name='Morning Hatha Yoga'), 'What is your yoga experience level? (Beginner/Intermediate/Advanced)', TRUE,  1),
  ((SELECT id FROM appointment_types WHERE name='Morning Hatha Yoga'), 'Do you have any injuries or medical conditions we should know about?',   TRUE,  2),
  ((SELECT id FROM appointment_types WHERE name='Morning Hatha Yoga'), 'Preferred mat type: foam / cork / travel?',                              FALSE, 3),

  -- Private Yoga Session
  ((SELECT id FROM appointment_types WHERE name='Private Yoga Session'), 'What are your specific yoga goals for this session?',     TRUE,  1),
  ((SELECT id FROM appointment_types WHERE name='Private Yoga Session'), 'Any health conditions or physical limitations?',           TRUE,  2),
  ((SELECT id FROM appointment_types WHERE name='Private Yoga Session'), 'Have you had private sessions before? If yes, how many?', FALSE, 3),

  -- Ashtanga Intensive Workshop
  ((SELECT id FROM appointment_types WHERE name='Ashtanga Intensive Workshop'), 'Have you practiced Ashtanga Yoga before?',          TRUE,  1),
  ((SELECT id FROM appointment_types WHERE name='Ashtanga Intensive Workshop'), 'Rate your current fitness level (1=low, 5=high):',  TRUE,  2),
  ((SELECT id FROM appointment_types WHERE name='Ashtanga Intensive Workshop'), 'Any dietary restrictions for the refreshment break?', FALSE, 3),

  -- Power Yoga Bootcamp
  ((SELECT id FROM appointment_types WHERE name='Power Yoga Bootcamp'), 'Have you done power/hot yoga before?',            TRUE,  1),
  ((SELECT id FROM appointment_types WHERE name='Power Yoga Bootcamp'), 'Do you have any cardiovascular conditions?',      TRUE,  2),

  -- Prenatal Yoga
  ((SELECT id FROM appointment_types WHERE name='Prenatal Yoga'), 'How many weeks pregnant are you?',                     TRUE,  1),
  ((SELECT id FROM appointment_types WHERE name='Prenatal Yoga'), 'Has your doctor approved exercise during pregnancy?',   TRUE,  2),
  ((SELECT id FROM appointment_types WHERE name='Prenatal Yoga'), 'Is this your first pregnancy?',                        FALSE, 3),

  -- Yin Yoga & Sound Healing
  ((SELECT id FROM appointment_types WHERE name='Yin Yoga & Sound Healing'), 'Do you have any sound sensitivities?',       FALSE, 1),
  ((SELECT id FROM appointment_types WHERE name='Yin Yoga & Sound Healing'), 'Any joint issues we should be aware of?',   TRUE,  2);


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. SAMPLE BOOKINGS
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO bookings (
  appointment_type_id, resource_id, customer_id,
  booking_date, start_time, end_time,
  status, capacity_booked, payment_status, payment_amount
) VALUES
  -- Ananya: confirmed upcoming Hatha Yoga
  ((SELECT id FROM appointment_types WHERE name='Morning Hatha Yoga'),
   (SELECT id FROM resources WHERE resource_name='Instructor Meera'
     AND appointment_type_id=(SELECT id FROM appointment_types WHERE name='Morning Hatha Yoga')),
   (SELECT id FROM users WHERE email='ananya@gmail.com'),
   CURRENT_DATE + 3, TIME '07:00', TIME '08:00', 'confirmed', 1, 'paid', 500.00),

  -- Vikram: confirmed upcoming Vinyasa Flow
  ((SELECT id FROM appointment_types WHERE name='Vinyasa Flow'),
   (SELECT id FROM resources WHERE resource_name='Instructor Rohan'
     AND appointment_type_id=(SELECT id FROM appointment_types WHERE name='Vinyasa Flow')),
   (SELECT id FROM users WHERE email='vikram@gmail.com'),
   CURRENT_DATE + 5, TIME '08:30', TIME '09:30', 'confirmed', 1, 'paid', 600.00),

  -- Priya: pending Private Yoga Session
  ((SELECT id FROM appointment_types WHERE name='Private Yoga Session'),
   (SELECT id FROM resources WHERE resource_name='Instructor Meera'
     AND appointment_type_id=(SELECT id FROM appointment_types WHERE name='Private Yoga Session')),
   (SELECT id FROM users WHERE email='priya@gmail.com'),
   CURRENT_DATE + 1, TIME '07:00', TIME '08:00', 'pending', 1, 'pending', 1500.00),

  -- Ananya: confirmed upcoming Guided Meditation
  ((SELECT id FROM appointment_types WHERE name='Guided Meditation'),
   (SELECT id FROM resources WHERE resource_name='Instructor Meera'
     AND appointment_type_id=(SELECT id FROM appointment_types WHERE name='Guided Meditation')),
   (SELECT id FROM users WHERE email='ananya@gmail.com'),
   CURRENT_DATE + 2, TIME '09:00', TIME '09:45', 'confirmed', 1, 'not_required', 0.00),

  -- Vikram: completed past Hatha Yoga
  ((SELECT id FROM appointment_types WHERE name='Morning Hatha Yoga'),
   (SELECT id FROM resources WHERE resource_name='Instructor Meera'
     AND appointment_type_id=(SELECT id FROM appointment_types WHERE name='Morning Hatha Yoga')),
   (SELECT id FROM users WHERE email='vikram@gmail.com'),
   CURRENT_DATE - 10, TIME '07:00', TIME '08:00', 'completed', 1, 'paid', 500.00),

  -- Arjun: confirmed Power Yoga Bootcamp
  ((SELECT id FROM appointment_types WHERE name='Power Yoga Bootcamp'),
   (SELECT id FROM resources WHERE resource_name='Instructor Rohan'
     AND appointment_type_id=(SELECT id FROM appointment_types WHERE name='Power Yoga Bootcamp')),
   (SELECT id FROM users WHERE email='arjun@gmail.com'),
   CURRENT_DATE + 4, TIME '06:45', TIME '08:00', 'confirmed', 1, 'paid', 700.00),

  -- Neha: confirmed Yin Yoga & Sound Healing
  ((SELECT id FROM appointment_types WHERE name='Yin Yoga & Sound Healing'),
   (SELECT id FROM resources WHERE resource_name='Instructor Divya'
     AND appointment_type_id=(SELECT id FROM appointment_types WHERE name='Yin Yoga & Sound Healing')),
   (SELECT id FROM users WHERE email='neha@gmail.com'),
   CURRENT_DATE + 6, TIME '10:00', TIME '11:15', 'confirmed', 1, 'paid', 800.00),

  -- Priya: cancelled Kids Yoga
  ((SELECT id FROM appointment_types WHERE name='Kids Yoga'),
   (SELECT id FROM resources WHERE resource_name='Instructor Meera'
     AND appointment_type_id=(SELECT id FROM appointment_types WHERE name='Kids Yoga')),
   (SELECT id FROM users WHERE email='priya@gmail.com'),
   CURRENT_DATE - 5, TIME '10:00', TIME '10:45', 'cancelled', 1, 'paid', 250.00),

  -- Neha: upcoming Ashtanga Workshop
  ((SELECT id FROM appointment_types WHERE name='Ashtanga Intensive Workshop'),
   (SELECT id FROM resources WHERE resource_name='Instructor Rohan'
     AND appointment_type_id=(SELECT id FROM appointment_types WHERE name='Ashtanga Intensive Workshop')),
   (SELECT id FROM users WHERE email='neha@gmail.com'),
   CURRENT_DATE + 7, TIME '05:30', TIME '07:00', 'confirmed', 2, 'paid', 2400.00),

  -- Arjun: upcoming Prenatal Yoga (for spouse)
  ((SELECT id FROM appointment_types WHERE name='Prenatal Yoga'),
   (SELECT id FROM resources WHERE resource_name='Instructor Divya'
     AND appointment_type_id=(SELECT id FROM appointment_types WHERE name='Prenatal Yoga')),
   (SELECT id FROM users WHERE email='arjun@gmail.com'),
   CURRENT_DATE + 8, TIME '10:00', TIME '11:00', 'confirmed', 1, 'paid', 600.00);
