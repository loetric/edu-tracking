-- ============================================
-- ADD studentNumber COLUMN TO students TABLE
-- ============================================
-- This script adds the studentNumber column to the students table
-- Run this in Supabase SQL Editor

-- First, ensure column names are correct (handle case sensitivity)
-- Fix all column name case issues
DO $$
BEGIN
    -- Fix students.classGrade
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'students' 
        AND column_name = 'classgrade'
    ) THEN
        ALTER TABLE public.students RENAME COLUMN classgrade TO "classGrade";
    END IF;
    
    -- Fix students.parentPhone
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'students' 
        AND column_name = 'parentphone'
    ) THEN
        ALTER TABLE public.students RENAME COLUMN parentphone TO "parentPhone";
    END IF;
    
    -- Fix daily_records.studentId
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'daily_records' 
        AND column_name = 'studentid'
    ) THEN
        ALTER TABLE public.daily_records RENAME COLUMN studentid TO "studentId";
    END IF;
    
    -- Fix schedule.classRoom
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'schedule' 
        AND column_name = 'classroom'
    ) THEN
        ALTER TABLE public.schedule RENAME COLUMN classroom TO "classRoom";
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

