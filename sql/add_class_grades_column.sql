-- Add classGrades column to settings table
-- This column stores the list of class grades (الفصول) defined by the admin

-- Check if column exists, if not add it
DO $$
BEGIN
    -- Check if classGrades column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'settings' 
        AND column_name = 'classGrades'
    ) THEN
        -- Add classGrades column as JSONB array
        ALTER TABLE public.settings 
        ADD COLUMN "classGrades" jsonb DEFAULT '[]'::jsonb;
        
        RAISE NOTICE 'Added classGrades column to settings table';
    ELSE
        RAISE NOTICE 'classGrades column already exists in settings table';
    END IF;
END $$;

-- Add comment to column
COMMENT ON COLUMN public.settings."classGrades" IS 'قائمة الفصول المعرفة من قبل مدير النظام (JSON array of strings)';

