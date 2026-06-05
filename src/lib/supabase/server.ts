// src/lib/supabase/server.ts
// Supabase client server-side menggunakan SUPABASE_SERVICE_ROLE_KEY
// Dipakai di API routes — JANGAN dipakai di client components

import { createClient } from '@supabase/supabase-js';

/**
 * Membuat Supabase client dengan service role key.
 * Client ini memiliki akses penuh ke database (bypass RLS).
 * Hanya boleh digunakan di server-side (API routes, Server Components).
 */
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined');
  }
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
