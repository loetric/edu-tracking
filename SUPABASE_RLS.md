# Supabase Profiles & RLS Guide

This file contains recommended SQL to create a `profiles` table (linked to Supabase Auth users) and example Row Level Security (RLS) policies. Review and adapt before applying in your Supabase project.

Run the SQL below in the Supabase SQL editor:

```sql
-- Profiles table (linked to auth.users)
create table if not exists profiles (
  id uuid references auth.users not null primary key,
  username text not null unique,
  email text,
  name text,
  role text,
  avatar text,
  created_at timestamptz default now()
);

-- Enable RLS on profiles
alter table profiles enable row level security;

-- Allow users to insert their own profile when authenticated
create policy "Allow insert for authenticated" on profiles
  for insert
  with check (auth.role() = 'authenticated');

-- Allow users to select their own profile
create policy "Users can select own profile" on profiles
  for select
  using (auth.uid() = id);

-- Allow users to update their own profile
create policy "Users can update own profile" on profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Example: allow admins to read all profiles (adjust to your admin check)
-- create policy "Admin can select" on profiles
--   for select
--   using (exists (select 1 from profiles p2 where p2.id = auth.uid() and p2.role = 'admin'));

-- Logs: allow authenticated inserts
alter table logs enable row level security;
create policy "Allow insert logs by authenticated" on logs
  for insert
  with check (auth.role() = 'authenticated');

-- Settings: public read
alter table settings enable row level security;
create policy "Public read settings" on settings
  for select
  using (true);

-- NOTE: For other tables (students, daily_records, schedule, chat_messages, substitutions, completed_sessions),
-- enable RLS and add policies tailored to your access model.
```

Notes:
- Test policies carefully. If you lock yourself out, disable RLS in the table settings in the Supabase dashboard.
- After creating `profiles`, plan a migration step to create profiles for existing users (see migration notes below).

Migration hints:
- If your existing `users` table has an `email` column, you can generate `profiles` entries by copying `id`, `username`, `email`, `name`, and `role` into `profiles`.
- If emails are missing, you'll need either to collect emails from users or create synthetic placeholder emails (not recommended for production).

If you want, I can generate a migration SQL script to create `profiles` from `users` (needs an `email` mapping) and a step-by-step plan to switch the frontend to Supabase Auth.
