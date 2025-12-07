# Quick Fix: User Created in Supabase Auth But Can't Login

## Problem
You created a user in Supabase Auth Dashboard, but can't login to the system.

## Cause
The user exists in `auth.users` but doesn't have a matching entry in the `profiles` table, which the app needs.

## Quick Fix (Choose One)

### Option 1: Check and Create Profile Manually (Fastest)

1. **Go to Supabase SQL Editor**
2. **Find your user's email** from Auth Dashboard
3. **Run this SQL** (replace email):

```sql
-- Check if profile exists
SELECT 
    au.email,
    p.username,
    p.role,
    CASE WHEN p.id IS NULL THEN 'Missing Profile' ELSE 'OK' END as status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'your-email@example.com';
```

4. **If profile is missing**, run this to create it:

```sql
INSERT INTO profiles (id, username, email, name, role)
SELECT 
    au.id,
    SPLIT_PART(au.email, '@', 1) as username,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'full_name',
        SPLIT_PART(au.email, '@', 1)
    ) as name,
    COALESCE(
        (au.raw_user_meta_data->>'role')::text,
        'teacher'
    ) as role
FROM auth.users au
WHERE au.email = 'your-email@example.com'
    AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = au.id);
```

5. **Set role to admin** (if needed):

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

### Option 2: Sync All Auth Users (If Multiple Users)

Run the sync script to create profiles for ALL users in auth.users:

1. **Go to Supabase SQL Editor**
2. **Run `sql/sync_existing_auth_users.sql`** (if it exists)
   
   OR run this:

```sql
-- Create profiles for all auth users missing profiles
INSERT INTO profiles (id, username, email, name, role)
SELECT 
    au.id,
    COALESCE(
        au.raw_user_meta_data->>'username',
        SPLIT_PART(au.email, '@', 1)
    ) as username,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'full_name',
        au.raw_user_meta_data->>'name',
        SPLIT_PART(au.email, '@', 1)
    ) as name,
    COALESCE(
        (au.raw_user_meta_data->>'role')::text,
        'teacher'
    ) as role
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = au.id
);
```

### Option 3: Verify Auto-Profile Trigger

If the trigger should have created the profile automatically:

1. **Check if trigger exists**:

```sql
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
    AND trigger_name = 'create_profile_on_auth_user';
```

2. **If trigger doesn't exist**, run `sql/03_auto_create_profile_trigger.sql`

3. **For existing users**, you'll still need to create profiles manually (Option 1 or 2)

## After Creating Profile

1. **Log out** if currently logged in
2. **Log in** with your email and password
3. **Should work now!**

## Make User Admin (Optional)

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

## Prevention

The auto-profile trigger (`sql/03_auto_create_profile_trigger.sql`) should automatically create profiles for NEW users. But for users created BEFORE the trigger was set up, you need to create profiles manually.

---

**Quickest Solution**: Run Option 1 - it takes 30 seconds!

