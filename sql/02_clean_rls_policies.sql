-- ============================================
-- CLEAN RLS POLICIES - Security Setup
-- ============================================
-- This script sets up Row Level Security policies
-- Run this AFTER 01_clean_schema.sql

-- ============================================
-- PROFILES POLICIES
-- ============================================
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can select profiles for login" ON public.profiles;
DROP POLICY IF EXISTS "Users can select own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can read all profiles" ON public.profiles;

-- Allow public read for login (username lookup)
CREATE POLICY "Public can select profiles for login" ON public.profiles
    FOR SELECT
    USING (true);

-- Allow authenticated users to insert profiles (soft policy)
CREATE POLICY "Allow insert for authenticated" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Note: Admin read policy removed to prevent infinite recursion
-- Public read policy above allows all reads, which is sufficient for login
-- Admins can read all profiles through the public policy

-- ============================================
-- SETTINGS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Public read settings" ON public.settings;
DROP POLICY IF EXISTS "Admin can update settings" ON public.settings;
DROP POLICY IF EXISTS "Admin can insert settings" ON public.settings;

-- Public read access
CREATE POLICY "Public read settings" ON public.settings
    FOR SELECT
    USING (true);

-- Authenticated users can modify settings (soft policy)
CREATE POLICY "Authenticated can modify settings" ON public.settings
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- STUDENTS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Select students for authenticated" ON public.students;
DROP POLICY IF EXISTS "Insert students for authenticated" ON public.students;
DROP POLICY IF EXISTS "Update students for authenticated" ON public.students;
DROP POLICY IF EXISTS "Delete students for authenticated" ON public.students;

-- Authenticated users can read students
CREATE POLICY "Select students for authenticated" ON public.students
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Authenticated users can insert students
CREATE POLICY "Insert students for authenticated" ON public.students
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can update students
CREATE POLICY "Update students for authenticated" ON public.students
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can delete students
CREATE POLICY "Delete students for authenticated" ON public.students
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- ============================================
-- SCHEDULE POLICIES
-- ============================================
DROP POLICY IF EXISTS "Public read schedule" ON public.schedule;
DROP POLICY IF EXISTS "Admin can modify schedule" ON public.schedule;

-- Public read access
CREATE POLICY "Public read schedule" ON public.schedule
    FOR SELECT
    USING (true);

-- Admin can modify schedule
CREATE POLICY "Admin can modify schedule" ON public.schedule
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- ============================================
-- DAILY RECORDS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Insert daily records for authenticated" ON public.daily_records;
DROP POLICY IF EXISTS "Select daily records for authenticated" ON public.daily_records;
DROP POLICY IF EXISTS "Update daily records for authenticated" ON public.daily_records;
DROP POLICY IF EXISTS "Delete daily records for authenticated" ON public.daily_records;

-- Authenticated users can insert records
CREATE POLICY "Insert daily records for authenticated" ON public.daily_records
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can read records
CREATE POLICY "Select daily records for authenticated" ON public.daily_records
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Authenticated users can update records
CREATE POLICY "Update daily records for authenticated" ON public.daily_records
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can delete records
CREATE POLICY "Delete daily records for authenticated" ON public.daily_records
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- ============================================
-- CHAT MESSAGES POLICIES
-- ============================================
DROP POLICY IF EXISTS "Insert chat by authenticated" ON public.chat_messages;
DROP POLICY IF EXISTS "Select chat for authenticated" ON public.chat_messages;

-- Authenticated users can send messages
CREATE POLICY "Insert chat by authenticated" ON public.chat_messages
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can read messages
CREATE POLICY "Select chat for authenticated" ON public.chat_messages
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- ============================================
-- LOGS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Allow insert logs by authenticated" ON public.logs;
DROP POLICY IF EXISTS "Allow select logs by authenticated" ON public.logs;

-- Authenticated users can create logs
CREATE POLICY "Allow insert logs by authenticated" ON public.logs
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can read logs
CREATE POLICY "Allow select logs by authenticated" ON public.logs
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- ============================================
-- COMPLETED SESSIONS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Authenticated insert completed_sessions" ON public.completed_sessions;
DROP POLICY IF EXISTS "Authenticated select completed_sessions" ON public.completed_sessions;

-- Authenticated users can mark sessions complete
CREATE POLICY "Authenticated insert completed_sessions" ON public.completed_sessions
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can read completed sessions
CREATE POLICY "Authenticated select completed_sessions" ON public.completed_sessions
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- ============================================
-- SUBSTITUTIONS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Authenticated insert substitutions" ON public.substitutions;
DROP POLICY IF EXISTS "Authenticated select substitutions" ON public.substitutions;
DROP POLICY IF EXISTS "Authenticated update substitutions" ON public.substitutions;
DROP POLICY IF EXISTS "Authenticated delete substitutions" ON public.substitutions;

-- Authenticated users can create substitutions
CREATE POLICY "Authenticated insert substitutions" ON public.substitutions
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can read substitutions
CREATE POLICY "Authenticated select substitutions" ON public.substitutions
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Authenticated users can update substitutions
CREATE POLICY "Authenticated update substitutions" ON public.substitutions
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can delete substitutions
CREATE POLICY "Authenticated delete substitutions" ON public.substitutions
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- ============================================
-- Success Message
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ RLS policies created successfully!';
    RAISE NOTICE 'Next: Run 03_auto_create_profile_trigger.sql to set up auto-profile creation';
END $$;

