-- ============================================
-- ADD STUDENT STATUS COLUMN
-- ============================================
-- This script adds the status column to the students table
-- Run this if the column doesn't exist

-- Add status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'students' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.students 
        ADD COLUMN status text DEFAULT 'regular' 
        CHECK (status IN ('regular', 'dropped', 'expelled'));
        
        -- Update existing students to have 'regular' status
        UPDATE public.students SET status = 'regular' WHERE status IS NULL;
        
        RAISE NOTICE '✅ Student status column added successfully!';
    ELSE
        RAISE NOTICE '⚠️ Student status column already exists';
    END IF;
END $$;

