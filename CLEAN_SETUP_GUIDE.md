# Clean Setup Guide - Fresh Start

This guide will help you set up a clean, best-practice database and codebase.

## 🎯 Goal

Create a clean, well-structured database and API that matches exactly, with no backward compatibility hacks.

## 📋 Prerequisites

- Supabase project created
- Environment variables set (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- No important data to preserve (we're starting fresh)

## 🚀 Step-by-Step Setup

### Step 1: Reset Database (Optional - Only if you want to delete everything)

1. Go to **Supabase Dashboard → SQL Editor**
2. Run `sql/00_reset_all.sql`
   - ⚠️ **WARNING**: This deletes ALL tables and data!
   - Only run if you're sure you want to start completely fresh

### Step 2: Create Clean Database Schema

1. Go to **Supabase Dashboard → SQL Editor**
2. Run `sql/01_clean_schema.sql`
   - Creates all tables with correct structure
   - Matches application code exactly
   - Includes proper constraints and indexes

### Step 3: Set Up Security Policies

1. Go to **Supabase Dashboard → SQL Editor**
2. Run `sql/02_clean_rls_policies.sql`
   - Sets up Row Level Security (RLS)
   - Configures access policies for all tables
   - Ensures proper security

### Step 4: Enable Auto-Profile Creation

1. Go to **Supabase Dashboard → SQL Editor**
2. Run `sql/03_auto_create_profile_trigger.sql`
   - Creates trigger to auto-create profiles when users sign up
   - Ensures every auth user gets a profile automatically

### Step 5: Replace API Code (Clean Version)

1. **API Code**: The `services/api.ts` file is already using the clean version

### Step 6: Verify Setup

1. Check tables exist:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

2. Check RLS is enabled:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   ```

3. Check trigger exists:
   ```sql
   SELECT trigger_name, event_object_table 
   FROM information_schema.triggers 
   WHERE trigger_schema = 'public';
   ```

## 📁 File Structure

```
sql/
├── 00_reset_all.sql              # Drop all tables (optional)
├── 01_clean_schema.sql           # Create clean database schema
├── 02_clean_rls_policies.sql     # Set up security policies
└── 03_auto_create_profile_trigger.sql  # Auto-create profiles

services/
└── api.ts                        # Clean API implementation
```

## ✅ What You Get

### Clean Database Schema
- ✅ All tables match code exactly
- ✅ Proper data types and constraints
- ✅ Indexes for performance
- ✅ Foreign key relationships
- ✅ RLS enabled on all tables

### Clean API Code
- ✅ No backward compatibility hacks
- ✅ Simple, readable code
- ✅ Matches database schema exactly
- ✅ Proper error handling
- ✅ Type-safe operations

### Security
- ✅ Row Level Security on all tables
- ✅ Proper access policies
- ✅ Admin-only operations protected
- ✅ Public read where needed (login)

## 🧪 Testing

After setup, test:

1. **Create a user** via registration form
2. **Check profile** was auto-created:
   ```sql
   SELECT * FROM profiles;
   ```
3. **Login** with username or email
4. **Verify** all features work

## 🔄 Migration from Old Schema

If you have existing data you want to keep:

1. **Don't run** `00_reset_all.sql`
2. Run `sql/migrate_existing_schema.sql` instead
3. This adds missing columns without deleting data
4. Then replace API code with clean version

## 📝 Next Steps

After clean setup:

1. Create your first admin user via registration
2. Set up school settings
3. Import students
4. Create schedule
5. Start using the system!

## 🆘 Troubleshooting

### "Table already exists" error
- Tables already exist - skip `01_clean_schema.sql`
- Or run `00_reset_all.sql` first (deletes everything)

### "Policy already exists" error
- Policies already exist - the script will drop and recreate them
- This is normal

### "Trigger already exists" error
- Trigger already exists - script will drop and recreate
- This is normal

### Login not working
- Check profile exists: `SELECT * FROM profiles WHERE email = 'your@email.com';`
- Check RLS policy allows public read: Run `02_clean_rls_policies.sql` again

## 📚 Documentation

- `CLEAN_SETUP_GUIDE.md` - This file
- `sql/01_clean_schema.sql` - Schema documentation in comments
- `sql/02_clean_rls_policies.sql` - Security policy documentation

## ✨ Benefits of Clean Setup

1. **No confusion** - Schema matches code exactly
2. **Better performance** - Proper indexes and constraints
3. **Easier maintenance** - Clean, simple code
4. **Better security** - Proper RLS policies
5. **Future-proof** - Easy to extend and modify

---

**Ready to start fresh?** Follow the steps above and you'll have a clean, professional setup! 🚀

