-- ============================================
-- AUTO-CREATE PROFILE TRIGGER
-- ============================================
-- This automatically creates a profile when a new user is created in Supabase Auth
-- Run this AFTER 01_clean_schema.sql and 02_clean_rls_policies.sql

-- ============================================
-- Create Function
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert a profile for the newly created auth user
    INSERT INTO public.profiles(id, username, email, name, role, avatar)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'username',
            SPLIT_PART(NEW.email, '@', 1)
        ),
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            SPLIT_PART(NEW.email, '@', 1)
        ),
        COALESCE(
            (NEW.raw_user_meta_data->>'role')::text,
            'teacher'
        ),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- ============================================
-- Create Trigger
-- ============================================
DROP TRIGGER IF EXISTS create_profile_on_auth_user ON auth.users;

CREATE TRIGGER create_profile_on_auth_user
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_auth_user_created();

-- ============================================
-- Success Message
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Auto-profile creation trigger set up successfully!';
    RAISE NOTICE 'New users will automatically get profiles created.';
END $$;

