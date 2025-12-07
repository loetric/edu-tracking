-- ============================================
-- FIX COLUMN NAMES - Match Code Expectations
-- ============================================
-- Run this to fix column names that were lowercased by PostgreSQL
-- This renames columns to match the camelCase expected by the code

-- Fix daily_records.studentId
ALTER TABLE public.daily_records 
RENAME COLUMN studentid TO "studentId";

-- Fix students.classGrade and parentPhone
ALTER TABLE public.students 
RENAME COLUMN classgrade TO "classGrade";

ALTER TABLE public.students 
RENAME COLUMN parentphone TO "parentPhone";

-- Fix schedule.classRoom
ALTER TABLE public.schedule 
RENAME COLUMN classroom TO "classRoom";

-- Fix substitutions columns
ALTER TABLE public.substitutions 
RENAME COLUMN scheduleitemid TO "scheduleItemId";

ALTER TABLE public.substitutions 
RENAME COLUMN substituteteacher TO "substituteTeacher";

-- Fix settings columns
ALTER TABLE public.settings 
RENAME COLUMN logourl TO "logoUrl";

ALTER TABLE public.settings 
RENAME COLUMN whatsappphone TO "whatsappPhone";

ALTER TABLE public.settings 
RENAME COLUMN reportgeneralmessage TO "reportGeneralMessage";

ALTER TABLE public.settings 
RENAME COLUMN reportlink TO "reportLink";

-- Fix chat_messages.isSystem
ALTER TABLE public.chat_messages 
RENAME COLUMN issystem TO "isSystem";

-- Note: logs."user" column is already correct (quoted reserved keyword)

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Column names fixed to match code expectations!';
END $$;

