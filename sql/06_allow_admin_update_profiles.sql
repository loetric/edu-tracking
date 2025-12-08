-- ============================================
-- ALLOW ADMIN TO UPDATE ALL PROFILES
-- ============================================
-- This policy allows admins to update any user profile
-- Run this AFTER 02_clean_rls_policies.sql

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;

-- Allow admins to update any profile
CREATE POLICY "Admin can update all profiles" ON public.profiles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );


