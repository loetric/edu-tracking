# Deployment Checklist

## ⚠️ Pre-Deployment Requirements

### 1. Database Setup (CRITICAL)
- [ ] Run `sql/00_reset_all.sql` (if starting fresh) OR
- [ ] Run `sql/01_clean_schema.sql` (if keeping data)
- [ ] Run `sql/02_clean_rls_policies.sql`
- [ ] Run `sql/03_auto_create_profile_trigger.sql`
- [ ] Verify all tables exist in Supabase
- [ ] Verify RLS policies are active

### 2. Code Cleanup (REQUIRED)
- [ ] **API Code**: Already using clean version (`services/api.ts`)
- [ ] Verify no linter errors: `npm run build`
- [ ] Test locally: `npm run dev`

### 3. Environment Variables (REQUIRED)
Create `.env.local` or set in deployment platform:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key (optional)
```

**For Production:**
- Set these in your hosting platform (Vercel, Netlify, etc.)
- Never commit `.env.local` to git

### 4. Build & Test
- [ ] Run `npm install` to ensure dependencies are installed
- [ ] Run `npm run build` - should complete without errors
- [ ] Test build locally: `npm run preview`
- [ ] Verify all features work in preview

### 5. Supabase Configuration
- [ ] Verify Supabase project is active
- [ ] Check API keys are correct
- [ ] Test authentication works
- [ ] Verify RLS policies allow necessary operations

### 6. First User Setup
- [ ] Create first admin user via registration form
- [ ] Or create manually in Supabase Auth + update profile role to 'admin'
- [ ] Test login with admin account
- [ ] Verify admin can access all features

## 🚀 Deployment Steps

### Option 1: Vercel (Recommended)
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY` (optional)
4. Deploy

### Option 2: Netlify
1. Push code to GitHub
2. Connect repository to Netlify
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variables in Netlify dashboard
6. Deploy

### Option 3: Other Platforms
- Build command: `npm run build`
- Output directory: `dist`
- Node version: 18+ or 20+
- Add environment variables as needed

## ✅ Post-Deployment Verification

- [ ] Application loads without errors
- [ ] Can access login page
- [ ] Can register new school/admin
- [ ] Can login with created account
- [ ] Admin features are accessible
- [ ] Can import students
- [ ] Can create schedule
- [ ] Can save daily records
- [ ] All features work as expected

## 🔧 Troubleshooting

### Build Fails
- Check Node version (18+)
- Run `npm install` again
- Check for TypeScript errors
- Verify all imports are correct

### Environment Variables Not Working
- Verify variable names start with `VITE_`
- Restart dev server after adding variables
- Check deployment platform has variables set
- Rebuild after adding variables

### Database Errors
- Verify SQL scripts were run in order
- Check RLS policies are correct
- Verify Supabase project is active
- Check API keys are correct

### Login Not Working
- Check profile exists: `SELECT * FROM profiles WHERE email = '...'`
- Verify RLS policy allows public read of profiles
- Check browser console for errors
- Verify Supabase Auth is enabled

## 📝 Current Status

### ✅ Ready:
- Clean database schema scripts
- Clean API code (api.ts)
- Build configuration
- TypeScript setup
- Dependencies installed

### ⚠️ Action Required:
- [ ] **Replace api.ts with clean version** (CRITICAL)
- [ ] **Run database setup scripts** (CRITICAL)
- [ ] **Set environment variables** (CRITICAL)
- [ ] **Test build** (REQUIRED)

## 🎯 Quick Deploy Command

After completing checklist:

```bash
# 1. API code is already clean

# 2. Build
npm run build

# 3. Deploy (example for Vercel)
vercel --prod
```

## 📚 Documentation Files

- `CLEAN_SETUP_GUIDE.md` - Database setup guide
- `DEPLOYMENT_CHECKLIST.md` - This file
- `sql/01_clean_schema.sql` - Database schema
- `sql/02_clean_rls_policies.sql` - Security policies

---

**Status**: ⚠️ **NOT READY** - Complete the action items above first!

