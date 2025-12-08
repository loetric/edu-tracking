-- ============================================
-- ADD studentNumber COLUMN TO students TABLE
-- ============================================
-- This script adds the studentNumber column to the students table
-- Run this in Supabase SQL Editor

-- First, ensure column names are correct (handle case sensitivity)
-- Check if classGrade exists, if not rename classgrade to classGrade
DO $$
BEGIN
    -- Check if classgrade exists (lowercase) and rename it if needed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'students' 
        AND column_name = 'classgrade'
    ) THEN
        ALTER TABLE public.students RENAME COLUMN classgrade TO "classGrade";
    END IF;
    
    -- Check if parentphone exists (lowercase) and rename it if needed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'students' 
        AND column_name = 'parentphone'
    ) THEN
        ALTER TABLE public.students RENAME COLUMN parentphone TO "parentPhone";
    END IF;
END $$;

-- Add studentNumber column if it doesn't exist
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS "studentNumber" text;

-- Add comment to explain the column
COMMENT ON COLUMN public.students."studentNumber" IS 'رقم الطالب الأصلي من الملف (للعرض)';

-- Update existing students to use id as studentNumber if studentNumber is null
UPDATE public.students 
SET "studentNumber" = id 
WHERE "studentNumber" IS NULL OR "studentNumber" = '';

