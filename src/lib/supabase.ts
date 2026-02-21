// src/lib/supabase.ts

import { createBrowserClient } from '@supabase/ssr';

// These values come from .env.local
// If they're undefined, the app will crash here with a clear error
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    '❌ Missing Supabase environment variables!\n' +
    'Make sure .env.local exists at the project root (next to package.json)\n' +
    'and contains NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.\n' +
    'Then RESTART the dev server (Ctrl+C → npm run dev).'
  );
}

export const supabase = createBrowserClient(supabaseUrl, supabaseKey);