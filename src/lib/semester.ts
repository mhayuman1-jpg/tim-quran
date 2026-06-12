// src/lib/semester.ts
// Shared helper untuk cek apakah ada semester aktif.
// Digunakan di semua API routes yang melakukan penulisan data.

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Mengecek apakah ada semester aktif di database.
 * Mengembalikan { active: boolean, error?: NextResponse }.
 *
 * Cara pakai di API route:
 *   const supabase = createServerClient();
 *   const semesterCheck = await requireActiveSemester(supabase);
 *   if (semesterCheck.error) return semesterCheck.error;
 */
export async function requireActiveSemester(supabase: SupabaseClient): Promise<{ active: boolean; error?: Response }> {
  const { data, error } = await supabase
    .from('semester_settings')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[semester] Error checking active semester:', error);
    return {
      active: false,
      error: new Response(
        JSON.stringify({ message: 'Gagal memeriksa status semester.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  if (!data) {
    return {
      active: false,
      error: new Response(
        JSON.stringify({ message: 'Tidak ada semester aktif. Silakan aktifkan semester terlebih dahulu.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  return { active: true };
}
