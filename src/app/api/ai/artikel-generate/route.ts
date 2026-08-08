// src/app/api/ai/artikel-generate/route.ts
// POST: Generate artikel lengkap menggunakan AI berdasarkan topik dan instruksi pengguna

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Sesi tidak valid.' }, { status: 401 });
    }

    const body = await request.json();
    const { topik, instruksi, gaya, panjang } = body;

    if (!topik || typeof topik !== 'string' || !topik.trim()) {
      return NextResponse.json({ message: 'Topik artikel wajib diisi.' }, { status: 400 });
    }

    const opencodeKey = process.env.OPENCODE_API_KEY;

    if (!opencodeKey) {
      return NextResponse.json(
        { message: 'API key AI belum dikonfigurasi.' },
        { status: 500 }
      );
    }

    const systemPrompt = buildSystemPrompt(gaya, panjang);
    const userPrompt = buildUserPrompt(topik, instruksi);

    const result = await callOpenCode(systemPrompt, userPrompt, opencodeKey);

    const html = markdownToHtml(result);

    return NextResponse.json({ html }, { status: 200 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ai/artikel-generate] Error:', msg);
    return NextResponse.json(
      { message: `Gagal generate artikel: ${msg}` },
      { status: 500 }
    );
  }
}

// ─── System Prompt ──────────────────────────────────────────────────────────

function buildSystemPrompt(gaya?: string, panjang?: string): string {
  const base =
    'Kamu adalah penulis artikel profesional berbahasa Indonesia untuk website lembaga pendidikan tahfidz Al-Quran. ' +
    'Tugasmu menulis artikel lengkap, informatif, dan menarik. ' +
    'Format output menggunakan Markdown: gunakan ## untuk heading utama, ### untuk sub-heading, ' +
    '**teks** untuk bold, *teks* untuk italic, dan baris baru antar paragraf. ' +
    'Gunakan bullet list (-) atau numbered list (1.) jika diperlukan. ' +
    'JANGAN tambahkan penjelasan seperti "Berikut adalah artikel..." di awal. ' +
    'Langsung mulai dengan judul artikel (heading #) lalu isi kontennya.';

  let instructions = base;

  // Gaya penulisan
  if (gaya === 'formal') {
    instructions += ' Gunakan bahasa Indonesia formal dan baku yang cocok untuk publikasi resmi.';
  } else if (gaya === 'santai') {
    instructions += ' Gunakan bahasa Indonesia yang santai, ramah, dan mudah dipahami semua kalangan.';
  } else if (gaya === 'edukatif') {
    instructions += ' Gunakan gaya edukatif dengan penjelasan mendalam, cocok untuk pembaca yang ingin belajar.';
  } else if (gaya === 'aktual') {
    instructions += ' Gunakan gaya jurnalistik yang aktual, informatif, dan faktual.';
  } else {
    instructions += ' Gunakan bahasa yang profesional namun tetap ramah dan mudah dipahami.';
  }

  // Panjang artikel
  if (panjang === 'pendek') {
    instructions += ' Tulis artikel pendek sekitar 300-500 kata (2-3 paragraf utama).';
  } else if (panjang === 'panjang') {
    instructions += ' Tulis artikel panjang dan detail sekitar 800-1200 kata (5-7 paragraf utama) dengan sub-heading yang jelas.';
  } else {
    instructions += ' Tulis artikel dengan panjang sedang sekitar 500-800 kata (3-5 paragraf utama).';
  }

  return instructions;
}

// ─── User Prompt Builder ───────────────────────────────────────────────────

function buildUserPrompt(topik: string, instruksi?: string): string {
  let prompt = `Tulis artikel lengkap dengan judul yang menarik tentang topik berikut:

Topik: ${topik}`;

  if (instruksi && instruksi.trim()) {
    prompt += `\n\nInstruksi tambahan dari penulis:\n${instruksi.trim()}`;
  }

  prompt += `\n\nPastikan artikel:
- Memiliki judul yang menarik (gunakan heading #)
- Dimulai dengan pengantar yang menarik perhatian
- Memiliki isi yang informatif dan terstruktur
- Diakhiri dengan kesimpulan atau ajakan yang memotivasi
- Relevan dengan konteks lembaga pendidikan tahfidz Al-Quran
- Menggunakan bahasa Indonesia yang baik dan benar`;

  return prompt;
}

// ─── OpenCode Zen API Call ─────────────────────────────────────────────────

async function callOpenCode(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<string> {
  const res = await fetch('https://opencode.ai/zen/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4096,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`OpenCode Zen API error ${res.status}: ${errBody.slice(0, 100)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenCode Zen tidak menghasilkan konten.');
  return content.trim();
}

// ─── Markdown → HTML (untuk Tiptap) ─────────────────────────────────────────

function markdownToHtml(md: string): string {
  const lines = md.split('\n');
  const html: string[] = [];
  let inUl = false;
  let inOl = false;

  const closeList = () => {
    if (inUl) { html.push('</ul>'); inUl = false; }
    if (inOl) { html.push('</ol>'); inOl = false; }
  };

  const inline = (t: string) =>
    t
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      closeList();
      continue;
    }

    if (/^# (.+)/.test(line)) {
      closeList();
      html.push(`<h1>${inline(line.replace(/^# /, ''))}</h1>`);
      continue;
    }
    if (/^## (.+)/.test(line)) {
      closeList();
      html.push(`<h2>${inline(line.replace(/^## /, ''))}</h2>`);
      continue;
    }
    if (/^### (.+)/.test(line)) {
      closeList();
      html.push(`<h3>${inline(line.replace(/^### /, ''))}</h3>`);
      continue;
    }

    if (/^(-{3,}|_{3,}|\*{3,})$/.test(line.trim())) {
      closeList();
      html.push('<hr>');
      continue;
    }

    if (/^[-*•] (.+)/.test(line)) {
      if (!inUl) { html.push('<ul>'); inUl = true; }
      html.push(`<li>${inline(line.replace(/^[-*•] /, ''))}</li>`);
      continue;
    }

    if (/^\d+\. (.+)/.test(line)) {
      if (!inOl) { html.push('<ol>'); inOl = true; }
      html.push(`<li>${inline(line.replace(/^\d+\. /, ''))}</li>`);
      continue;
    }

    if (/^> (.+)/.test(line)) {
      closeList();
      html.push(`<blockquote><p>${inline(line.replace(/^> /, ''))}</p></blockquote>`);
      continue;
    }

    closeList();
    html.push(`<p>${inline(line)}</p>`);
  }

  closeList();
  return html.join('');
}
