-- ============================================
-- CLEAN DATABASE SCHEMA - Fresh Start
-- ============================================
-- This script creates a clean database schema that matches the application code exactly
-- Run this in Supabase SQL Editor to reset your database
-- WARNING: This will DROP all existing tables and data!

-- ============================================
-- STEP 1: Drop all existing tables (if you want a clean start)
-- ============================================
-- Uncomment the following lines if you want to drop everything first
/*
DROP TABLE IF EXISTS public.substitutions CASCADE;
DROP TABLE IF EXISTS public.completed_sessions CASCADE;
DROP TABLE IF EXISTS public.daily_records CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.logs CASCADE;
DROP TABLE IF EXISTS public.schedule CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
*/

-- ============================================
-- STEP 2: Create Profiles Table (linked to Supabase Auth)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text NOT NULL UNIQUE,
    email text,
    name text NOT NULL,
    role text CHECK (role IN ('admin', 'counselor', 'teacher')) DEFAULT 'teacher',
    avatar text,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- STEP 3: Create Settings Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    logoUrl text,
    ministry text,
    region text,
    slogan text,
    whatsappPhone text,
    reportGeneralMessage text,
    reportLink text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- STEP 4: Create Students Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.students (
    id text PRIMARY KEY,
    name text NOT NULL,
    classGrade text NOT NULL,
    parentPhone text NOT NULL,
    challenge jsonb,
    avatar text,
    studentNumber text, -- رقم الطالب الأصلي من الملف (للعرض)
    status text DEFAULT 'regular' CHECK (status IN ('regular', 'dropped', 'expelled')), -- حالة الطالب: منتظم، منقطع، مفصول
    created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- STEP 5: Create Schedule Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.schedule (
    id text PRIMARY KEY,
    day text NOT NULL,
    period integer NOT NULL,
    subject text NOT NULL,
    classRoom text NOT NULL,
    teacher text,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- STEP 6: Create Daily Records Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.daily_records (
    id text PRIMARY KEY,
    studentId text NOT NULL,
    date text NOT NULL,
    attendance text NOT NULL CHECK (attendance IN ('present', 'absent', 'excused')),
    participation text NOT NULL CHECK (participation IN ('excellent', 'good', 'average', 'poor', 'none')),
    homework text NOT NULL CHECK (homework IN ('excellent', 'good', 'average', 'poor', 'none')),
    behavior text NOT NULL CHECK (behavior IN ('excellent', 'good', 'average', 'poor', 'none')),
    notes text DEFAULT '',
    created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- STEP 7: Create Chat Messages Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sender text NOT NULL,
    text text NOT NULL,
    timestamp timestamptz NOT NULL,
    isSystem boolean DEFAULT false,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- STEP 8: Create Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user" text NOT NULL,
    action text NOT NULL,
    details text,
    timestamp timestamptz NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- STEP 9: Create Completed Sessions Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.completed_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id text NOT NULL UNIQUE,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- STEP 10: Create Substitutions Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.substitutions (
    id text PRIMARY KEY,
    date text NOT NULL,
    "scheduleItemId" text NOT NULL,
    "substituteTeacher" text NOT NULL,
    reason text,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- STEP 10.5: Create Subjects Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.subjects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    code text,
    description text,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- STEP 11: Create Indexes for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_students_classGrade ON public.students("classGrade");
CREATE INDEX IF NOT EXISTS idx_daily_records_studentId ON public.daily_records("studentId");
CREATE INDEX IF NOT EXISTS idx_daily_records_date ON public.daily_records(date);
CREATE INDEX IF NOT EXISTS idx_schedule_day ON public.schedule(day);
CREATE INDEX IF NOT EXISTS idx_substitutions_date ON public.substitutions(date);
CREATE INDEX IF NOT EXISTS idx_substitutions_scheduleItemId ON public.substitutions(scheduleItemId);
CREATE INDEX IF NOT EXISTS idx_subjects_name ON public.subjects(name);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- ============================================
-- STEP 12: Enable Row Level Security
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completed_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.substitutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Success Message
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Database schema created successfully!';
    RAISE NOTICE 'Next: Run 02_clean_rls_policies.sql to set up security policies';
END $$;

