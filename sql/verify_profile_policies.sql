-- ============================================
-- VERIFY PROFILE POLICIES AND TRIGGER
-- ============================================
-- This script verifies that all profile policies are correctly set up
-- and that the trigger function can work properly

-- ============================================
-- STEP 1: Check existing policies
-- ============================================
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- ============================================
-- STEP 2: Check trigger function exists
-- ============================================
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'handle_auth_user_created';

-- ============================================
-- STEP 3: Check trigger exists
-- ============================================
SELECT 
    t.tgname as trigger_name,
    t.tgenabled as enabled,
    c.relname as table_name,
    p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth'
  AND c.relname = 'users'
  AND t.tgname = 'create_profile_on_auth_user';

-- ============================================
-- STEP 4: Test if trigger function can insert (simulation)
-- ============================================
-- This will show if the function has the right permissions
SELECT 
    has_table_privilege('public.handle_auth_user_created()', 'profiles', 'INSERT') as can_insert,
    has_table_privilege('public.handle_auth_user_created()', 'profiles', 'SELECT') as can_select;

-- ============================================
-- STEP 5: Check RLS is enabled
-- ============================================
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'profiles';

-- ============================================
-- Success Message
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Profile policies verification complete!';
    RAISE NOTICE 'Check the results above to ensure everything is configured correctly.';
END $$;

