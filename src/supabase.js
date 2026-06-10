// ============================================================
// SUPABASE CONFIGURATION
// ============================================================
// Set these in your Vercel project dashboard under
// Settings → Environment Variables:
//   VITE_SUPABASE_URL     = your project URL
//   VITE_SUPABASE_ANON_KEY = your project anon/public key
// Both values are found in Supabase: Settings → API
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
