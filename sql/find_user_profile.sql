-- SQL script to find a user profile
-- Run this to see all profiles and find the correct email/username

-- Option 1: List all profiles
SELECT id, username, email, name, role, created_at 
FROM profiles 
ORDER BY created_at DESC;

-- Option 2: Search by partial email
-- SELECT id, username, email, name, role 
-- FROM profiles 
-- WHERE email LIKE '%admin%';

-- Option 3: Search by username
-- SELECT id, username, email, name, role 
-- FROM profiles 
-- WHERE username LIKE '%admin%';

-- Option 4: Check if email exists (exact match)
-- SELECT * FROM profiles WHERE email = 'admin@admin.local';

