-- ============================================
-- ADD studentNumber COLUMN TO students TABLE
-- ============================================
-- This script adds the studentNumber column to the students table
-- Run this in Supabase SQL Editor

-- Add studentNumber column if it doesn't exist
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS studentNumber text;

-- Add comment to explain the column
COMMENT ON COLUMN public.students.studentNumber IS 'رقم الطالب الأصلي من الملف (للعرض)';

-- Update existing students to use id as studentNumber if studentNumber is null
UPDATE public.students 
SET studentNumber = id 
WHERE studentNumber IS NULL OR studentNumber = '';

