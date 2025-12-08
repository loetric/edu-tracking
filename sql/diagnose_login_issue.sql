-- Diagnose login issue
-- Run this to check everything

-- 1. Check auth user exists
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users
WHERE email = 'admin@admin.local';

-- 2. Check profile exists
SELECT 
    id,
    username,
    email,
    role,
    name
FROM profiles
WHERE email = 'admin@admin.local';

-- 3. Check if IDs match
SELECT 
    au.id as auth_id,
    p.id as profile_id,
    CASE 
        WHEN au.id = p.id THEN '✅ IDs Match'
        ELSE '❌ IDs Mismatch'
    END as match_status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'admin@admin.local';

-- 4. Check RLS policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 5. Test profile query (simulate what login does)
SELECT email
FROM profiles
WHERE username = 'admin'
LIMIT 1;

SELECT email
FROM profiles
WHERE email = 'admin@admin.local'
LIMIT 1;


