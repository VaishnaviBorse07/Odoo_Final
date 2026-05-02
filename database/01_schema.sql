-- ZenFlow: core schema — enums, tables, indexes for the booking system.
-- Safe to re-run: skips existing enums/tables/indexes (Supabase / local dev).
-- Run order: 01_schema → 02_seed (once) → 03_views

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('customer', 'organiser', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE user_status AS ENUM ('active', 'inactive', 'pending_verification');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE otp_type_enum AS ENUM ('email_verify', 'forgot_password');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE appointment_status AS ENUM ('draft', 'published', 'unpublished');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE slot_type AS ENUM ('weekly', 'flexible');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE confirmation_type AS ENUM ('automatic', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE assignment_type AS ENUM ('auto', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'rescheduled', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'customer',
  status user_status NOT NULL DEFAULT 'pending_verification',
  profile_picture TEXT,
  phone VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otp_verifications (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(150) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  otp_type otp_type_enum NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointment_types (
  id SERIAL PRIMARY KEY,
  organiser_id INT REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  duration_minutes INT NOT NULL,
  location VARCHAR(200),
  status appointment_status NOT NULL DEFAULT 'draft',
  slot_type slot_type NOT NULL DEFAULT 'weekly',
  max_capacity INT DEFAULT 1,
  manage_capacity BOOLEAN DEFAULT FALSE,
  advance_payment BOOLEAN DEFAULT FALSE,
  payment_amount DECIMAL(10,2) DEFAULT 0.00,
  confirmation_type confirmation_type DEFAULT 'automatic',
  assignment_type assignment_type DEFAULT 'auto',
  share_token VARCHAR(64) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resources (
  id SERIAL PRIMARY KEY,
  appointment_type_id INT REFERENCES appointment_types(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  resource_name VARCHAR(150) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS working_hours (
  id SERIAL PRIMARY KEY,
  resource_id INT REFERENCES resources(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS flexible_slots (
  id SERIAL PRIMARY KEY,
  resource_id INT REFERENCES resources(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS appointment_questions (
  id SERIAL PRIMARY KEY,
  appointment_type_id INT REFERENCES appointment_types(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  is_required BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  appointment_type_id INT REFERENCES appointment_types(id),
  resource_id INT REFERENCES resources(id) ON DELETE SET NULL,
  customer_id INT REFERENCES users(id),
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  capacity_booked INT DEFAULT 1,
  payment_status VARCHAR(20) DEFAULT 'not_required',
  payment_amount DECIMAL(10,2) DEFAULT 0.00,
  cancellation_reason TEXT,
  confirmation_token UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_answers (
  id SERIAL PRIMARY KEY,
  booking_id INT REFERENCES bookings(id) ON DELETE CASCADE,
  question_id INT REFERENCES appointment_questions(id),
  answer_text TEXT
);

CREATE TABLE IF NOT EXISTS reschedule_history (
  id SERIAL PRIMARY KEY,
  booking_id INT REFERENCES bookings(id) ON DELETE CASCADE,
  old_date DATE,
  old_start_time TIME,
  new_date DATE,
  new_start_time TIME,
  rescheduled_by INT REFERENCES users(id),
  rescheduled_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_otp_email_type ON otp_verifications(email, otp_type);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_apt_organiser ON appointment_types(organiser_id);
CREATE INDEX IF NOT EXISTS idx_apt_status ON appointment_types(status);
CREATE INDEX IF NOT EXISTS idx_apt_token ON appointment_types(share_token);
CREATE INDEX IF NOT EXISTS idx_resource_apt ON resources(appointment_type_id);
CREATE INDEX IF NOT EXISTS idx_wh_resource_day ON working_hours(resource_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_booking_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_booking_apt ON bookings(appointment_type_id);
CREATE INDEX IF NOT EXISTS idx_booking_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_booking_resource_date ON bookings(resource_id, booking_date, start_time);
CREATE INDEX IF NOT EXISTS idx_booking_status ON bookings(status);
