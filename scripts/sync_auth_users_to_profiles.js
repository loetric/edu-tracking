#!/usr/bin/env node
// Script to sync Supabase Auth users with profiles table
// This creates profiles for users that exist in auth.users but not in profiles
// Usage: set environment variables SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then run:
//   node scripts/sync_auth_users_to_profiles.js

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const run = async () => {
  try {
    console.log('Fetching all auth users...');
    
    // Get all auth users (requires service role key)
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
      process.exit(1);
    }

    if (!users || users.length === 0) {
      console.log('No users found in auth.users');
      return;
    }

    console.log(`Found ${users.length} users in auth.users`);

    // Get existing profiles
    const { data: existingProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id');

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      process.exit(1);
    }

    const existingProfileIds = new Set((existingProfiles || []).map(p => p.id));
    console.log(`Found ${existingProfileIds.size} existing profiles`);

    const created = [];
    const skipped = [];

    for (const user of users) {
      if (existingProfileIds.has(user.id)) {
        skipped.push(user.email || user.id);
        continue;
      }

      // Generate username from email or use a default
      const email = user.email || `${user.id}@example.local`;
      const username = user.email 
        ? email.split('@')[0] 
        : `user_${user.id.substring(0, 8)}`;
      
      // Get name from metadata or email
      const name = user.user_metadata?.full_name 
        || user.user_metadata?.name 
        || email.split('@')[0];

      // Determine role from metadata or default to 'teacher'
      const role = user.user_metadata?.role || 'teacher';

      console.log(`Creating profile for ${email} (username: ${username}, role: ${role})`);

      const profile = {
        id: user.id,
        username: username,
        email: email,
        name: name,
        role: role,
        avatar: user.user_metadata?.avatar_url || null
      };

      const { error: insertError } = await supabase
        .from('profiles')
        .insert([profile]);

      if (insertError) {
        // If username conflict, try with a unique suffix
        if (insertError.code === '23505') { // Unique violation
          const uniqueUsername = `${username}_${user.id.substring(0, 8)}`;
          profile.username = uniqueUsername;
          const { error: retryError } = await supabase
            .from('profiles')
            .insert([profile]);
          
          if (retryError) {
            console.error(`Failed to create profile for ${email}:`, retryError);
            continue;
          }
          console.log(`Created profile with unique username: ${uniqueUsername}`);
        } else {
          console.error(`Failed to create profile for ${email}:`, insertError);
          continue;
        }
      }

      created.push({
        email: email,
        username: profile.username,
        role: role,
        name: name
      });
    }

    console.log('\n=== Summary ===');
    console.log(`Created ${created.length} new profiles`);
    console.log(`Skipped ${skipped.length} users (profiles already exist)`);
    
    if (created.length > 0) {
      console.log('\nCreated profiles:');
      created.forEach(p => {
        console.log(`  - ${p.email} (username: ${p.username}, role: ${p.role})`);
      });
    }

    console.log('\nSync complete!');
  } catch (err) {
    console.error('Sync error:', err);
    process.exit(1);
  }
};

run();


