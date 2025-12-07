-- Quick fix: Check if user has profile and create if missing
-- Replace 'user@example.com' with the actual email of the user you created

-- Step 1: Check if profile exists
SELECT 
    au.id as auth_id,
    au.email as auth_email,
    p.id as profile_id,
    p.username,
    p.role,
    CASE 
        WHEN p.id IS NULL THEN '❌ Missing Profile'
        ELSE '✅ Profile Exists'
    END as status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'user@example.com';

-- Step 2: If profile is missing, create it
-- Uncomment and run this if profile is missing:
/*
INSERT INTO profiles (id, username, email, name, role, avatar)
SELECT 
    au.id,
    SPLIT_PART(au.email, '@', 1) as username,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'full_name',
        au.raw_user_meta_data->>'name',
        SPLIT_PART(au.email, '@', 1)
    ) as name,
    COALESCE(
        (au.raw_user_meta_data->>'role')::text,
        'teacher'
    ) as role,
    au.raw_user_meta_data->>'avatar_url' as avatar
FROM auth.users au
WHERE au.email = 'user@example.com'
    AND NOT EXISTS (
        SELECT 1 FROM profiles p WHERE p.id = au.id
    );
*/

