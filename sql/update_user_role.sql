-- SQL script to update a user's role to admin
-- STEP 1: First, find your user profile by running this:
SELECT id, username, email, name, role 
FROM profiles 
ORDER BY created_at DESC;

-- STEP 2: Once you find the correct email/username, use one of these:

-- Option 1: Update by email (replace with actual email from STEP 1)
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-actual-email@example.com';

-- Option 2: Update by username (replace with actual username from STEP 1)
UPDATE profiles 
SET role = 'admin' 
WHERE username = 'your-actual-username';

-- Option 3: Update by user ID (UUID from STEP 1)
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'user-uuid-from-step-1';

-- STEP 3: Verify the update worked
SELECT id, username, email, name, role 
FROM profiles 
WHERE role = 'admin';

