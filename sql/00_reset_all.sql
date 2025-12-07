-- ============================================
-- COMPLETE DATABASE RESET
-- ============================================
-- WARNING: This will DELETE ALL DATA and TABLES!
-- Only run this if you want to start completely fresh
-- ============================================

-- Drop all tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS public.substitutions CASCADE;
DROP TABLE IF EXISTS public.completed_sessions CASCADE;
DROP TABLE IF EXISTS public.daily_records CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.logs CASCADE;
DROP TABLE IF EXISTS public.schedule CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.users_backup CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_auth_user_created() CASCADE;
DROP FUNCTION IF EXISTS public.sync_auth_users_to_profiles() CASCADE;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ All tables and functions dropped!';
    RAISE NOTICE 'Now run: 01_clean_schema.sql to create fresh tables';
END $$;

