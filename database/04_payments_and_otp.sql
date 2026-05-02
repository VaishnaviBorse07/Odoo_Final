-- ZenFlow: Razorpay payment audit rows + OTP hardening (hashed codes, attempt counter).
-- Run after 01_schema.sql. Safe to re-run.

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  order_id VARCHAR(64) NOT NULL,
  payment_id VARCHAR(64),
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status VARCHAR(24) NOT NULL DEFAULT 'CREATED',
  customer_id INT REFERENCES users(id) ON DELETE SET NULL,
  raw_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_order_id ON payments(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_payment_id ON payments(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

ALTER TABLE otp_verifications ADD COLUMN IF NOT EXISTS otp_hash TEXT;
ALTER TABLE otp_verifications ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0;
ALTER TABLE otp_verifications ALTER COLUMN otp_code DROP NOT NULL;
