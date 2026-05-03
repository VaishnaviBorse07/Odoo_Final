-- ZenFlow: Add 170 dummy users to reach 200 total users.
-- Password for all new users: ZenFlow@2025
DO $$
DECLARE
  i INT;
  v_first_names TEXT[] := ARRAY['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Shaurya', 'Atharv', 'Advik', 'Pranav', 'Rishabh', 'Sanya', 'Diya', 'Ananya', 'Myra', 'Kavya', 'Pari', 'Saanvi', 'Aadhya', 'Kiara', 'Prisha', 'Riya', 'Aarohi', 'Avni', 'Shruti', 'Nandini'];
  v_last_names TEXT[] := ARRAY['Sharma', 'Patel', 'Singh', 'Kumar', 'Das', 'Kaur', 'Ram', 'Reddy', 'Bose', 'Joshi', 'Kapoor', 'Rao', 'Tiwari', 'Agarwal', 'Chatterjee', 'Oberoi', 'Pandey', 'Kulkarni', 'Saxena', 'Qureshi'];
  v_full_name TEXT;
  v_email TEXT;
  v_phone TEXT;
BEGIN
  FOR i IN 1..170 LOOP
    -- Generate random name by cycling through arrays with different offsets
    v_full_name := v_first_names[1 + mod(i*7, array_length(v_first_names, 1))] || ' ' || 
                   v_last_names[1 + mod(i*13, array_length(v_last_names, 1))];
    
    -- Generate unique email and phone
    v_email := lower(replace(v_full_name, ' ', '.')) || (i + 100) || '@gmail.com';
    v_phone := '98' || lpad(i::text, 8, '0');

    INSERT INTO users (full_name, email, password_hash, role, status, phone)
    VALUES (
      v_full_name, 
      v_email, 
      '$2b$10$of0YPlFovlG8EO5S2BQshe2XYIjaHXOJc4LgsxMGv5G341vJk3McG', 
      'customer', 
      'active', 
      v_phone
    ) ON CONFLICT (email) DO NOTHING;
  END LOOP;
END $$;

-- Verify the total
SELECT COUNT(*) AS total_users FROM users;
