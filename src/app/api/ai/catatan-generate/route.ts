// src/app/api/ai/catatan-generate/route.ts
// POST: Generate catatan ustadz/ah otomatis menggunakan AI berdasarkan data tahfidz & tahsin siswa

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface HafalanRecord {
  tanggal: string;
  surah_juz: string;
  halaman: string;
  makhroj: string;
  tajwid: string;
  lancar: string;
  catatan: string;
}

interface TahsinRecord {
  tanggal: string;
  metode: string;
  makhroj: string;
  kelancaran: string;
  adab: string;
  buku: string;
  halaman: string;
  catatan: string;
}

interface AttendanceRecord {
  status: string;
}

interface StudentInfo {
  nama: string;
  gender: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Sesi tidak valid.' }, { status: 401 });
    }

    const body = await request.json();
    const { student_id, periode, tahun_ajaran, gender } = body;

    if (!student_id || typeof student_id !== 'string') {
      return NextResponse.json({ message: 'student_id wajib diisi.' }, { status: 400 });
    }

    const groqKey = process.env.GROQ_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!groqKey && !openaiKey) {
      return NextResponse.json(
        { message: 'API key AI belum dikonfigurasi. Set GROQ_API_KEY atau OPENAI_API_KEY di environment.' },
        { status: 500 }
      );
    }

    const supabase = createServerClient();

    // ── Ambil info siswa ─────────────────────────────────────────────────
    const { data: student } = await supabase
      .from('santri')
      .select('nama, gender')
      .eq('id', student_id)
      .maybeSingle();

    if (!student) {
      return NextResponse.json({ message: 'Siswa tidak ditemukan.' }, { status: 404 });
    }

    const genderResolved = gender || student.gender || 'Laki-laki';
    const panggilan = genderResolved === 'Perempuan' ? 'Kakak' : 'Abang';

    // ── Tentukan rentang tanggal semester ────────────────────────────────
    let startDate: string | null = null;
    let endDate: string | null = null;

    const { data: activeSemester } = await supabase
      .from('semester_settings')
      .select('semester_name, end_date')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeSemester) {
      endDate = activeSemester.end_date;
      const { data: prevSemesters } = await supabase
        .from('semester_settings')
        .select('end_date')
        .lt('end_date', endDate)
        .order('end_date', { ascending: false })
        .limit(1);

      if (prevSemesters && prevSemesters.length > 0) {
        const prevEndDate = new Date(prevSemesters[0].end_date);
        prevEndDate.setDate(prevEndDate.getDate() + 1);
        startDate = prevEndDate.toISOString().split('T')[0];
      }
    }

    // ── Fetch data hafalan ───────────────────────────────────────────────
    let hafalanQuery = supabase
      .from('hafalan')
      .select('tanggal, surah_juz, halaman, makhroj, tajwid, lancar, catatan')
      .eq('student_id', student_id);

    if (startDate) hafalanQuery = hafalanQuery.gte('tanggal', startDate);
    if (endDate) hafalanQuery = hafalanQuery.lte('tanggal', endDate);

    const { data: hafalanData } = await hafalanQuery.order('tanggal', { ascending: false });

    // ── Fetch data tahsin ────────────────────────────────────────────────
    let tahsinQuery = supabase
      .from('tahsin')
      .select('tanggal, metode, makhroj, kelancaran, adab, buku, halaman, catatan')
      .eq('student_id', student_id);

    if (startDate) tahsinQuery = tahsinQuery.gte('tanggal', startDate);
    if (endDate) tahsinQuery = tahsinQuery.lte('tanggal', endDate);

    const { data: tahsinData } = await tahsinQuery.order('tanggal', { ascending: false });

    // ── Fetch data absensi ───────────────────────────────────────────────
    let attendanceQuery = supabase
      .from('attendances')
      .select('status')
      .eq('student_id', student_id);

    if (startDate) attendanceQuery = attendanceQuery.gte('date', startDate);
    if (endDate) attendanceQuery = attendanceQuery.lte('date', endDate);

    const { data: attendanceData } = await attendanceQuery;

    // ── Hitung statistik ─────────────────────────────────────────────────
    // Filter: hanya ambil jurnal yang SUDAH DIBERI NILAI (ada minimal 1 nilai)
    const gradedHafalan = (hafalanData ?? []).filter(h => h.makhroj || h.tajwid || h.lancar);
    const gradedTahsin = (tahsinData ?? []).filter(t => t.makhroj || t.kelancaran || t.adab);

    const totalHafalanGraded = gradedHafalan.length;
    const totalTahsinGraded = gradedTahsin.length;

    // Surah unik yang sudah dinilai
    const uniqueSurahs = Array.from(new Set(gradedHafalan.map(h => h.surah_juz).filter(Boolean)));
    const surahList = uniqueSurahs.join(', ');

    // Rata-rata nilai tahfidz (hanya dari yang sudah dinilai)
    const gradeValues: number[] = [];
    for (const h of gradedHafalan) {
      for (const g of [h.makhroj, h.tajwid, h.lancar]) {
        if (!g) continue;
        if (g === '✓') gradeValues.push(100);
        else if (g === 'A') gradeValues.push(85);
        else if (g === 'B') gradeValues.push(70);
        else if (g === 'C') gradeValues.push(55);
        else if (g === 'D') gradeValues.push(40);
      }
    }

    const avgGrade = gradeValues.length > 0
      ? Math.round(gradeValues.reduce((a, b) => a + b, 0) / gradeValues.length)
      : 0;

    // Rata-rata nilai tahsin (hanya dari yang sudah dinilai)
    const tahsinGradeValues: number[] = [];
    for (const t of gradedTahsin) {
      for (const g of [t.makhroj, t.kelancaran, t.adab]) {
        if (!g) continue;
        if (g === '✓') tahsinGradeValues.push(100);
        else if (g === 'A') tahsinGradeValues.push(85);
        else if (g === 'B') tahsinGradeValues.push(70);
        else if (g === 'C') tahsinGradeValues.push(55);
        else if (g === 'D') tahsinGradeValues.push(40);
      }
    }

    const avgTahsinGrade = tahsinGradeValues.length > 0
      ? Math.round(tahsinGradeValues.reduce((a, b) => a + b, 0) / tahsinGradeValues.length)
      : 0;

    // Absensi
    const totalAbsensi = attendanceData?.length ?? 0;
    const hadir = attendanceData?.filter(a => a.status === 'Hadir').length ?? 0;
    const alfa = attendanceData?.filter(a => a.status === 'Tidak Hadir').length ?? 0;
    const pctKehadiran = totalAbsensi > 0 ? Math.round((hadir / totalAbsensi) * 100) : 0;

    // Metode tahsin yang digunakan (hanya dari yang sudah dinilai)
    const metodeList = Array.from(new Set(gradedTahsin.map(t => t.metode).filter(Boolean))).join(', ');

    // Buku tahsin terakhir (dari yang sudah dinilai)
    const bukuTahsin = gradedTahsin[0]?.buku ?? '-';

    // Catatan dari jurnal yang sudah dinilai
    const catatanHafalan = gradedHafalan.map(h => h.catatan).filter(Boolean);
    const catatanTahsin = gradedTahsin.map(t => t.catatan).filter(Boolean);
    const semuaCatatan = [...catatanHafalan, ...catatanTahsin].slice(0, 5).join('; ');

    // ── Build prompt untuk AI ────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt(panggilan);
    const userPrompt = buildUserPrompt({
      nama: student.nama,
      panggilan,
      periode: periode || activeSemester?.semester_name || '-',
      tahun_ajaran: tahun_ajaran || '-',
      surahList,
      totalHafalanGraded,
      totalTahsinGraded,
      avgGrade,
      avgTahsinGrade,
      totalAbsensi,
      hadir,
      alfa,
      pctKehadiran,
      metodeList,
      bukuTahsin,
      semuaCatatan,
      juzTerakhir: gradedHafalan[0]?.surah_juz ?? '-',
    });

    // ── Panggil AI ──────────────────────────────────────────────────────
    let catatan: string;
    if (openaiKey) {
      catatan = await callOpenAI(systemPrompt, userPrompt, openaiKey);
    } else {
      catatan = await callGroq(systemPrompt, userPrompt, groqKey!);
    }

    return NextResponse.json({
      catatan,
      meta: {
        nama: student.nama,
        panggilan,
        surah_dihafal: uniqueSurahs.length,
        total_hafalan_dinilai: totalHafalanGraded,
        total_tahsin_dinilai: totalTahsinGraded,
        avg_grade: avgGrade,
        avg_tahsin_grade: avgTahsinGrade,
        kehadiran: pctKehadiran,
      },
    }, { status: 200 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ai/catatan-generate] Error:', msg);
    return NextResponse.json(
      { message: `Gagal generate catatan: ${msg}` },
      { status: 500 }
    );
  }
}

