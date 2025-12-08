-- ============================================
-- CREATE ADMIN USER
-- ============================================
-- This creates an admin user in Supabase Auth and profiles table
-- Replace the values below with your desired admin credentials

-- Option 1: If user already exists in auth.users, just create/update profile
-- Replace 'admin@example.com' with your email
INSERT INTO profiles (id, username, email, name, role, avatar)
SELECT 
    au.id,
    'admin' as username,  -- Change to desired username
    au.email,
    'System Administrator' as name,  -- Change to desired name
    'admin' as role,
    NULL as avatar
FROM auth.users au
WHERE au.email = 'admin@example.com'  -- Replace with your email
    AND NOT EXISTS (
        SELECT 1 FROM profiles p WHERE p.id = au.id
    )
ON CONFLICT (id) DO UPDATE
SET role = 'admin', username = 'admin', name = 'System Administrator';

-- Option 2: If you need to create the auth user first (requires service role key)
-- You'll need to do this via Supabase Dashboard → Authentication → Add User
-- OR use the Supabase Admin API
-- Then run Option 1 above

-- ============================================
-- QUICK CHECK: Verify admin user exists
-- ============================================
SELECT 
    p.id,
    p.username,
    p.email,
    p.name,
    p.role,
    au.email_confirmed_at,
    CASE 
        WHEN p.role = 'admin' THEN '✅ Admin User'
        ELSE '⚠️ Not Admin'
    END as status
FROM profiles p
INNER JOIN auth.users au ON p.id = au.id
WHERE p.email = 'admin@example.com';  -- Replace with your email

-- ============================================
-- ALTERNATIVE: Update existing user to admin
-- ============================================
-- If you already have a profile, just update the role:
-- UPDATE profiles 
-- SET role = 'admin' 
-- WHERE email = 'admin@example.com';


