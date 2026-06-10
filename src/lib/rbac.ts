// src/lib/rbac.ts
// Helper RBAC — menentukan apakah user harus difilter seperti Tim_Quran
// Digunakan di API routes untuk data isolation

import type { NextRequest } from 'next/server';

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
