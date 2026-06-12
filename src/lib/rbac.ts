// src/lib/rbac.ts
// Helper RBAC — menentukan apakah user harus difilter seperti Tim_Quran
// Digunakan di API routes untuk data isolation

import type { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Cek apakah request berasal dari mode mengajar.
 * Header `x-view-mode: teaching` dikirim frontend saat Kabid/Sekretaris
 * beralih ke Mode Mengajar.
 */
export function isTeachingMode(request: NextRequest): boolean {
  return request.headers.get('x-view-mode') === 'teaching';
}

/**
 * Cek apakah user harus melihat hanya data siswa yang diampu.
 * true jika:
 *   - role === 'Tim_Quran', ATAU
 *   - role === 'Kabid'/'Sekretaris' DAN sedang dalam mode mengajar
 */
export function shouldFilterByTeacher(
  role: string | undefined,
  request: NextRequest
): boolean {
  if (role === 'Tim_Quran') return true;
  if ((role === 'Kabid' || role === 'Sekretaris') && isTeachingMode(request)) return true;
  return false;
}

/**
 * Ambil ID guru yang sedang aktif untuk filter data.
 * - Tim_Quran: selalu return session user ID
 * - Kabid/Sekretaris di mode mengajar: gunakan header `x-view-as-teacher-id`
 *   (ID guru yang dipilih saat role-select)
 * - Selainnya: return session user ID
 */
export function getTeacherFilterId(
  role: string | undefined,
  request: NextRequest,
  sessionUserId: string
): string {
  if (role === 'Tim_Quran') return sessionUserId;
  if ((role === 'Kabid' || role === 'Sekretaris') && isTeachingMode(request)) {
    const viewAsId = request.headers.get('x-view-as-teacher-id');
    if (viewAsId && viewAsId !== 'null' && viewAsId !== 'undefined') {
      return viewAsId;
    }
  }
  return sessionUserId;
}

/**
 * Ambil ID kelas yang diampu oleh guru tertentu.
 * Mencari di kolom teacher1_id, teacher2_id, teacher3_id pada tabel classes.
 */
export async function getTeacherClassIds(
  supabase: SupabaseClient,
  teacherId: string
): Promise<string[]> {
  const { data } = await supabase
    .from('classes')
    .select('id')
    .or(`teacher1_id.eq.${teacherId},teacher2_id.eq.${teacherId},teacher3_id.eq.${teacherId}`);
  return (data ?? []).map((c: any) => c.id);
}

/**
 * Terapkan filter data isolation pada query santri.
 * - Tanpa classId: assigned_teacher_id = teacherId ATAU class_id IN kelas yang diampu
 * - Dengan classId (strict): hanya assigned_teacher_id = teacherId
 *   (guru hanya melihat siswa yang DIJARINYA di kelas tersebut, bukan semua siswa)
 */
export function applyTeacherSantriFilter(
  query: any,
  teacherId: string,
  classIds: string[],
  classId?: string | null
) {
  if (classId) {
    // Strict: di kelas tertentu, hanya siswa yang assigned ke guru ini
    return query.eq('assigned_teacher_id', teacherId);
  }
  // Umum: siswa yang assigned ATAU berada di kelas yang diampu
  if (classIds.length > 0) {
    return query.or(`assigned_teacher_id.eq.${teacherId},class_id.in.(${classIds.join(',')})`);
  }
  return query.eq('assigned_teacher_id', teacherId);
}
