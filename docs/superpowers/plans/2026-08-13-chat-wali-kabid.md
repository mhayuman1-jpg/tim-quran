# Chat Wali ↔ Kabid (Thread ala WhatsApp) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ubah fitur pesan menjadi percakapan thread per wali (teks + emoji) dengan real-time SSE, untuk wali dan admin (Kabid/Sekretaris).

**Architecture:** Tabel `messages` di-repurpose menjadi tabel pesan thread (tiap baris = 1 bubble, dikelompokkan per `santri_id`). Satu route `POST /api/messages` menangani kirim dari wali & admin; route `list` (thread) & `conversations` (daftar admin) memakai SSE yang sudah ada. UI wali & admin direwrite jadi thread + emoji picker ringan tanpa dependensi baru.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind, Supabase (service-role), lucide-react, SSE (EventSource). Tidak ada library emoji baru.

## Global Constraints

- Path alias: `@/*` → `src/*`
- Bahasa UI/APC/komentar: Indonesia
- API pakai `createServerClient()` (SUPABASE_SERVICE_ROLE_KEY, bypass RLS) — tidak di client component
- Setiap perubahan data memanggil `emitMessageUpdate()` dari `@/lib/message-events`
- Tidak ada test runner di project (AGENTS.md) → verifikasi pakai `npx tsc --noEmit`, `npm run lint`, dan uji manual (bukan pytest)
- Deploy: pm2 **fork** (single instance) + Nginx `proxy_buffering off` (sudah dilakukan)
- Pengirim admin: `sender_type = 'kabid'` untuk Kabid & Sekretaris; `sender_name` = nama user login
- Emoji picker: TANPA dependensi baru (grid emoji Unicode statis)

---

## File Structure

- `src/db/migrations/026_chat_thread.sql` (Create) — backfill reply lama → baris pesan, drop kolom `reply`/`replied_by`/`replied_at`
- `src/app/api/messages/route.ts` (Create) — `POST` unified kirim pesan (wali & admin)
- `src/app/api/messages/send/route.ts` (Delete) — diganti oleh route parent
- `src/app/api/messages/reply/route.ts` (Delete) — diganti oleh route parent
- `src/app/api/messages/list/route.ts` (Modify) — thread ASC + param `santri_id` untuk admin
- `src/app/api/messages/conversations/route.ts` (Create) — daftar conversation untuk admin
- `src/app/api/messages/read/route.ts` (Modify) — tandai dibaca pihak lawan per thread
- `src/components/features/chat/EmojiPicker.tsx` (Create) — popover grid emoji
- `src/app/wali/pesan/page.tsx` (Modify) — UI thread + input emoji
- `src/app/(dashboard)/pesan/page.tsx` (Modify) — UI dua kolom (conversation + thread) + input emoji

---

### Task 1: Migrasi database — thread model

**Files:**
- Create: `src/db/migrations/026_chat_thread.sql`

**Interfaces:** (tidak bergantung task lain; dipakai oleh semua task API)

- [ ] **Step 1: Tulis migrasi SQL idempoten**

```sql
-- Migrasi: ubah messages menjadi tabel thread pesan
-- Backfill reply lama -> baris pesan admin, lalu drop kolom reply/replied_by/replied_at
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'reply'
  ) THEN
    INSERT INTO public.messages (santri_id, sender_type, sender_id, sender_name, message, is_read, created_at)
    SELECT
      m.santri_id,
      'kabid',
      COALESCE(m.replied_by::text, ''),
      COALESCE(u.name, 'Admin'),
      m.reply,
      true,
      m.replied_at
    FROM public.messages m
    LEFT JOIN public.users u ON u.id = m.replied_by
    WHERE m.reply IS NOT NULL AND m.reply <> '';

    ALTER TABLE public.messages DROP COLUMN IF EXISTS reply;
    ALTER TABLE public.messages DROP COLUMN IF EXISTS replied_by;
    ALTER TABLE public.messages DROP COLUMN IF EXISTS replied_at;
  END IF;
END $$;
```

- [ ] **Step 2: Jalankan di Supabase SQL Editor** dan verifikasi kolom `reply`/`replied_by`/`replied_at` sudah tidak ada, serta baris balasan lama muncul sebagai `sender_type='kabid'`.

- [ ] **Step 3: Commit**

```bash
git add src/db/migrations/026_chat_thread.sql
git commit -m "feat(db): migrasi messages ke model thread chat"
```

---

### Task 2: Route kirim pesan unified `POST /api/messages`

