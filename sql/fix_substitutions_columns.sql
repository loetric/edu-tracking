-- ============================================
-- FIX SUBSTITUTIONS TABLE COLUMN NAMES
-- ============================================
-- This script fixes column names in the substitutions table
-- to match the camelCase expected by the code

DO $$
BEGIN
    -- Fix scheduleItemId column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'substitutions' 
        AND column_name = 'scheduleitemid'
    ) THEN
        ALTER TABLE public.substitutions 
        RENAME COLUMN scheduleitemid TO "scheduleItemId";
        RAISE NOTICE 'Column "scheduleitemid" renamed to "scheduleItemId"';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'substitutions' 
        AND column_name = 'scheduleItemId'
    ) THEN
        RAISE NOTICE 'Column "scheduleItemId" already exists with correct name';
    ELSE
        RAISE NOTICE 'Column not found. Table may not exist or column has different name';
    END IF;

    -- Fix substituteTeacher column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'substitutions' 
        AND column_name = 'substituteteacher'
    ) THEN
        ALTER TABLE public.substitutions 
        RENAME COLUMN substituteteacher TO "substituteTeacher";
        RAISE NOTICE 'Column "substituteteacher" renamed to "substituteTeacher"';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'substitutions' 
        AND column_name = 'substituteTeacher'
    ) THEN
        RAISE NOTICE 'Column "substituteTeacher" already exists with correct name';
    ELSE
        RAISE NOTICE 'Column not found. Table may not exist or column has different name';
    END IF;

    -- Recreate index if it exists with wrong name
    DROP INDEX IF EXISTS idx_substitutions_scheduleitemid;
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_substitutions_scheduleItemId'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_substitutions_scheduleItemId 
        ON public.substitutions("scheduleItemId");
        RAISE NOTICE 'Index "idx_substitutions_scheduleItemId" created';
    END IF;

    RAISE NOTICE '✅ Substitutions table columns fixed successfully!';
END $$;

