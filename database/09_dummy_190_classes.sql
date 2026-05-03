-- ZenFlow: Add 190 dummy classes (appointment types) to reach 200 total.
DO $$
DECLARE
  v_org_ids INT[];
  v_org_id INT;
  v_apt_id INT;
  v_res_id INT;
  i INT;
  v_name TEXT;
  v_token TEXT;
  v_dow INT;
BEGIN
  -- Get all users who can be organisers (role = 'organiser' or 'admin')
  SELECT ARRAY(SELECT id FROM users WHERE role IN ('admin', 'organiser') ORDER BY id) INTO v_org_ids;

  FOR i IN 1..190 LOOP
    -- Cycle through organisers
    v_org_id := v_org_ids[((i-1) % array_length(v_org_ids,1)) + 1];
    
    -- Generate a unique name
    v_name := 'Yoga Class ' || (i + 10) || ' - ' || 
              (CASE (i%5) WHEN 0 THEN 'Flow' WHEN 1 THEN 'Power' WHEN 2 THEN 'Hatha' WHEN 3 THEN 'Meditation' ELSE 'Yin' END);
    
    -- Generate share token
    v_token := replace(gen_random_uuid()::text, '-', '');

    -- 1. Insert Appointment Type
    INSERT INTO appointment_types (
      organiser_id, name, description, duration_minutes, location, status,
      slot_type, max_capacity, manage_capacity, advance_payment, payment_amount,
      confirmation_type, assignment_type, share_token
    ) VALUES (
      v_org_id, 
      v_name, 
      'A wonderful session designed to improve flexibility and mindfulness. Perfect for all levels.', 
      (CASE (i%3) WHEN 0 THEN 45 WHEN 1 THEN 60 ELSE 90 END),
      'Studio Room ' || (i%10 + 1), 
      'published', 
      'weekly',
      (CASE (i%4) WHEN 0 THEN 10 WHEN 1 THEN 15 WHEN 2 THEN 20 ELSE 8 END), 
      TRUE, 
      TRUE, 
      (500.00 + (i%5)*100), 
      'automatic', 
      'auto', 
      v_token
    ) RETURNING id INTO v_apt_id;

    -- 2. Insert Resource (Instructor) for the class
    INSERT INTO resources (
      appointment_type_id, user_id, resource_name
    ) VALUES (
      v_apt_id, v_org_id, 'Instructor ' || v_org_id
    ) RETURNING id INTO v_res_id;

    -- 3. Insert some Working Hours so the class actually has bookable slots
    FOR v_dow IN 1..5 LOOP
      -- Add slots on random days (Mon-Fri)
      IF (i + v_dow) % 2 = 0 THEN
        INSERT INTO working_hours (resource_id, day_of_week, start_time, end_time, is_available)
        VALUES 
          (v_res_id, v_dow, TIME '08:00', TIME '09:00', TRUE),
          (v_res_id, v_dow, TIME '17:00', TIME '18:00', TRUE);
      END IF;
    END LOOP;

  END LOOP;
END $$;

-- Verify the total
SELECT COUNT(*) AS total_classes FROM appointment_types;
