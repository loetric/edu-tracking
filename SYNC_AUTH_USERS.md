# Sync Auth Users to Profiles

## Problem

When you create a user directly in Supabase Auth Dashboard, it only creates an entry in `auth.users` table. However, the application also needs a corresponding entry in the `profiles` table to work properly.

## Solution

You have two options to sync existing auth users with profiles:

### Option 1: Run SQL Script (Recommended - Fastest)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `sql/sync_existing_auth_users.sql`
4. Click **Run**
5. This will automatically create profiles for all users in `auth.users` that don't have profiles

### Option 2: Run Node.js Script

1. Set environment variables:
   ```bash
   export SUPABASE_URL=your_supabase_url
   export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

   Or create a `.env` file:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. Run the script:
   ```bash
   node scripts/sync_auth_users_to_profiles.js
   ```

## Setting Up Auto-Create Trigger (For Future Users)

To automatically create profiles when new users are created in Supabase Auth:

1. Go to Supabase Dashboard → SQL Editor
2. Run `sql/auto_create_profile.sql`
3. This creates a trigger that automatically creates a profile whenever a new user is added to `auth.users`

## How It Works

- **Username**: Generated from email (part before @) or `user_` + first 8 chars of UUID
- **Email**: Uses the email from auth.users
- **Name**: Uses `user_metadata.full_name` or `user_metadata.name` or email username
- **Role**: Uses `user_metadata.role` or defaults to `'teacher'`

## After Syncing

After running the sync, users should be able to:
- Login with their email and password
- Login with their username (if it matches the generated username)
- Have the correct role assigned

## Manual Profile Creation

If you need to create a profile manually for a specific user:

```sql
INSERT INTO public.profiles(id, username, email, name, role, avatar)
VALUES (
  'user-uuid-from-auth-users',
  'desired_username',
  'user@example.com',
  'User Name',
  'admin', -- or 'teacher', 'counselor'
  null
);
```

## Troubleshooting

### User still can't login after syncing

1. Check if profile was created:
   ```sql
   SELECT * FROM profiles WHERE email = 'user@example.com';
   ```

2. Try logging in with email instead of username

3. Check browser console for errors

### Username conflict

If you get a username conflict error, the script will automatically append a unique suffix to the username.

### Need to change user role

Update the profile directly:
```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'user@example.com';
```


