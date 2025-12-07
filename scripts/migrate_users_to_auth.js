#!/usr/bin/env node
// Migration script: create Supabase Auth users from legacy `users` table and insert into `profiles`.
// Usage: set environment variables SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then run:
//   node scripts/migrate_users_to_auth.js

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const run = async () => {
  try {
    // Fetch legacy users
    const { data: users, error } = await supabase.from('users').select('*');
    if (error) throw error;
    if (!users || users.length === 0) {
      console.log('No users found in legacy `users` table.');
      return;
    }

    const migrated = [];

    for (const u of users) {
      // Ensure we have an email (fallback to placeholder)
      const email = u.email || `${u.username}@example.local`;
      const password = u.password || Math.random().toString(36).slice(-10);

      console.log(`Creating auth user for ${u.username} <${email}>`);

      // Create auth user via admin API
      const res = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        user_metadata: { name: u.name }
      });
      if (res.error) {
        console.error('Failed to create auth user for', u.username, res.error);
        continue;
      }
      const created = res.data.user;

      // Insert into profiles table
      const profile = {
        id: created.id,
        username: u.username,
        email: email,
        name: u.name,
        role: u.role || null
      };
      const { error: pErr } = await supabase.from('profiles').insert([profile]);
      if (pErr) {
        console.error('Failed to insert profile for', u.username, pErr);
      } else {
        console.log('Created profile for', u.username);
        migrated.push({ username: u.username, email, password, created_at: new Date().toISOString() });
      }
    }

    // Write migrated accounts to CSV
    if (migrated.length > 0) {
      const csvPath = path.resolve(process.cwd(), 'migrated_accounts.csv');
      const header = 'username,email,password,created_at\n';
      const rows = migrated.map(r => `${r.username},${r.email},${r.password},${r.created_at}`).join('\n');
      fs.writeFileSync(csvPath, header + rows, { encoding: 'utf8' });
      console.log(`Wrote ${migrated.length} migrated accounts to ${csvPath}`);
    } else {
      console.log('No accounts migrated.');
    }

    console.log('Migration complete. Rotate your service_role key after running this script.');
  } catch (err) {
    console.error('Migration error', err);
    process.exit(1);
  }
};

run();
