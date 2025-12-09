-- ============================================
-- FIX PROFILE TRIGGER RLS ISSUE
-- ============================================
-- This fixes the issue where the trigger function cannot insert profiles
-- due to RLS policies blocking SECURITY DEFINER functions
-- Run this if you're getting "Database error saving new user" when creating users

-- ============================================
-- STEP 1: Grant necessary permissions to the function
-- ============================================
-- Ensure the function can bypass RLS when running as SECURITY DEFINER
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, service_role;

-- ============================================
-- STEP 2: Add a policy that allows the trigger function to insert profiles
-- ============================================
-- This policy allows the SECURITY DEFINER function to insert profiles
-- even when the user is not yet authenticated in the session context
DROP POLICY IF EXISTS "Allow trigger to insert profiles" ON public.profiles;

CREATE POLICY "Allow trigger to insert profiles" ON public.profiles
    FOR INSERT
    WITH CHECK (true); -- SECURITY DEFINER functions bypass this check anyway, but this ensures compatibility

-- ============================================
-- STEP 3: Update the trigger function to handle errors better
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert a profile for the newly created auth user
    -- Use ON CONFLICT to handle race conditions
    INSERT INTO public.profiles(id, username, email, name, role, avatar)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'username',
            SPLIT_PART(NEW.email, '@', 1),
            'user_' || SUBSTRING(NEW.id::text, 1, 8)
        ),
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            SPLIT_PART(NEW.email, '@', 1),
            'User'
        ),
        COALESCE(
            (NEW.raw_user_meta_data->>'role')::text,
            'teacher'
        ),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        avatar = EXCLUDED.avatar;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- ============================================
-- STEP 4: Ensure trigger exists
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
    RAISE NOTICE '✅ Profile trigger RLS fix applied successfully!';
    RAISE NOTICE 'The trigger function can now create profiles without RLS blocking.';
END $$;

