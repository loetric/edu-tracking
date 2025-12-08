# Database Setup Options

## ⚠️ Important: Deployment Does NOT Touch Database

**The deployment process (npm run build, Vercel, Netlify, etc.) ONLY deploys your frontend code. It does NOT modify your Supabase database.**

Database setup is a **separate manual step** you must do in Supabase SQL Editor.

## 🎯 Your Options

### Option 1: Start Fresh (Recommended if no important data)

If you don't have important data, start completely fresh:

1. **Go to Supabase Dashboard → SQL Editor**
2. **Run `sql/00_reset_all.sql`** - This will DROP all existing tables
3. **Then run in order:**
   - `sql/01_clean_schema.sql` - Creates clean tables
   - `sql/02_clean_rls_policies.sql` - Sets up security
   - `sql/03_auto_create_profile_trigger.sql` - Auto-profile creation

**Result**: Clean, fresh database matching the code exactly.

### Option 2: Keep Existing Data (If you have data to preserve)

If you have existing data you want to keep:

1. **Go to Supabase Dashboard → SQL Editor**
2. **Skip `sql/00_reset_all.sql`** (don't run it!)
3. **Run `sql/migrate_existing_schema.sql`** - This adds missing columns without deleting data
4. **Then run:**
   - `sql/02_clean_rls_policies.sql` - Updates security policies
   - `sql/03_auto_create_profile_trigger.sql` - Sets up auto-profile creation

**Result**: Existing data preserved, new columns added.

### Option 3: Manual Cleanup (If you want control)

If you want to manually clean up specific tables:

1. **Go to Supabase Dashboard → Table Editor**
2. **Manually delete** tables you don't need
3. **Then run:**
   - `sql/01_clean_schema.sql` - Creates clean tables
   - `sql/02_clean_rls_policies.sql` - Sets up security
   - `sql/03_auto_create_profile_trigger.sql` - Auto-profile creation

## 📋 Step-by-Step: Fresh Start (Recommended)

### Step 1: Backup (Optional but Recommended)

If you want to be safe, export your data first:
1. Go to Supabase Dashboard → Table Editor
2. For each table, click "..." → "Export" → Save CSV files

### Step 2: Reset Database

1. Go to **Supabase Dashboard → SQL Editor**
2. Copy and paste contents of `sql/00_reset_all.sql`
3. Click **Run**
4. ✅ All tables will be deleted

### Step 3: Create Clean Schema

1. Still in SQL Editor
2. Copy and paste contents of `sql/01_clean_schema.sql`
3. Click **Run**
4. ✅ All tables created with correct structure

### Step 4: Set Up Security

1. Copy and paste contents of `sql/02_clean_rls_policies.sql`
2. Click **Run**
3. ✅ Security policies applied

### Step 5: Enable Auto-Profile Creation

1. Copy and paste contents of `sql/03_auto_create_profile_trigger.sql`
2. Click **Run**
3. ✅ New users will automatically get profiles

## 🔍 How to Check What You Have

Before deciding, check your current database:

```sql
-- See all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check if you have data
SELECT 
    'profiles' as table_name, COUNT(*) as row_count FROM profiles
UNION ALL
SELECT 'students', COUNT(*) FROM students
UNION ALL
SELECT 'settings', COUNT(*) FROM settings
UNION ALL
SELECT 'daily_records', COUNT(*) FROM daily_records;
```

## ✅ Recommendation

**If you're starting fresh or don't have important data:**
- Use **Option 1** (Fresh Start)
- Run `00_reset_all.sql` first
- Then run the setup scripts in order

**If you have existing data to keep:**
- Use **Option 2** (Migration)
- Skip `00_reset_all.sql`
- Run `migrate_existing_schema.sql` instead

## 🚨 Important Notes

1. **Deployment ≠ Database Setup**
   - Deploying code does NOT change your database
   - Database setup must be done manually in Supabase

2. **SQL Scripts Are Safe**
   - They use `CREATE TABLE IF NOT EXISTS` where possible
   - But `00_reset_all.sql` will DELETE everything!

3. **Backup First**
   - If unsure, export your data before running reset script
   - Better safe than sorry!

4. **Order Matters**
   - Run scripts in the order specified
   - Don't skip steps

## 🎯 Quick Decision Guide

**Choose Fresh Start if:**
- ✅ You're just starting
- ✅ You don't have important data
- ✅ You want a clean slate
- ✅ You want the simplest setup

**Choose Migration if:**
- ✅ You have existing users
- ✅ You have student data
- ✅ You have records you want to keep
- ✅ You want to preserve data

---

**My Recommendation**: If you're unsure, go with **Fresh Start (Option 1)** - it's cleaner and easier to set up correctly.


