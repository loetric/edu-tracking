-- ============================================
-- ADD DELETE POLICY FOR STUDENTS
-- ============================================
-- This script adds the missing DELETE policy for students table
-- Run this to fix the deletion issue

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Delete students for authenticated" ON public.students;

-- Authenticated users can delete students
CREATE POLICY "Delete students for authenticated" ON public.students
    FOR DELETE
    USING (auth.role() = 'authenticated');

