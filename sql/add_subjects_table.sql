-- ============================================
-- ADD SUBJECTS TABLE
-- ============================================
-- This script creates the subjects table for managing school subjects
-- Run this if the table doesn't exist

-- Create subjects table
CREATE TABLE IF NOT EXISTS public.subjects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    code text, -- رمز المادة (اختياري)
    description text, -- وصف المادة (اختياري)
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_subjects_name ON public.subjects(name);

-- Add RLS policies for subjects
DROP POLICY IF EXISTS "Public can select subjects" ON public.subjects;
DROP POLICY IF EXISTS "Authenticated can insert subjects" ON public.subjects;
DROP POLICY IF EXISTS "Authenticated can update subjects" ON public.subjects;
DROP POLICY IF EXISTS "Authenticated can delete subjects" ON public.subjects;

-- Public read access (needed for dropdowns)
CREATE POLICY "Public can select subjects" ON public.subjects
    FOR SELECT
    USING (true);

-- Authenticated users can insert subjects
CREATE POLICY "Authenticated can insert subjects" ON public.subjects
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can update subjects
CREATE POLICY "Authenticated can update subjects" ON public.subjects
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can delete subjects
CREATE POLICY "Authenticated can delete subjects" ON public.subjects
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Subjects table created successfully!';
END $$;

