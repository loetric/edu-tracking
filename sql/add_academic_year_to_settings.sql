-- ============================================
-- ADD academicYear COLUMN TO settings TABLE
-- ============================================
-- This script adds the academicYear column to the settings table
-- Run this in Supabase SQL Editor

DO $$
BEGIN
    -- Check if column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'settings' 
        AND column_name = 'academicYear'
    ) THEN
        -- Add academicYear column to settings table
        ALTER TABLE public.settings 
        ADD COLUMN "academicYear" text;
        
        -- Add comment to explain the column
        COMMENT ON COLUMN public.settings."academicYear" IS 'العام الدراسي (مثال: 1445-1446)';
        
        RAISE NOTICE '✅ Column "academicYear" added to settings table successfully!';
    ELSE
        RAISE NOTICE '✅ Column "academicYear" already exists in settings table';
    END IF;
END $$;

