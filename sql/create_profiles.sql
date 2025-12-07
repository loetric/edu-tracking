-- SQL: create profiles table linked to auth.users
create table if not exists profiles (
  id uuid references auth.users not null primary key,
  username text not null unique,
  email text,
  name text,
  role text,
  avatar text,
  created_at timestamptz default now()
);

-- Enable RLS for profiles (you will still need to create policies)
alter table profiles enable row level security;

-- Note: create policies separately in rls_policies.sql or via the Supabase UI
