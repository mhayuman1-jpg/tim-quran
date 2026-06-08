import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Membuat Supabase Server Client dengan error handling
 * Digunakan di API routes untuk server-side operations
 */
export async function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
  }

  const cookieStore = cookies();
  
  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    });
    
    return supabase;
  } catch (error: any) {
    console.error('[Supabase Server Client] Failed to create client:', error);
    throw new Error(`Failed to initialize Supabase client: ${error.message}`);
  }
}

/**
 * Helper untuk menjalankan query Supabase dengan retry logic
 * Menangani ENOTFOUND errors dengan exponential backoff
 */
export async function executeSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  maxRetries = 3,
  delayMs = 1000
): Promise<{ data: T | null; error: any }> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await queryFn();
      
      // Jika ada error dari Supabase API, return langsung
      if (result.error) {
        return result;
      }
      
      return result;
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a DNS/connection error
      const isDnsError = 
        error.message?.includes('ENOTFOUND') ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('ECONNRESET') ||
        error.code?.includes('ENOTFOUND');

      if (isDnsError && attempt < maxRetries - 1) {
        // Wait before retrying dengan exponential backoff
        const waitTime = delayMs * Math.pow(2, attempt);
        console.warn(
          `[Supabase Query] Connection error on attempt ${attempt + 1}/${maxRetries}. ` +
          `Retrying in ${waitTime}ms...`,
          error.message
        );
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      // Jika bukan DNS error atau sudah maksimal retries
      if (!isDnsError) {
        // Jika error bukan DNS, langsung throw
        console.error(`[Supabase Query] Non-recoverable error:`, error);
        throw error;
      }
    }
  }

  // Semua retries gagal
  console.error(
    `[Supabase Query] Failed after ${maxRetries} attempts:`,
    lastError?.message
  );
  
  throw new Error(
    `Database connection failed after ${maxRetries} retries. ` +
    `Error: ${lastError?.message || 'Unknown error'}`
  );
}
