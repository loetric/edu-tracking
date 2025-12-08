# How to Change User Role to Admin

## Problem
You created a user in Supabase and can log in, but they don't have admin role to manage the system.

## Solution: Update Role in Database

### Method 1: Using Supabase SQL Editor (Recommended)

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy and paste this SQL (replace the email with your user's email):

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

3. Click **Run**
4. Verify it worked:
```sql
SELECT id, username, email, name, role 
FROM profiles 
WHERE email = 'your-email@example.com';
```

You should see `role = 'admin'` in the results.

### Method 2: Using Supabase Table Editor

1. Go to **Supabase Dashboard** → **Table Editor**
2. Select the `profiles` table
3. Find your user (search by email or username)
4. Click on the row to edit
5. Change the `role` field from `teacher` (or `null`) to `admin`
6. Click **Save**

### Method 3: Update Multiple Users

If you need to make multiple users admin:

```sql
-- Make multiple users admin by email
UPDATE profiles 
SET role = 'admin' 
WHERE email IN ('user1@example.com', 'user2@example.com');

-- Or make all existing users admin (use with caution!)
-- UPDATE profiles SET role = 'admin';
```

## Available Roles

The system supports these roles:
- `'admin'` - Full access to all features
- `'counselor'` - Access to counselor features
- `'teacher'` - Basic teacher access
- `null` - Limited access

## After Updating

1. **Log out** from the system (if currently logged in)
2. **Log back in** with the updated account
3. You should now see admin features in the sidebar and have full access

## Verify Admin Access

After logging in, you should see:
- Settings tab in sidebar
- Ability to manage users
- Ability to update schedule
- All admin features enabled

## Troubleshooting

### Role not updating
- Make sure you're updating the `profiles` table, not `auth.users`
- Check that the email/username matches exactly
- Refresh the page and log out/in again

### Still can't access admin features
- Check browser console for errors
- Verify the role was actually updated in the database
- Make sure you logged out and back in after the change

## Quick Reference

```sql
-- Check current role
SELECT email, username, role FROM profiles WHERE email = 'your-email@example.com';

-- Set to admin
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';

-- Set to teacher
UPDATE profiles SET role = 'teacher' WHERE email = 'your-email@example.com';

-- Set to counselor
UPDATE profiles SET role = 'counselor' WHERE email = 'your-email@example.com';
```


