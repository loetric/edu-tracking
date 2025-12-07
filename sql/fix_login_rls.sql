-- Fix RLS policy to allow login
-- Run this if login fails even though profile exists

-- Ensure public can read profiles for login (username lookup)
DROP POLICY IF EXISTS "Public can select profiles for login" ON public.profiles;

CREATE POLICY "Public can select profiles for login" ON public.profiles
    FOR SELECT
    USING (true);

-- Verify policy exists
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

