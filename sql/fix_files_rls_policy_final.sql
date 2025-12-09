-- ============================================
-- FINAL FIX FOR FILES TABLE RLS POLICY
-- ============================================
-- This script ensures the RLS policies for files table work correctly
-- Run this in Supabase SQL Editor

-- First, ensure RLS is enabled
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can insert files" ON public.files;
DROP POLICY IF EXISTS "Admin can update files" ON public.files;
DROP POLICY IF EXISTS "Admin can delete files" ON public.files;
DROP POLICY IF EXISTS "Select files based on access level" ON public.files;

-- Recreate SELECT policy (for reading files)
CREATE POLICY "Select files based on access level" ON public.files
    FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            access_level = 'public' OR
            (access_level = 'teachers' AND EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role = 'teacher'
            )) OR
            (access_level = 'counselors' AND EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role = 'counselor'
            )) OR
            (access_level = 'teachers_counselors' AND EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role IN ('teacher', 'counselor')
            )) OR
            -- Admins can see all files
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role = 'admin'
            )
        )
    );

-- Create INSERT policy (only for admins)
-- Using the same pattern as schedule policies which work correctly
CREATE POLICY "Admin can insert files" ON public.files
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Create UPDATE policy (only for admins)
CREATE POLICY "Admin can update files" ON public.files
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

-- Create DELETE policy (only for admins)
CREATE POLICY "Admin can delete files" ON public.files
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Files table RLS policies fixed successfully!';
    RAISE NOTICE 'All policies use the same pattern as schedule policies.';
    RAISE NOTICE 'Admins can now insert, update, and delete files.';
END $$;

