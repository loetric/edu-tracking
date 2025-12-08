# Create Admin User - Quick Guide

## Method 1: Create Admin from Existing Auth User (Easiest)

If you already created a user in Supabase Auth Dashboard:

1. **Go to Supabase SQL Editor**
2. **Run this** (replace email):

```sql
INSERT INTO profiles (id, username, email, name, role)
SELECT 
    au.id,
    'admin' as username,
    au.email,
    'System Administrator' as name,
    'admin' as role
FROM auth.users au
WHERE au.email = 'your-email@example.com'
    AND NOT EXISTS (
        SELECT 1 FROM profiles p WHERE p.id = au.id
    )
ON CONFLICT (id) DO UPDATE
SET role = 'admin';
```

3. **Done!** Now you can login with that email and password.

## Method 2: Create New Admin User (Complete)

### Step 1: Create Auth User

1. Go to **Supabase Dashboard → Authentication → Users**
2. Click **"Add User"**
3. Enter:
   - **Email**: `admin@yourdomain.com`
   - **Password**: (choose a strong password)
   - **Auto Confirm User**: ✅ (check this)
4. Click **"Create User"**

### Step 2: Create Profile

1. Go to **Supabase SQL Editor**
2. Run this (replace email):

```sql
INSERT INTO profiles (id, username, email, name, role)
SELECT 
    au.id,
    'admin' as username,
    au.email,
    'System Administrator' as name,
    'admin' as role
FROM auth.users au
WHERE au.email = 'admin@yourdomain.com';
```

3. **Done!** Login with the email and password you created.

## Method 3: Update Existing User to Admin

If you already have a profile but it's not admin:

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

## Verify Admin User

Check if admin user exists:

```sql
SELECT 
    username,
    email,
    name,
    role,
    CASE WHEN role = 'admin' THEN '✅ Admin' ELSE '❌ Not Admin' END as status
FROM profiles
WHERE email = 'your-email@example.com';
```

## Login Credentials

After creating admin:
- **Username**: The email you used
- **Password**: The password you set in Auth Dashboard
- **Role**: `admin` (full access)

## Troubleshooting

### "User already exists" error
- User already has a profile
- Just update role: `UPDATE profiles SET role = 'admin' WHERE email = '...';`

### "No rows returned" 
- Auth user doesn't exist
- Create auth user first (Method 2, Step 1)

### Can't login after creating profile
- Log out completely
- Log back in with email and password
- Check browser console for errors

---

**Quickest**: Use Method 1 if you already have an auth user!


