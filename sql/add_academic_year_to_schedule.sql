-- ============================================
-- ADD academicYear COLUMN TO schedule TABLE
-- ============================================
-- This script adds the academicYear column to the schedule table
-- Run this in Supabase SQL Editor

DO $$
BEGIN
    -- Check if column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'schedule' 
        AND column_name = 'academicYear'
    ) THEN
        -- Add academicYear column to schedule table
        ALTER TABLE public.schedule 
        ADD COLUMN "academicYear" text;
        
        -- Add comment to explain the column
        COMMENT ON COLUMN public.schedule."academicYear" IS 'العام الدراسي (مثال: 1445-1446)';
        
        RAISE NOTICE '✅ Column "academicYear" added to schedule table successfully!';
    ELSE
        RAISE NOTICE '✅ Column "academicYear" already exists in schedule table';
    END IF;
END $$;

