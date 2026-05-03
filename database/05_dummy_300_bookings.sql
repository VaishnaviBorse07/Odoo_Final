-- ZenFlow: 300 dummy bookings seed — all statuses, all appointment types.
-- Run AFTER 02_seed_data.sql (depends on existing users, resources, appointments).
-- Password for all new users: ZenFlow@2025

-- ─────────────────────────────────────────────────────────────────────────────
-- EXTRA CUSTOMERS (20 more for variety)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO users (full_name, email, password_hash, role, status, phone) VALUES
  ('Kavya Reddy',      'kavya@gmail.com',     '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer', 'active', '9876543210'),
  ('Rahul Bose',       'rahul@gmail.com',     '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer', 'active', '9876543211'),
  ('Sneha Joshi',      'sneha@gmail.com',     '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer', 'active', '9876543212'),
  ('Aarav Kapoor',     'aarav@gmail.com',     '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer', 'active', '9876543213'),
  ('Pooja Pillai',     'pooja@gmail.com',     '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer', 'active', '9876543214'),
  ('Kiran Rao',        'kiran@gmail.com',     '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer', 'active', '9876543215'),
  ('Meghna Shetty',    'meghna@gmail.com',    '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer', 'active', '9876543216'),
  ('Tarun Malhotra',   'tarun@gmail.com',     '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer', 'active', '9876543217'),
  ('Ishita Desai',     'ishita@gmail.com',    '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer', 'active', '9876543218'),
  ('Manav Tiwari',     'manav@gmail.com',     '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer', 'active', '9876543219'),
  ('Riya Agarwal',     'riya@gmail.com',      '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer', 'active', '9876543220'),
  ('Dev Chatterjee',   'dev@gmail.com',       '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer', 'active', '9876543221'),
  ('Simran Oberoi',    'simran@gmail.com',    '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer', 'active', '9876543222'),
  ('Harsh Pandey',     'harsh@gmail.com',     '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer', 'active', '9876543223'),
  ('Disha Kulkarni',   'disha@gmail.com',     '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer', 'active', '9876543224'),
  ('Neel Saxena',      'neel@gmail.com',      '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer', 'active', '9876543225'),
  ('Aisha Qureshi',    'aisha@gmail.com',     '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer', 'active', '9876543226'),
  ('Yash Bhatt',       'yash@gmail.com',      '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer', 'active', '9876543227'),
  ('Lakshmi Iyer',     'lakshmi@gmail.com',   '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer', 'active', '9876543228'),
  ('Parth Shah',       'parth@gmail.com',     '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 'customer', 'active', '9876543229')
ON CONFLICT (email) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- BULK BOOKINGS via generate_series
-- Uses a DO block to create 300 bookings distributed across:
--   statuses: confirmed(40%), pending(20%), completed(25%), cancelled(10%), rescheduled(5%)
--   all 10 appointment types, all 30 customers, past & future dates
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_apt_ids       INT[];
  v_res_ids       INT[];
  v_cust_ids      INT[];
  v_question_ids  INT[];
  v_apt_id        INT;
  v_res_id        INT;
  v_cust_id       INT;
  v_booking_id    INT;
  v_question_id   INT;
  v_status        booking_status;
  v_pay_status    TEXT;
  v_pay_amount    NUMERIC;
  v_adv_pay       BOOLEAN;
  v_pay_amt_apt   NUMERIC;
  v_manage_cap    BOOLEAN;
  v_max_cap       INT;
  v_capacity      INT;
  v_offset_days   INT;
  v_booking_date  DATE;
  v_start_time    TIME;
  v_end_time      INT;  -- minutes
  v_dur_min       INT;
  v_created_at    TIMESTAMPTZ;
  v_old_date      DATE;
  i               INT;
  v_status_roll   INT;
  v_time_roll     INT;
  v_answers       TEXT[];
  v_ans_text      TEXT;
  v_reason        TEXT;
BEGIN
  -- Collect IDs
  SELECT ARRAY(SELECT id FROM appointment_types ORDER BY id) INTO v_apt_ids;
  SELECT ARRAY(SELECT id FROM resources ORDER BY id)         INTO v_res_ids;
  SELECT ARRAY(SELECT id FROM users WHERE role='customer' ORDER BY id) INTO v_cust_ids;

  FOR i IN 1..300 LOOP
    -- Pick appointment type cycling through all
    v_apt_id := v_apt_ids[((i-1) % array_length(v_apt_ids,1)) + 1];

    -- Get matching resource
    SELECT id INTO v_res_id FROM resources
    WHERE appointment_type_id = v_apt_id LIMIT 1;

    -- Pick customer (round-robin + some offset for variety)
    v_cust_id := v_cust_ids[((i + 3) % array_length(v_cust_ids,1)) + 1];

    -- Get appointment details
    SELECT advance_payment, payment_amount, manage_capacity, COALESCE(max_capacity,1), duration_minutes
    INTO v_adv_pay, v_pay_amt_apt, v_manage_cap, v_max_cap, v_dur_min
    FROM appointment_types WHERE id = v_apt_id;

    -- Status distribution: 1-40=confirmed, 41-60=pending, 61-85=completed, 86-95=cancelled, 96-100=rescheduled
    v_status_roll := ((i * 37 + 13) % 100) + 1;
    IF    v_status_roll <= 40 THEN v_status := 'confirmed';
    ELSIF v_status_roll <= 60 THEN v_status := 'pending';
    ELSIF v_status_roll <= 85 THEN v_status := 'completed';
    ELSIF v_status_roll <= 95 THEN v_status := 'cancelled';
    ELSE                            v_status := 'rescheduled';
    END IF;

    -- Date logic: completed/cancelled → past; confirmed/pending/rescheduled → future or recent
    IF v_status IN ('completed', 'cancelled') THEN
      v_offset_days := -((i % 90) + 1);       -- 1 to 90 days ago
    ELSIF v_status = 'confirmed' THEN
      v_offset_days := (i % 60) + 1;           -- 1 to 60 days ahead
    ELSIF v_status = 'pending' THEN
      v_offset_days := (i % 30) + 1;           -- 1 to 30 days ahead
    ELSE -- rescheduled
      v_offset_days := (i % 45) + 2;
    END IF;
    v_booking_date := CURRENT_DATE + v_offset_days;

    -- Time slots cycling through common slot times
    v_time_roll := (i % 8);
    CASE v_time_roll
      WHEN 0 THEN v_start_time := TIME '06:00'; v_end_time := 60;
      WHEN 1 THEN v_start_time := TIME '07:00'; v_end_time := 60;
      WHEN 2 THEN v_start_time := TIME '08:30'; v_end_time := 60;
      WHEN 3 THEN v_start_time := TIME '09:00'; v_end_time := 45;
      WHEN 4 THEN v_start_time := TIME '10:00'; v_end_time := 75;
      WHEN 5 THEN v_start_time := TIME '16:00'; v_end_time := 75;
      WHEN 6 THEN v_start_time := TIME '17:30'; v_end_time := 75;
      ELSE        v_start_time := TIME '18:00'; v_end_time := 60;
    END CASE;

    -- Capacity
    IF v_manage_cap AND v_max_cap > 1 THEN
      v_capacity := (i % LEAST(v_max_cap, 3)) + 1;
    ELSE
      v_capacity := 1;
    END IF;

    -- Payment
    IF v_adv_pay THEN
      v_pay_amount := v_pay_amt_apt * v_capacity;
      IF v_status IN ('confirmed', 'completed', 'rescheduled') THEN
        v_pay_status := 'paid';
      ELSIF v_status = 'cancelled' AND (i % 3 = 0) THEN
        v_pay_status := 'paid';   -- paid then cancelled
      ELSIF v_status = 'pending' THEN
        v_pay_status := 'pending';
      ELSE
        v_pay_status := 'pending';
      END IF;
    ELSE
      v_pay_status := 'not_required';
      v_pay_amount := 0;
    END IF;

    -- Cancellation reason
    v_reason := NULL;
    IF v_status = 'cancelled' THEN
      CASE (i % 5)
        WHEN 0 THEN v_reason := 'Schedule conflict — unable to attend.';
        WHEN 1 THEN v_reason := 'Feeling unwell, need to cancel.';
        WHEN 2 THEN v_reason := 'Family emergency.';
        WHEN 3 THEN v_reason := 'Work commitment came up.';
        ELSE        v_reason := 'Rescheduling to a later date.';
      END CASE;
    END IF;

    -- Spread created_at timestamps
    v_created_at := NOW() - ((150 - i) || ' days')::INTERVAL + (i || ' hours')::INTERVAL;

    -- INSERT booking
    INSERT INTO bookings (
      appointment_type_id, resource_id, customer_id,
      booking_date, start_time, end_time,
      status, capacity_booked, payment_status, payment_amount,
      cancellation_reason, created_at, updated_at
    ) VALUES (
      v_apt_id, v_res_id, v_cust_id,
      v_booking_date,
      v_start_time,
      v_start_time + (v_end_time || ' minutes')::INTERVAL,
      v_status, v_capacity, v_pay_status, v_pay_amount,
      v_reason, v_created_at, v_created_at
    ) RETURNING id INTO v_booking_id;

    -- ── BOOKING ANSWERS for appointments that have questions ──────────────────
    FOR v_question_id IN
      SELECT id FROM appointment_questions
      WHERE appointment_type_id = v_apt_id
      ORDER BY display_order
    LOOP
      -- Generate a realistic answer based on question pattern
      SELECT question_text INTO v_ans_text
      FROM appointment_questions WHERE id = v_question_id;

      IF v_ans_text ILIKE '%experience level%' THEN
        v_ans_text := CASE (i%3) WHEN 0 THEN 'Beginner' WHEN 1 THEN 'Intermediate' ELSE 'Advanced' END;
      ELSIF v_ans_text ILIKE '%injury%' OR v_ans_text ILIKE '%medical%' OR v_ans_text ILIKE '%condition%' THEN
        v_ans_text := CASE (i%4) WHEN 0 THEN 'No injuries.' WHEN 1 THEN 'Mild lower back pain.' WHEN 2 THEN 'None.' ELSE 'Old knee injury, taking it slow.' END;
      ELSIF v_ans_text ILIKE '%mat type%' THEN
        v_ans_text := CASE (i%3) WHEN 0 THEN 'Cork' WHEN 1 THEN 'Foam' ELSE 'Travel mat' END;
      ELSIF v_ans_text ILIKE '%goals%' THEN
        v_ans_text := CASE (i%3) WHEN 0 THEN 'Improve flexibility and reduce stress.' WHEN 1 THEN 'Build core strength.' ELSE 'Deepen my meditation practice.' END;
      ELSIF v_ans_text ILIKE '%limitations%' OR v_ans_text ILIKE '%health%' THEN
        v_ans_text := CASE (i%3) WHEN 0 THEN 'No limitations.' WHEN 1 THEN 'High blood pressure, controlled.' ELSE 'None.' END;
      ELSIF v_ans_text ILIKE '%private session%' THEN
        v_ans_text := CASE (i%3) WHEN 0 THEN 'Yes, about 5 sessions.' WHEN 1 THEN 'No, first time.' ELSE 'Yes, 2 sessions.' END;
      ELSIF v_ans_text ILIKE '%ashtanga%' OR v_ans_text ILIKE '%practiced%' THEN
        v_ans_text := CASE (i%2) WHEN 0 THEN 'Yes, for 6 months.' ELSE 'No, first time.' END;
      ELSIF v_ans_text ILIKE '%fitness level%' THEN
        v_ans_text := CASE (i%5) WHEN 0 THEN '3' WHEN 1 THEN '4' WHEN 2 THEN '2' WHEN 3 THEN '5' ELSE '3' END;
      ELSIF v_ans_text ILIKE '%dietary%' THEN
        v_ans_text := CASE (i%3) WHEN 0 THEN 'Vegetarian.' WHEN 1 THEN 'No restrictions.' ELSE 'Vegan.' END;
      ELSIF v_ans_text ILIKE '%power%' OR v_ans_text ILIKE '%hot yoga%' THEN
        v_ans_text := CASE (i%2) WHEN 0 THEN 'Yes, regularly.' ELSE 'No, first time.' END;
      ELSIF v_ans_text ILIKE '%cardiovascular%' THEN
        v_ans_text := CASE (i%3) WHEN 0 THEN 'None.' WHEN 1 THEN 'No conditions.' ELSE 'Mild hypertension, medicated.' END;
      ELSIF v_ans_text ILIKE '%pregnant%' OR v_ans_text ILIKE '%weeks%' THEN
        v_ans_text := CASE (i%4) WHEN 0 THEN '12 weeks' WHEN 1 THEN '20 weeks' WHEN 2 THEN '28 weeks' ELSE '16 weeks' END;
      ELSIF v_ans_text ILIKE '%doctor%' OR v_ans_text ILIKE '%approved%' THEN
        v_ans_text := CASE (i%2) WHEN 0 THEN 'Yes, doctor has cleared me for exercise.' ELSE 'Yes, fully approved.' END;
      ELSIF v_ans_text ILIKE '%first pregnancy%' THEN
        v_ans_text := CASE (i%2) WHEN 0 THEN 'Yes' ELSE 'No, second pregnancy.' END;
      ELSIF v_ans_text ILIKE '%sound sensitiv%' THEN
        v_ans_text := CASE (i%3) WHEN 0 THEN 'None.' WHEN 1 THEN 'Mild sensitivity to high pitch.' ELSE 'No.' END;
      ELSIF v_ans_text ILIKE '%joint%' THEN
        v_ans_text := CASE (i%3) WHEN 0 THEN 'No joint issues.' WHEN 1 THEN 'Mild knee discomfort.' ELSE 'None.' END;
      ELSE
        v_ans_text := 'No specific concerns.';
      END IF;

      INSERT INTO booking_answers (booking_id, question_id, answer_text)
      VALUES (v_booking_id, v_question_id, v_ans_text);
    END LOOP;

    -- ── RESCHEDULE HISTORY for rescheduled bookings ───────────────────────────
    IF v_status = 'rescheduled' THEN
      v_old_date := v_booking_date - ((i % 7) + 1);
      INSERT INTO reschedule_history (
        booking_id, old_date, old_start_time,
        new_date, new_start_time, rescheduled_by, rescheduled_at
      ) VALUES (
        v_booking_id,
        v_old_date,
        v_start_time - '30 minutes'::INTERVAL,
        v_booking_date,
        v_start_time,
        v_cust_id,
        v_created_at + '2 days'::INTERVAL
      );
    END IF;

  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- QUICK VERIFICATION
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  status::text,
  COUNT(*)          AS total,
  COUNT(*) FILTER (WHERE payment_status = 'paid')         AS paid,
  COUNT(*) FILTER (WHERE payment_status = 'pending')      AS pay_pending,
  COUNT(*) FILTER (WHERE payment_status = 'not_required') AS free
FROM bookings
GROUP BY status
ORDER BY status;
