# Understanding Auth Users vs Profiles

## The Issue

When you look at **Supabase Auth page**, you see users in the `auth.users` table.  
When you run queries, you might be looking at the `profiles` table.  
**These are TWO DIFFERENT tables!**

## Two Tables Explained

### 1. `auth.users` (Supabase Auth)
- **Where**: Supabase Dashboard → Authentication → Users
- **Purpose**: Stores authentication credentials (email, password hash)
- **Created**: When you create a user in Auth dashboard or via signup
- **Contains**: `id`, `email`, `password hash`, `metadata`, etc.

### 2. `profiles` (Application Users)
- **Where**: Supabase Dashboard → Table Editor → profiles
- **Purpose**: Stores application-specific user data (username, role, name)
- **Created**: Automatically by trigger OR manually
- **Contains**: `id`, `username`, `email`, `name`, `role`, `avatar`

## Why Both Are Needed

- **auth.users**: Handles authentication (login, password reset)
- **profiles**: Handles application logic (roles, permissions, display)

## The Problem

If you create a user in **Auth page**, it only creates an entry in `auth.users`.  
The app needs a matching entry in `profiles` to work properly!

## Solution Queries

### See All Auth Users
```sql
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC;
```

### See All App Users (Profiles)
```sql
SELECT id, username, email, name, role 
FROM profiles 
ORDER BY created_at DESC;
```

### Find Users Missing Profiles
```sql
SELECT 
    au.id,
    au.email,
    au.created_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;
```

### Sync Missing Profiles
Run `sql/sync_existing_auth_users.sql` to create profiles for all auth users.

## Quick Reference

| What You See | Table Name | Query |
|-------------|------------|-------|
| Auth Dashboard | `auth.users` | `SELECT * FROM auth.users;` |
| App Users | `profiles` | `SELECT * FROM profiles;` |
| Both Combined | Join query | See `sql/compare_auth_and_profiles.sql` |

## To Update User Role

Since the app uses `profiles` table, update role there:

```sql
-- Update role in profiles table (not auth.users!)
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'user@example.com';
```

## To Create Profile for Auth User

If you see a user in Auth but not in profiles:

```sql
-- Get the user ID from auth.users first
SELECT id, email FROM auth.users WHERE email = 'user@example.com';

-- Then create profile (replace with actual values)
INSERT INTO profiles (id, username, email, name, role)
VALUES (
    'user-id-from-above',
    'username',
    'user@example.com',
    'User Name',
    'admin'
);
```

Or use the sync script: `sql/sync_existing_auth_users.sql`


