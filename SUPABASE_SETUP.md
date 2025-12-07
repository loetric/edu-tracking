# Supabase Setup Guide

This project now uses Supabase as the database instead of a mock in-memory database.

## Prerequisites

1. A Supabase account (https://supabase.com)
2. Node.js installed

## Setup Steps

### 1. Create Supabase Project

1. Go to https://app.supabase.com
2. Sign in or create an account
3. Click "New Project"
4. Fill in the project details:
   - Name: `edu-tracking` (or your preferred name)
   - Database Password: Create a strong password
   - Region: Select the closest to your location
5. Click "Create new project" and wait for it to finish

### 2. Get Your Credentials

1. After the project is created, go to **Settings > API**
2. Copy your:
   - **Project URL** → This is your `VITE_SUPABASE_URL`
   - **anon public** key → This is your `VITE_SUPABASE_ANON_KEY`

### 3. Update Environment Variables

Update `.env.local` with your credentials:

```
GEMINI_API_KEY=your_gemini_api_key
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 4. Create Database Tables

Run the following SQL in your Supabase dashboard (SQL Editor):

```sql
-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  arabicName TEXT NOT NULL,
  challenge JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Schedule table
CREATE TABLE IF NOT EXISTS schedule (
  id TEXT PRIMARY KEY,
  teacher TEXT NOT NULL,
  time TEXT NOT NULL,
  day TEXT NOT NULL,
  students TEXT[] NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Daily Records table
CREATE TABLE IF NOT EXISTS daily_records (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  teacher TEXT NOT NULL,
  studentId TEXT NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Chat Messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Logs table
CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user TEXT NOT NULL,
  action TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Completed Sessions table
CREATE TABLE IF NOT EXISTS completed_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Substitutions table
CREATE TABLE IF NOT EXISTS substitutions (
  id TEXT PRIMARY KEY,
  originalTeacher TEXT NOT NULL,
  substituteTeacher TEXT NOT NULL,
  date TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5. Install Dependencies

```bash
npm install
```

### 6. Run the Application

```bash
npm run dev
```

## Important Notes

- All data is now persisted in Supabase
- No more data loss on page refresh
- Ensure Row Level Security (RLS) is properly configured for your use case
- Keep your API keys secure and never commit them to version control

## Troubleshooting

- If you get "Missing environment variables" error, ensure your `.env.local` file has the correct URLs and keys
- Check that all tables were created successfully in your Supabase dashboard
- Make sure your API keys have the right permissions (anon key is typically sufficient for basic operations)