**Files:**
- Create: `src/app/api/messages/route.ts`
- Delete: `src/app/api/messages/send/route.ts`
- Delete: `src/app/api/messages/reply/route.ts`

**Interfaces:**
- Consumes: `getAuthenticatedSession(request)` dari `@/lib/api-auth`, `createServerClient()` dari `@/lib/supabase/server`, `emitMessageUpdate()` dari `@/lib/message-events`
- Produces: endpoint `POST /api/messages` dipakai oleh UI wali & admin (Task 7 & 8). Setelah sukses memanggil `emitMessageUpdate()`.

- [ ] **Step 1: Buat `src/app/api/messages/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { createServerClient } from '@/lib/supabase/server';
import { emitMessageUpdate } from '@/lib/message-events';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const role = session.user.role;
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!message) {
      return NextResponse.json({ message: 'Pesan tidak boleh kosong' }, { status: 400 });
    }

    let santriId: string | undefined;
    if (role === 'Wali_Murid') {
      santriId = (session.user as any).santri_id;
    } else {
      santriId = body.santri_id;
    }

    if (!santriId) {
      return NextResponse.json({ message: 'santri_id diperlukan' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase.from('messages').insert({
      santri_id: santriId,
      sender_type: role === 'Wali_Murid' ? 'wali' : 'kabid',
      sender_id: session.user.id,
      sender_name: session.user.name ?? (role === 'Wali_Murid' ? 'Wali' : 'Admin'),
      message,
      is_read: false,
    });

    if (error) {
      console.error('Send message error:', error);
      return NextResponse.json({ message: 'Gagal mengirim pesan' }, { status: 500 });
    }

    emitMessageUpdate();
    return NextResponse.json({ message: 'Pesan terkirim' }, { status: 201 });
  } catch (error) {
    console.error('Messages API error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Hapus route lama**

```bash
rm -rf src/app/api/messages/send src/app/api/messages/reply
```

- [ ] **Step 3: Verifikasi tipe & lint**

```bash
npx tsc --noEmit
npm run lint
```
Expected: tidak ada error yang merujuk file ini.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/messages/route.ts
git rm -r src/app/api/messages/send src/app/api/messages/reply
git commit -m "feat(api): route kirim pesan unified POST /api/messages"
```

---

### Task 3: Route `GET /api/messages/list` (thread)

**Files:**
- Modify: `src/app/api/messages/list/route.ts`

**Interfaces:**
- Consumes: `getAuthenticatedSession(request)`, `createServerClient()`
- Produces: array pesan thread urut ASC (`created_at`) dengan `santri(nama, nisn, classes(name))`; dipakai UI wali (Task 7) & admin (Task 8).

