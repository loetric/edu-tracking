-- Complete Database Schema for Edu Tracking System
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. PROFILES TABLE (for Supabase Auth)
-- ============================================
create table if not exists profiles (
  id uuid references auth.users not null primary key,
  username text not null unique,
  email text,
  name text,
  role text,
  avatar text,
  created_at timestamptz default now()
);

-- ============================================
-- 2. SETTINGS TABLE
-- ============================================
create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logoUrl text,
  ministry text,
  region text,
  slogan text,
  whatsappPhone text,
  reportGeneralMessage text,
  reportLink text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- 3. STUDENTS TABLE
-- ============================================
create table if not exists students (
  id text primary key,
  name text not null,
  classGrade text not null,
  parentPhone text not null,
  challenge jsonb,
  avatar text,
  created_at timestamptz default now()
);

-- ============================================
-- 4. SCHEDULE TABLE
-- ============================================
create table if not exists schedule (
  id text primary key,
  day text not null,
  period integer not null,
  subject text not null,
  classRoom text not null,
  teacher text,
  created_at timestamptz default now()
);

-- ============================================
-- 5. DAILY RECORDS TABLE
-- ============================================
create table if not exists daily_records (
  id text primary key,
  studentId text not null,
  date text not null,
  attendance text not null,
  participation text not null,
  homework text not null,
  behavior text not null,
  notes text,
  created_at timestamptz default now()
);

-- ============================================
-- 6. CHAT MESSAGES TABLE
-- ============================================
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  sender text not null,
  text text not null,
  timestamp timestamptz not null,
  isSystem boolean default false,
  created_at timestamptz default now()
);

-- ============================================
-- 7. LOGS TABLE
-- ============================================
create table if not exists logs (
  id uuid primary key default gen_random_uuid(),
  user text not null,
  action text not null,
  details text,
  timestamp timestamptz not null,
  created_at timestamptz default now()
);

-- ============================================
-- 8. COMPLETED SESSIONS TABLE
-- ============================================
create table if not exists completed_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  created_at timestamptz default now()
);

-- ============================================
-- 9. SUBSTITUTIONS TABLE
-- ============================================
create table if not exists substitutions (
  id text primary key,
  date text not null,
  scheduleItemId text not null,
  substituteTeacher text not null,
  reason text,
  created_at timestamptz default now()
);

-- ============================================
-- 10. LEGACY USERS TABLE (for migration/fallback)
-- ============================================
create table if not exists users (
  id text primary key,
  username text not null unique,
  password text,
  email text,
  role text,
  name text,
  created_at timestamptz default now()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
create index if not exists idx_students_classGrade on students(classGrade);
create index if not exists idx_daily_records_studentId on daily_records(studentId);
create index if not exists idx_daily_records_date on daily_records(date);
create index if not exists idx_schedule_day on schedule(day);
create index if not exists idx_substitutions_date on substitutions(date);
create index if not exists idx_substitutions_scheduleItemId on substitutions(scheduleItemId);

