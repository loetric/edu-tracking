-- Fix infinite recursion in profiles RLS policy
-- Run this to fix the login issue

-- Drop the problematic admin policy that causes recursion
DROP POLICY IF EXISTS "Admin can read all profiles" ON public.profiles;

-- Ensure public read policy exists (for login)
DROP POLICY IF EXISTS "Public can select profiles for login" ON public.profiles;

CREATE POLICY "Public can select profiles for login" ON public.profiles
    FOR SELECT
    USING (true);

-- Verify policies
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

