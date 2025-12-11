-- Add new fields to settings table for school information
-- This migration adds: principalName, educationalAffairsOfficer, schoolNumber, stampUrl

-- Check if columns exist before adding
DO $$ 
BEGIN
    -- Add principalName (اسم مدير المدرسة)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'settings' AND column_name = 'principalName'
    ) THEN
        ALTER TABLE settings ADD COLUMN "principalName" text;
    END IF;

    -- Add educationalAffairsOfficer (وكيل الشؤون التعليمية)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'settings' AND column_name = 'educationalAffairsOfficer'
    ) THEN
        ALTER TABLE settings ADD COLUMN "educationalAffairsOfficer" text;
    END IF;


    -- Add stampUrl (ختم المدرسة)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'settings' AND column_name = 'stampUrl'
    ) THEN
        ALTER TABLE settings ADD COLUMN "stampUrl" text;
    END IF;
END $$;