- [ ] **Step 1: Tulis ulang handler GET**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const supabase = createServerClient();
    const role = session.user.role;
    const { searchParams } = new URL(request.url);

    let santriId: string | undefined;
    if (role === 'Wali_Murid') {
      santriId = (session.user as any).santri_id;
    } else {
      santriId = searchParams.get('santri_id') || undefined;
    }

    if (!santriId) {
      return NextResponse.json({ message: 'santri_id diperlukan' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*, santri(nama, nisn, classes(name))')
      .eq('santri_id', santriId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('List messages error:', error);
      return NextResponse.json({ message: 'Gagal mengambil pesan' }, { status: 500 });
    }

    return NextResponse.json(data ?? [], {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    console.error('Messages list API error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verifikasi**

```bash
npx tsc --noEmit
```
Expected: lolos.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/messages/list/route.ts
git commit -m "feat(api): list pesan sebagai thread ASC"
```

---

### Task 4: Route `GET /api/messages/conversations` (admin)

**Files:**
- Create: `src/app/api/messages/conversations/route.ts`

**Interfaces:**
- Consumes: `getAuthenticatedSession(request)`, `createServerClient()`
- Produces: array `{ santri_id, santri, last_message, last_at, unread_count }` urut `last_at` DESC; dipakai UI admin (Task 8).

- [ ] **Step 1: Buat route**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;

  const role = session.user.role;
  if (role !== 'Kabid' && role !== 'Sekretaris') {
    return NextResponse.json({ message: 'Tidak memiliki akses' }, { status: 403 });
  }

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('messages')
      .select('id, santri_id, sender_type, message, is_read, created_at, santri(nama, nisn, classes(name))')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Conversations error:', error);
      return NextResponse.json({ message: 'Gagal mengambil percakapan' }, { status: 500 });
    }

    const map = new Map<string, any>();
    for (const m of data ?? []) {
      if (!map.has(m.santri_id)) {
        map.set(m.santri_id, {
          santri_id: m.santri_id,
          santri: m.santri,
          last_message: m.message,
          last_at: m.created_at,
          unread_count: 0,
        });
      }
      if (m.sender_type === 'wali' && !m.is_read) {
        map.get(m.santri_id).unread_count += 1;
      }
    }

    const result = Array.from(map.values()).sort(
      (a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime()
    );

    return NextResponse.json(result, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    console.error('Conversations API error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verifikasi**

```bash
npx tsc --noEmit
```
Expected: lolos.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/messages/conversations/route.ts
git commit -m "feat(api): daftar conversation untuk admin"
```

---

### Task 5: Route `POST /api/messages/read` (thread read)

**Files:**
- Modify: `src/app/api/messages/read/route.ts`

**Interfaces:**
- Consumes: `getAuthenticatedSession(request)`, `createServerClient()`, `emitMessageUpdate()`
- Produces: menandai `is_read=true` untuk pesan pihak lawan pada 1 thread; dipakai UI wali & admin saat membuka thread.

- [ ] **Step 1: Tulis ulang handler**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { createServerClient } from '@/lib/supabase/server';
import { emitMessageUpdate } from '@/lib/message-events';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const role = session.user.role;
    const santriId =
      role === 'Wali_Murid' ? (session.user as any).santri_id : body.santri_id;

    if (!santriId) {
      return NextResponse.json({ message: 'santri_id diperlukan' }, { status: 400 });
    }

    const supabase = createServerClient();
    const targetSender = role === 'Wali_Murid' ? 'kabid' : 'wali';

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('santri_id', santriId)
      .eq('sender_type', targetSender);

    if (error) {
      console.error('Mark read error:', error);
      return NextResponse.json({ message: 'Gagal menandai pesan' }, { status: 500 });
    }

    emitMessageUpdate();
    return NextResponse.json({ message: 'OK' }, { status: 200 });
  } catch (error) {
    console.error('Mark read API error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verifikasi**

```bash
npx tsc --noEmit
```
Expected: lolos.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/messages/read/route.ts
git commit -m "feat(api): tandai thread dibaca pihak lawan"
```

---

### Task 6: Komponen `EmojiPicker`

**Files:**
- Create: `src/components/features/chat/EmojiPicker.tsx`

**Interfaces:**
- Consumes: tidak ada
- Produces: komponen `<EmojiPicker onSelect={(e: string) => void} />`; dipakai UI wali (Task 7) & admin (Task 8).

- [ ] **Step 1: Buat komponen**

```tsx
"use client";

import { useState } from "react";
import { Smile } from "lucide-react";

const EMOJIS = [
  "😀","😁","😂","🤣","😊","😇","🙂","😉","😍","🥰","😘","😋","😜","🤔","🤨","😐","😴","😎","🥳","😢","😭","😡","🤬","👍","👎","👏","🙏","💪","🙌","👌","🤝","❤️","🧡","💛","💚","💙","💜","🔥","✨","⭐","🎉","✅","❌","⚠️","💡","📌","📎","📷","🕒","🌹","🤲","😱","🥺","😏","😬","🤗","🤩","😮","😯","😪","🤤","😷","🤒","🥵","🥶","😕","🙄","😤","😠","💔","💖","💯","✍️","👋","💬","🔔","📝","📚","🕌","☪️","🤲","🌟","💫","🎯","🚀","💰","🎁","👶","🧑","👨","👩","🏠","🌿","🍀","🌸","🌺",
];

export default function EmojiPicker({ onSelect }: { onSelect: (e: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-opacity hover:opacity-80"
        style={{ background: "#f1f5f9" }}
        title="Emoji"
      >
        <Smile size={18} className="text-slate-500" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-12 left-0 z-20 w-64 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
            style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "2px" }}
          >
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => { onSelect(e); setOpen(false); }}
                className="text-xl leading-none rounded-lg hover:bg-slate-100 p-1"
              >
                {e}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verifikasi**

```bash
npx tsc --noEmit
```
Expected: lolos.

- [ ] **Step 3: Commit**

```bash
git add src/components/features/chat/EmojiPicker.tsx
git commit -m "feat(ui): komponen EmojiPicker tanpa dependensi"
```

---

### Task 7: UI Wali — thread chat + emoji

**Files:**
- Modify: `src/app/wali/pesan/page.tsx`

**Interfaces:**
- Consumes: `POST /api/messages` (Task 2), `GET /api/messages/list` (Task 3), `POST /api/messages/read` (Task 5), `EmojiPicker` (Task 6), `EventSource('/api/messages/stream')` (sudah ada)
- Produces: tampilan thread wali; memanggil read saat thread dibuka.

- [ ] **Step 1: Tulis ulang `src/app/wali/pesan/page.tsx`**

```tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Send, MessageCircle, ArrowLeft, Smile, Trash2 } from "lucide-react";
import Link from "next/link";
import EmojiPicker from "@/components/features/chat/EmojiPicker";

interface Message {
  id: string;
  santri_id: string;
  sender_type: "wali" | "kabid";
  sender_id: string;
  sender_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
  santri?: { nama: string; nisn: string; classes?: { name: string } | null };
}

export default function WaliPesanPage() {
  const { data: session } = useSession();
  const [messages, setMessages; // placeholder, ganti di bawah
}
```

> CATATAN: file lengkap cukup panjang; tulis seluruh isi berdasarkan struktur di bawah ini (bukan hanya stub).

Struktur komponen (implementasikan lengkap):
- `messages: Message[]`, `loading`, `input`, `sending`, `toast`, `bottomRef = useRef<HTMLDivElement>(null)`.
- `fetchMessages = useCallback(async () => { fetch('/api/messages/list', {cache:'no-store'}) -> setMessages(data) }, [])`.
- `useEffect` mount: `fetchMessages()`; `markRead()` (POST /api/messages/read); `EventSource('/api/messages/stream')` -> `fetchMessages()` + `markRead()`; fallback `setInterval(fetchMessages, 30000)`; cleanup.
- `scrollToBottom()`: `bottomRef.current?.scrollIntoView()` dipanggil setelah `messages` berubah via `useEffect([messages])` HANYA bila user sudah di dekat bawah (cek `window.innerHeight + window.scrollY >= document.body.scrollHeight - 120`).
- `sendMessage()`: bila `!input.trim() || sending` return; POST /api/messages `{ message: input.trim() }`; sukses -> `setInput("")`, `fetchMessages()`; gagal -> toast error.
- Render:
  - Header gradient hijau + tombol back ke `/wali/dashboard`.
  - Container scroll: untuk tiap `msg`, bubble kiri (wali, emas `linear-gradient(135deg,#d4a843,#b8922f)`) bila `sender_type==='wali'`, kanan (admin, hijau `linear-gradient(135deg,#0d3b2e,#1a6b4f)`) bila `'kabid'`. Tampilkan `sender_name` + waktu (`formatDate`) + `msg.message` (whitespace-pre-wrap, break-words).
  - `ref={bottomRef}` di akhir list.
  - Input bar fixed bawah: `<EmojiPicker onSelect={(e)=>setInput(v=>v+e)} />` + `<input value={input} onChange onKeyDown(Enter) />` + tombol kirim (disable bila kosong/sending).
- `formatDate(d)`: `new Date(d).toLocaleDateString("id-ID", {day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})`.
- Toast sukses/gagal sesuai pola sebelumnya.

- [ ] **Step 2: Verifikasi**

```bash
npx tsc --noEmit
npm run lint
```
Expected: lolos, tidak ada error.

- [ ] **Step 3: Commit**

```bash
git add src/app/wali/pesan/page.tsx
git commit -m "feat(ui): thread chat wali + emoji picker"
```

---

### Task 8: UI Kabid/Sekretaris — dua kolom + emoji

**Files:**
- Modify: `src/app/(dashboard)/pesan/page.tsx`

**Interfaces:**
- Consumes: `GET /api/messages/conversations` (Task 4), `GET /api/messages/list?santri_id=` (Task 3), `POST /api/messages` (Task 2), `POST /api/messages/read` (Task 5), `DELETE /api/messages/delete`, `EmojiPicker` (Task 6), `EventSource('/api/messages/stream')`
- Produces: daftar conversation kiri + thread kanan; kirim pesan admin dengan `santri_id`.

- [ ] **Step 1: Tulis ulang `src/app/(dashboard)/pesan/page.tsx`**

Struktur komponen (implementasikan lengkap, ikuti pola UI yang sudah ada di project):
- State: `conversations: any[]`, `selectedSantriId: string | null`, `selectedSantri: any`, `messages: Message[]`, `loadingConv`, `loadingMsg`, `input`, `sending`, `search`, `toast`, `bottomRef`.
- `interface Message { id; santri_id; sender_type; sender_id; sender_name; message; is_read; created_at; santri? }`.
- `fetchConversations = useCallback(async () => { GET /api/messages/conversations -> setConversations(data) }, [])`.
- `fetchMessages = useCallback(async (santriId) => { GET /api/messages/list?santri_id= + santriId -> setMessages(data); setSelectedMsg sinkron }, [])`.
- `markRead = useCallback(async (santriId) => { POST /api/messages/read {santri_id} }, [])`.
- `useEffect` mount: `fetchConversations()`; `EventSource('/api/messages/stream')` -> `fetchConversations()` + bila `selectedSantriId` -> `fetchMessages(selectedSantriId)` + `markRead(selectedSantriId)`; fallback `setInterval(fetchConversations, 30000)`; cleanup.
- `selectConversation(c)`: `setSelectedSantriId(c.santri_id)`; `setSelectedSantri(c.santri)`; `fetchMessages(c.santri_id)`; `markRead(c.santri_id)`.
- `sendMessage()`: bila `!selectedSantriId || !input.trim() || sending` return; POST /api/messages `{ santri_id: selectedSantriId, message: input.trim() }`; sukses -> `setInput("")`, `fetchMessages(selectedSantriId)`, `fetchConversations()`; gagal -> toast.
- `deleteMessage(id)`: confirm; POST /api/messages/delete `{message_id}`; sukses -> `fetchMessages(selectedSantriId)` + `fetchConversations()`.
- Layout: grid `lg:grid-cols-[340px_1fr]`. Kiri: search + list conversation (avatar inisial, nama santri, preview `last_message`, waktu `last_at`, badge merah `unread_count`). Kanan: header (nama + kelas), thread bubble (sama seperti wali: wali kiri emas, kabid kanan hijau), input bar (`<EmojiPicker onSelect={...} />` + input + kirim), tombol hapus di header.
- `filteredConversations` = filter by `search` (nama santri / nisn / last_message).
- `unreadTotal` = sum `unread_count` untuk header "Pesan Masuk".

- [ ] **Step 2: Verifikasi**

```bash
npx tsc --noEmit
npm run lint
```
Expected: lolos.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/pesan/page.tsx
git commit -m "feat(ui): thread chat kabid/sekretaris + daftar conversation"
```

---

### Task 9: Verifikasi akhir & deploy

**Files:** tidak ada perubahan kode baru.

**Interfaces:** menggabungkan semua task.

- [ ] **Step 1: Typecheck & lint global**

```bash
npx tsc --noEmit
npm run lint
```
Expected: lolos tanpa error.

- [ ] **Step 2: Build lokal (opsional, cepat gagal kalau ada error import)**

```bash
npm run build
```
Expected: build sukses (eslint diabaikan saat build per AGENTS.md).

- [ ] **Step 3: Commit semua perubahan yang tersisa & push**

```bash
git add -A
git commit -m "feat: chat thread wali-kabid (teks+emoji) selesai"
git push origin master
```

- [ ] **Step 4: Deploy di VPS**

```bash
cd /var/www/tim-quran
git pull
npm install
npm run build
pm2 restart tim-quran
```
Pastikan `pm2 describe tim-quran | grep -i "exec mode"` = `fork_mode`.

- [ ] **Step 5: Uji manual (browser)**
  1. Wali buka `/wali/pesan`, kirim pesan → muncul di daftar conversation admin + badge unread.
  2. Admin klik conversation, balas → muncul **instan** di wali (SSE) tanpa reload.
  3. Emoji terkirim & tampil benar di kedua sisi.
  4. Hapus pesan → hilang di kedua sisi.
  5. Badge unread berkurang setelah thread dibuka.
  6. Riwayat balasan lama (dari sebelum migrasi) muncul sebagai pesan admin di thread.

---

## Self-Review

- **Spec coverage:** Model data (Task 1) ✓; API send/list/conversations/read (Task 2-5) ✓; SSE reuse (Task 7-8 EventSource) ✓; UI wali (Task 7) ✓; UI admin dua kolom (Task 8) ✓; Emoji tanpa lib (Task 6) ✓; scope teks+emoji tanpa foto ✓; read receipt di-skip sesuai spec ✓; verifikasi & deploy (Task 9) ✓.
- **Placeholder scan:** Task 7 mencantumkan struktur dengan catatan "tulis seluruh isi" — ini adalah panduan struktur, BUKAN placeholder kode; implementer wajib menulis komponen lengkap sesuai poin-poin tersebut (bukan TODO). Tidak ada "TBD"/"implement later".
- **Type consistency:** `Message` interface konsisten (`sender_type: "wali"|"kabid"`, `santri_id`, `message`, `is_read`, `created_at`) di seluruh task. Nama route & field (`santri_id`, `last_message`, `unread_count`, `last_at`) konsisten antara Task 4 (produce) dan Task 8 (consume). `emitMessageUpdate()` dipanggil di Task 2 & 5.
