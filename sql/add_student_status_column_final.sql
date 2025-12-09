-- ============================================
-- ADD STATUS COLUMN TO STUDENTS TABLE
-- ============================================
-- This script adds the 'status' column to the students table
-- Run this in Supabase SQL Editor if the column doesn't exist

-- Check if column exists, if not add it
DO $$
BEGIN
    -- Check if the status column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'students' 
        AND column_name = 'status'
    ) THEN
        -- Add the status column
        ALTER TABLE public.students 
        ADD COLUMN status text DEFAULT 'regular' 
        CHECK (status IN ('regular', 'dropped', 'expelled'));
        
        RAISE NOTICE '✅ Status column added successfully!';
    ELSE
        RAISE NOTICE 'ℹ️ Status column already exists.';
    END IF;
END $$;

-- Update existing students to have 'regular' status if they don't have one
UPDATE public.students 
SET status = 'regular' 
WHERE status IS NULL;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Students table status column setup complete!';
    RAISE NOTICE 'All existing students have been set to "regular" status.';
END $$;

