// src/app/api/ai/artikel/route.ts
// POST: Proses teks artikel menggunakan Groq AI (llama3-8b-8192)

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
    const { action, text } = body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ message: 'Teks artikel wajib diisi terlebih dahulu.' }, { status: 400 });
    }
    if (!action || typeof action !== 'string') {
      return NextResponse.json({ message: 'Tindakan AI wajib dipilih.' }, { status: 400 });
    }

    const groqKey = process.env.GROQ_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!groqKey && !openaiKey) {
      return NextResponse.json(
        { message: 'API key AI belum dikonfigurasi.' },
        { status: 500 }
      );
    }

    const systemPrompt = buildSystemPrompt(action);
    const userPrompt   = buildUserPrompt(action, text);

    let result: string;
    if (openaiKey) {
      result = await callOpenAI(systemPrompt, userPrompt, openaiKey);
    } else {
      result = await callGroq(systemPrompt, userPrompt, groqKey!);
    }

    // Konversi markdown ke HTML Tiptap-friendly
    const html = markdownToHtml(result);

    return NextResponse.json({ html }, { status: 200 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ai/artikel] Error:', msg);
    return NextResponse.json(
      { message: `Gagal menghubungi AI: ${msg}` },
      { status: 500 }
    );
  }
}

// ─── System prompts per aksi ──────────────────────────────────────────────────

function buildSystemPrompt(action: string): string {
  const base =
    'Kamu adalah penulis artikel profesional berbahasa Indonesia. ' +
    'Format output menggunakan Markdown: gunakan ## untuk heading utama, ### untuk sub-heading, ' +
    '**teks** untuk bold, dan baris baru antar paragraf. ' +
    'JANGAN tambahkan penjelasan, komentar, atau kalimat seperti "Berikut adalah..." di awal/akhir. ' +
    'Langsung berikan hasil artikel saja.';

  if (action === 'structure') {
    return base + ' Susun artikel menjadi struktur lengkap dengan bagian: Pendahuluan, Isi (beberapa sub-topik dengan heading), dan Penutup/Kesimpulan.';
  }
  if (action === 'improve') {
    return base + ' Perbaiki tata bahasa, ejaan, dan gaya penulisan. Jaga makna asli.';
  }
  if (action === 'expand') {
    return base + ' Kembangkan dengan menambahkan detail, contoh, dan penjelasan yang lebih kaya.';
  }
  if (action === 'shorten') {
    return base + ' Persingkat menjadi lebih padat tanpa mengurangi informasi penting.';
  }
  if (action === 'formal') {
    return base + ' Ubah ke gaya formal dan profesional yang sesuai untuk tulisan resmi sekolah/lembaga.';
  }
  if (action === 'simple') {
    return base + ' Sederhanakan bahasa agar mudah dipahami semua kalangan.';
  }
  if (action === 'summarize') {
    return base + ' Buat ringkasan dalam bentuk poin-poin utama menggunakan bullet list.';
  }
  return base;
}

function buildUserPrompt(action: string, text: string): string {
  const actions: Record<string, string> = {
    structure: `Susun dan strukturkan teks berikut menjadi artikel lengkap dengan heading Pendahuluan, bagian isi berdasarkan topik, dan Kesimpulan:\n\n${text}`,
    improve:   `Perbaiki tulisan berikut:\n\n${text}`,
    expand:    `Kembangkan dan perluas tulisan berikut:\n\n${text}`,
    shorten:   `Persingkat tulisan berikut:\n\n${text}`,
    formal:    `Ubah tulisan berikut menjadi lebih formal:\n\n${text}`,
    simple:    `Sederhanakan bahasa tulisan berikut:\n\n${text}`,
    summarize: `Buat ringkasan poin-poin dari tulisan berikut:\n\n${text}`,
  };
  return actions[action] ?? `Perbaiki tulisan berikut:\n\n${text}`;
}

// ─── Groq ─────────────────────────────────────────────────────────────────────

const GROQ_MODELS = ['llama-3.1-8b-instant', 'gemma2-9b-it', 'llama3-8b-8192'];

async function callGroq(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<string> {
  for (let attempt = 0; attempt < GROQ_MODELS.length; attempt++) {
    const model = GROQ_MODELS[attempt];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

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
            { role: 'user',   content: userPrompt },
          ],
          max_tokens: 2048,
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
        console.error('[callGroq] HTTP', res.status, errBody.slice(0, 300));
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

// ─── OpenAI ───────────────────────────────────────────────────────────────────

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
        { role: 'user',   content: userPrompt },
      ],
      max_tokens: 2048,
      temperature: 0.7,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI API error ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() ?? '';
}

// ─── Markdown → HTML (untuk Tiptap) ─────────────────────────────────────────

function markdownToHtml(md: string): string {
  const lines = md.split('\n');
  const html: string[] = [];
  let inUl = false;
  let inOl = false;
  let olIdx = 0;

  const closeList = () => {
    if (inUl) { html.push('</ul>'); inUl = false; }
    if (inOl) { html.push('</ol>'); inOl = false; olIdx = 0; }
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

    // Blank line
    if (!line.trim()) {
      closeList();
      continue;
    }

    // Heading 1
    if (/^# (.+)/.test(line)) {
      closeList();
      html.push(`<h1>${inline(line.replace(/^# /, ''))}</h1>`);
      continue;
    }
    // Heading 2
    if (/^## (.+)/.test(line)) {
      closeList();
      html.push(`<h2>${inline(line.replace(/^## /, ''))}</h2>`);
      continue;
    }
    // Heading 3
    if (/^### (.+)/.test(line)) {
      closeList();
      html.push(`<h3>${inline(line.replace(/^### /, ''))}</h3>`);
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(line.trim())) {
      closeList();
      html.push('<hr>');
      continue;
    }

    // Bullet list (-, *, •)
    if (/^[-*•] (.+)/.test(line)) {
      if (!inUl) { html.push('<ul>'); inUl = true; }
      html.push(`<li>${inline(line.replace(/^[-*•] /, ''))}</li>`);
      continue;
    }

    // Numbered list
    if (/^\d+\. (.+)/.test(line)) {
      if (!inOl) { html.push('<ol>'); inOl = true; }
      html.push(`<li>${inline(line.replace(/^\d+\. /, ''))}</li>`);
      continue;
    }

    // Blockquote
    if (/^> (.+)/.test(line)) {
      closeList();
      html.push(`<blockquote><p>${inline(line.replace(/^> /, ''))}</p></blockquote>`);
      continue;
    }

    // Normal paragraph
    closeList();
    html.push(`<p>${inline(line)}</p>`);
  }

  closeList();
  return html.join('');
}