// ─── System Prompt ──────────────────────────────────────────────────────────

function buildSystemPrompt(panggilan: string): string {
  return `Kamu adalah ustadz/ah pengajar Al-Quran di sekolah tahfidz. Tugasmu menulis catatan perkembangan siswa dalam format narasi pendek (3-5 kalimat) yang profesional, hangat, dan memotivasi.

ATURAN PENTING:
- Panggil siswa dengan sebutan "${panggilan}" di dalam catatan
- Tulis dalam Bahasa Indonesia yang baik dan benar
- Sebutkan capaian hafalan (surah yang sudah dihafal) dan progress tahsin
- Sertakan informasi kehadiran jika relevan
- Berikan motivasi atau doa di akhir catatan
- JANGAN gunakan format markdown, cukup tulis narasi biasa
- JANGAN tambahkan penjelasan seperti "Berikut adalah catatan..." atau "Catatan untuk raport:"
- Langsung tulis catatannya saja
- Panjang catatan: 3-5 kalimat, tidak lebih
- Gunakan nada bicara yang positif dan membangun, bahkan jika ada kritik sampaikan dengan santun`;
}

// ─── User Prompt Builder ───────────────────────────────────────────────────

function buildUserPrompt(data: {
  nama: string;
  panggilan: string;
  periode: string;
  tahun_ajaran: string;
  surahList: string;
  totalHafalanGraded: number;
  totalTahsinGraded: number;
  avgGrade: number;
  avgTahsinGrade: number;
  totalAbsensi: number;
  hadir: number;
  alfa: number;
  pctKehadiran: number;
  metodeList: string;
  bukuTahsin: string;
  semuaCatatan: string;
  juzTerakhir: string;
}): string {
  return `Buatkan catatan ustadz/ah untuk siswa berikut:

Nama: ${data.nama} (${data.panggilan})
Periode: ${data.periode}
Tahun Ajaran: ${data.tahun_ajaran}

=== CAPAIAN TAHFIDZ (hanya yang sudah dinilai) ===
Surah yang sudah dinilai: ${data.surahList || 'Belum ada penilaian'}
Total sesi hafalan dinilai: ${data.totalHafalanGraded}
Rata-rata nilai tahfidz: ${data.avgGrade} (skala 100)
Juz terakhir: ${data.juzTerakhir}

=== CAPAIAN TAHSIN (hanya yang sudah dinilai) ===
Metode: ${data.metodeList || '-'}
Buku: ${data.bukuTahsin}
Total sesi tahsin dinilai: ${data.totalTahsinGraded}
Rata-rata nilai tahsin: ${data.avgTahsinGrade} (skala 100)

=== KEHADIRAN ===
Total hari: ${data.totalAbsensi}
Hadir: ${data.hadir} (${data.pctKehadiran}%)
Tidak Hadir/Alfa: ${data.alfa}

=== CATATAN DARI JURNAL ===
${data.semuaCatatan || 'Tidak ada catatan tambahan'}

Tulis catatan ustadz/ah untuk "${data.panggilan}" ini dalam 3-5 kalimat narasi.
Fokus pada capaian yang SUDAH DINILAI saja, jangan sebutkan yang belum ada nilainya.`;
}

// ─── Groq API Call ─────────────────────────────────────────────────────────

const GROQ_MODELS = ['llama-3.1-8b-instant', 'gemma2-9b-it', 'llama3-8b-8192'];

async function callGroq(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<string> {
  for (let attempt = 0; attempt < GROQ_MODELS.length; attempt++) {
    const model = GROQ_MODELS[attempt];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 512,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.status === 429) {
        const waitMs = (attempt + 1) * 3000;
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`Groq API error ${res.status}: ${errBody.slice(0, 100)}`);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) throw new Error('Groq tidak menghasilkan konten.');
      return content.trim();

    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error('Semua model Groq mencapai rate limit. Coba lagi dalam beberapa saat.');
}

// ─── OpenAI API Call ───────────────────────────────────────────────────────

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 512,
      temperature: 0.7,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI API error ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() ?? '';
}
