# Troubleshoot Login Issue

## Quick Checks

### 1. Check Browser Console
Open browser DevTools (F12) → Console tab
Look for errors when you try to login

### 2. Verify Profile Query Works
Run in Supabase SQL Editor:

```sql
-- This simulates what login does
SELECT email
FROM profiles
WHERE username = 'admin'
LIMIT 1;
```

Should return: `admin@admin.local`

### 3. Test Direct Email Login
Try logging in with:
- **Email**: `admin@admin.local` (not username)
- **Password**: Your password

### 4. Check Password
- Make sure you're using the correct password
- Try resetting password in Supabase Dashboard → Authentication → Users

### 5. Verify RLS Policy
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'profiles';
```

Should show: `"Public can select profiles for login"` with `cmd = SELECT`

## Common Issues

### Issue: Profile query returns null
**Fix**: RLS policy not allowing public read
```sql
CREATE POLICY "Public can select profiles for login" ON profiles
    FOR SELECT USING (true);
```

### Issue: Password incorrect
**Fix**: Reset password in Supabase Dashboard

### Issue: Email not confirmed
**Fix**: In Supabase Dashboard → Authentication → Users, ensure email is confirmed

### Issue: IDs don't match
**Fix**: Profile ID must match auth.users ID exactly

## Debug Steps

1. **Check browser console** for JavaScript errors
2. **Check Network tab** for failed API calls
3. **Run diagnostic query** (`sql/diagnose_login_issue.sql`)
4. **Try email instead of username** in login form
5. **Verify password** is correct

