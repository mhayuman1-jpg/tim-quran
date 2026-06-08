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

  try {
    const client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    
    return client;
  } catch (error) {
    console.error('[Supabase Server] Failed to create client:', error);
    throw new Error(`Failed to initialize Supabase server client: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Helper untuk menjalankan query Supabase dengan retry logic
 * Menangani DNS/connection errors dengan exponential backoff
 */
export async function withRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  maxRetries = 3,
  delayMs = 1000
): Promise<{ data: T | null; error: any }> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await queryFn();
      
      if (result.error) {
        return result;
      }
      
      return result;
    } catch (error: any) {
      lastError = error;
      
      const isDnsError = 
        error.message?.includes('ENOTFOUND') ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('ECONNRESET') ||
        error.message?.includes('fetch failed') ||
        error.code?.includes('ENOTFOUND');

      if (isDnsError && attempt < maxRetries - 1) {
        const waitTime = delayMs * Math.pow(2, attempt);
        console.warn(
          `[Supabase] Connection error on attempt ${attempt + 1}/${maxRetries}. ` +
          `Retrying in ${waitTime}ms...`,
          error.message
        );
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (!isDnsError) {
        throw error;
      }
    }
  }

  console.error(
    `[Supabase] Failed after ${maxRetries} attempts:`,
    lastError?.message
  );
  
  throw lastError;
}
