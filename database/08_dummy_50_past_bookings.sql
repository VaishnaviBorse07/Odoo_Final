-- ZenFlow: 50 dummy past bookings seed.
-- All of these will have 'completed' status and dates in the past.
DO $$
DECLARE
  v_apt_ids       INT[];
  v_res_ids       INT[];
  v_cust_ids      INT[];
  v_apt_id        INT;
  v_res_id        INT;
  v_cust_id       INT;
  v_booking_id    INT;
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
  i               INT;
  v_time_roll     INT;
BEGIN
  -- Collect IDs
  SELECT ARRAY(SELECT id FROM appointment_types ORDER BY id) INTO v_apt_ids;
  SELECT ARRAY(SELECT id FROM resources ORDER BY id)         INTO v_res_ids;
  SELECT ARRAY(SELECT id FROM users WHERE role='customer' ORDER BY id) INTO v_cust_ids;

  FOR i IN 1..50 LOOP
    -- Pick appointment type cycling through all
    v_apt_id := v_apt_ids[((i-1) % array_length(v_apt_ids,1)) + 1];

    -- Get matching resource
    SELECT id INTO v_res_id FROM resources
    WHERE appointment_type_id = v_apt_id LIMIT 1;

    -- Pick customer (round-robin + some offset for variety)
    v_cust_id := v_cust_ids[((i + 7) % array_length(v_cust_ids,1)) + 1];

    -- Get appointment details
    SELECT advance_payment, payment_amount, manage_capacity, COALESCE(max_capacity,1), duration_minutes
    INTO v_adv_pay, v_pay_amt_apt, v_manage_cap, v_max_cap, v_dur_min
    FROM appointment_types WHERE id = v_apt_id;

    -- Since user requested "not in the upcoming", we'll make them all completed and in the past
    v_status := 'completed';
    v_offset_days := -((i % 180) + 1); -- 1 to 180 days ago
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
      v_pay_status := 'paid';
    ELSE
      v_pay_status := 'not_required';
      v_pay_amount := 0;
    END IF;

    -- Set created_at to before the booking date
    v_created_at := NOW() - ((-v_offset_days + (i % 10) + 1) || ' days')::INTERVAL + (i || ' hours')::INTERVAL;

    -- INSERT booking
    INSERT INTO bookings (
      appointment_type_id, resource_id, customer_id,
      booking_date, start_time, end_time,
      status, capacity_booked, payment_status, payment_amount,
      created_at, updated_at
    ) VALUES (
      v_apt_id, v_res_id, v_cust_id,
      v_booking_date,
      v_start_time,
      v_start_time + (v_end_time || ' minutes')::INTERVAL,
      v_status, v_capacity, v_pay_status, v_pay_amount,
      v_created_at, v_created_at
    ) RETURNING id INTO v_booking_id;

  END LOOP;
END $$;

-- QUICK VERIFICATION
SELECT
  status::text,
  COUNT(*)          AS total,
  COUNT(*) FILTER (WHERE payment_status = 'paid')         AS paid,
  COUNT(*) FILTER (WHERE payment_status = 'pending')      AS pay_pending,
  COUNT(*) FILTER (WHERE payment_status = 'not_required') AS free
FROM bookings
GROUP BY status
ORDER BY status;
