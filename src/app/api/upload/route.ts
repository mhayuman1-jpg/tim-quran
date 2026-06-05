// src/app/api/upload/route.ts
// POST: Upload gambar ke Supabase Storage
// Query params:
//   - bucket: nama bucket (default: "assets")
//   - folder: subfolder dalam bucket (misal: "logo", "siswa", "artikel")
// Returns: { url: string } — public URL gambar

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export async function POST(request: NextRequest) {
  // Auth check
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: 'Sesi tidak valid.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get('bucket') || 'assets';
    const folder = searchParams.get('folder') || 'uploads';

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ message: 'File wajib diunggah.' }, { status: 400 });
    }

    // Validasi tipe file
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({
        message: 'Format tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.',
      }, { status: 400 });
    }

    // Validasi ukuran
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({
        message: `Ukuran file maksimal ${MAX_SIZE_MB}MB.`,
      }, { status: 400 });
    }

    const supabase = createServerClient();

    // Generate nama file unik: folder/timestamp-random.ext
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // Convert ke ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload ke Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      // Jika bucket tidak ada, beri pesan yang jelas
      if (uploadError.message?.includes('not found') || uploadError.message?.includes('does not exist')) {
        return NextResponse.json({
          message: `Bucket "${bucket}" tidak ditemukan. Buat bucket terlebih dahulu di Supabase Dashboard → Storage.`,
        }, { status: 500 });
      }
      return NextResponse.json({ message: 'Gagal mengunggah file.', detail: uploadError.message }, { status: 500 });
    }

    // Dapatkan public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl, fileName }, { status: 201 });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
