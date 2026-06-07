import { NextRequest, NextResponse } from 'next/server';

const UNLOCK_CODE = process.env.NEXT_PUBLIC_AUTH_UNLOCK_CODE || 'timquran321';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { message: 'Kode akses wajib diisi.' },
        { status: 400 }
      );
    }

    if (code !== UNLOCK_CODE) {
      return NextResponse.json(
        { message: 'Kode akses salah.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { message: 'Kode akses benar. Akses diberikan.' },
      { status: 200 }
    );
  } catch (err) {
    console.error('[verify-code]', err);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
