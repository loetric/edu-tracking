-- SQL queries to get all users in the system
-- NOTE: There are TWO tables:
-- 1. auth.users - Supabase Auth users (what you see in Auth page)
-- 2. profiles - Application users (what the app uses)

-- ============================================
-- OPTION 1: Get users from auth.users (Supabase Auth)
-- ============================================
SELECT 
    id,
    email,
    raw_user_meta_data->>'full_name' as name,
    raw_user_meta_data->>'role' as role,
    created_at,
    email_confirmed_at,
    last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- ============================================
-- OPTION 2: Get users from profiles table (App users)
-- ============================================
SELECT 
    id,
    username,
    email,
    name,
    role,
    avatar,
    created_at
FROM profiles
ORDER BY created_at DESC;

-- ============================================
-- OPTION 3: Combined view (users with their profiles)
-- ============================================
SELECT 
    au.id,
    au.email,
    p.username,
    p.name,
    p.role,
    CASE 
        WHEN p.id IS NULL THEN 'No Profile'
        ELSE 'Has Profile'
    END as profile_status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
ORDER BY au.created_at DESC;

-- ============================================
-- OPTION 4: Only users that can login (have profiles)
-- ============================================
SELECT 
    p.id,
    p.username,
    p.email,
    p.name,
    p.role,
    au.email_confirmed_at,
    au.last_sign_in_at
FROM profiles p
INNER JOIN auth.users au ON p.id = au.id
ORDER BY p.created_at DESC;
