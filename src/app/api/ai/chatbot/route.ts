import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const SYSTEM_PROMPT = `Kamu adalah Asisten AI untuk website "Tim Qur'an" — sebuah program pendidikan Al-Qur'an (tahfidz & tahsin) untuk siswa SDIT Al Hilmi Dompu.

Tugasmu:
- Menjelaskan program tahfidz dan tahsin
- Membantu wali murid memahami cara menggunakan website dan portal wali murid
- Menjawab pertanyaan umum tentang kegiatan sekolah, kehadiran, raport, jadwal
- Memberikan panduan login portal wali murid (masukkan NIS anak)
- Menjelaskan sistem penilaian: ✓(Hafal 100%), A(Sangat Baik 100%), B(Baik 80%), C(Cukup Baik 70%), D(Kurang Baik 55%), L(Lancar 100%), KL(Kurang Lancar 75%), TL(Tidak Lancar 50%)

Aturan:
- Jawab dalam bahasa Indonesia yang ramah dan jelas
- Jika tidak tahu jawabannya, arahkan ke admin sekolah
- Jawab singkat, padat, dan informatif (maksimal 3-4 kalimat)
- Gunakan sapaan "Assalamu'alaikum" atau "Waalaikumsalam" jika sesuai
- Jangan mengarang informasi yang tidak kamu ketahui`;

export async function POST(request: NextRequest) {
  if (!OPENROUTER_API_KEY) {
    return NextResponse.json(
      { message: 'API key belum dikonfigurasi' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { message: 'Messages tidak valid' },
        { status: 400 }
      );
    }

    // Build conversation history for OpenRouter (OpenAI format)
    const chatMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((msg: { text: string; isUser: boolean }) => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text,
      })),
    ];

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://tim-quran.vercel.app',
        'X-Title': 'Tim Quran Chatbot',
      },
      body: JSON.stringify({
        model: 'openrouter/free',
        messages: chatMessages,
        temperature: 0.7,
        max_tokens: 256,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenRouter API error:', err);
      return NextResponse.json(
        { message: 'Gagal menghubungi AI' },
        { status: 502 }
      );
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) {
      return NextResponse.json(
        { message: 'Tidak ada respons dari AI' },
        { status: 502 }
      );
    }

    return NextResponse.json({ reply }, { status: 200 });
  } catch (error) {
    console.error('Chatbot API error:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
