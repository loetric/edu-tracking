-- Compare users in auth.users vs profiles table
-- This helps identify mismatches

-- ============================================
-- 1. All users in Supabase Auth (what you see in Auth page)
-- ============================================
SELECT 
    id,
    email,
    raw_user_meta_data->>'full_name' as name,
    raw_user_meta_data->>'name' as name_alt,
    created_at,
    email_confirmed_at,
    last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- ============================================
-- 2. All users in profiles table (what app uses)
-- ============================================
SELECT 
    id,
    username,
    email,
    name,
    role,
    created_at
FROM profiles
ORDER BY created_at DESC;

-- ============================================
-- 3. Users in auth.users BUT NOT in profiles (MISSING PROFILES)
-- ============================================
SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data->>'full_name' as name,
    au.created_at as auth_created_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
ORDER BY au.created_at DESC;

-- ============================================
-- 4. Users in profiles BUT NOT in auth.users (ORPHANED PROFILES)
-- ============================================
SELECT 
    p.id,
    p.username,
    p.email,
    p.name,
    p.role,
    p.created_at
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE au.id IS NULL
ORDER BY p.created_at DESC;

-- ============================================
-- 5. Side-by-side comparison (users in both)
-- ============================================
SELECT 
    au.id,
    au.email as auth_email,
    p.email as profile_email,
    p.username,
    p.name as profile_name,
    p.role,
    CASE 
        WHEN p.id IS NULL THEN '❌ Missing Profile'
        WHEN au.id IS NULL THEN '❌ Missing Auth'
        ELSE '✅ OK'
    END as status
FROM auth.users au
FULL OUTER JOIN profiles p ON au.id = p.id
ORDER BY au.created_at DESC NULLS LAST;


