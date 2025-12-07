import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error('Missing Supabase env for reset endpoint');
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Missing email' });

    // Use Supabase client to send a password reset email
    // This uses the anon key and relies on your project's email templates being configured
    const { data, error } = await (supabase.auth as any).resetPasswordForEmail(email);

    if (error) {
      console.error('Supabase reset error', error);
      return res.status(500).json({ error: 'Failed to request password reset' });
    }

    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error('reset-password handler error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
