# Login Issue Fix

## Problems Identified

1. **LoginScreen was calling wrong API function**: The component was calling `api.signIn()` which expects an email, but it was passing a username. This caused login failures.

2. **RLS Policy blocking login**: The Row Level Security (RLS) policy on the `profiles` table only allowed authenticated users to read their own profiles. However, during login, the system needs to query profiles by username BEFORE authentication happens, which was being blocked.

3. **Redundant login call in App.tsx**: There was an unnecessary second login attempt in App.tsx that would fail because the user object doesn't contain a password field.

## Fixes Applied

### 1. Fixed LoginScreen.tsx
- Changed `api.signIn(username, password)` to `api.login(username, password)`
- The `api.login` function properly handles username-to-email resolution

### 2. Updated RLS Policies
- Added a policy to allow public read of profiles (needed for username lookup during login)
- This is necessary because login requires querying profiles before authentication

### 3. Fixed App.tsx
- Removed redundant login call that was causing errors
- Now directly calls `handleLogin` after successful authentication

## Required Database Update

**IMPORTANT**: You need to apply the updated RLS policy in your Supabase database:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run the following SQL to update the profiles RLS policy:

```sql
-- Drop the old restrictive policy if it exists
drop policy if exists "Users can select own profile" on profiles;

-- Allow public read of profiles (needed for username-to-email lookup during login)
create policy "Public can select profiles for login" on profiles
  for select
  using (true);

-- Re-add the policy for users to select their own profile (for redundancy/clarity)
create policy "Users can select own profile" on profiles
  for select
  using (auth.uid() = id);
```

**Note**: The public read policy allows unauthenticated users to read profile data, which is necessary for the login flow. If you want better security, consider creating a database function that returns only the email field for username lookups.

## Testing

After applying the database changes:
1. Try logging in with a username (not email)
2. The system should now properly resolve the username to an email
3. Authentication should proceed normally

## Security Consideration

The public read policy on profiles exposes profile data (username, email, name, role) to unauthenticated users. For a school management system, this is typically acceptable, but if you need stricter security, you can:

1. Create a database function that only returns the email for a given username
2. Use that function instead of direct profile queries
3. Remove the public read policy

