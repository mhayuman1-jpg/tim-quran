# Desain Fitur: Chat Wali ↔ Kabid (Model Thread ala WhatsApp)

Tanggal: 2026-08-13
Status: Disetujui (menunggu implementasi)

## 1. Tujuan

Mengubah fitur pesan yang saat ini hanya mendukung 1 pesan wali + 1 balasan admin
menjadi percakapan **berulang (thread)** per wali, layaknya chat WhatsApp:
wali dan admin (Kabid/Sekretaris) bisa saling mengirim pesan teks + emoji secara
bolak-balik tanpa batas, dengan pembaruan nyata (SSE) secara real-time.

Scope media: **teks + emoji saja** (tidak ada foto/file/voice).

## 2. Kebutuhan & Batasan

- 1 thread = 1 santri (wali santri tersebut ↔ admin).
- Pengirim di sisi admin: role `Kabid` dan `Sekretaris` (sesuai RBAC route reply saat ini).
- Real-time via SSE yang sudah ada (`/api/messages/stream` + `emitMessageUpdate()`).
- Penyimpanan: tabel `messages` di Supabase (service-role key, bypass RLS).
- Emoji: picker ringan **tanpa dependensi baru** (popover grid emoji Unicode pilihan).
- Read receipt "✓✓" di-skip (bisa ditambah di masa depan).

## 3. Data Model (migrasi `026_chat_thread.sql`, idempoten)

Tabel `messages` (sudah ada) diubah menjadi tabel pesan thread:

Kolom yang tetap dipakai:
- `id uuid PK`
- `santri_id uuid FK -> santri(id)` (kunci thread / percakapan)
- `sender_type text` (`'wali'` | `'kabid'`) — admin (Kabid/Sekretaris) selalu `'kabid'`
- `sender_id text`
- `sender_name text`
- `message text` (isi pesan; boleh kosong bila hanya lampiran — tapi di scope ini selalu ada teks/emoji)
- `is_read boolean` — arti: sudah dibaca pihak lawan
- `created_at timestamptz`

Perubahan:
1. Backfill (AMAN, idempoten): untuk setiap baris lama yang memiliki `reply` tidak null,
   insert 1 baris pesan admin baru:
   - `santri_id` = baris lama
   - `sender_type` = `'kabid'`
   - `sender_name` = nama dari `users` berdasarkan `replied_by` (fallback 'Admin')
   - `message` = `reply`
   - `created_at` = `replied_at`
   Hanya jalankan bila `reply` tidak null.
2. Drop kolom `reply`, `replied_by`, `replied_at` (tidak dipakai lagi).
3. Index: pastikan `messages_santri_id_idx` & `messages_created_at_idx` ada (sudah ada di 020).

Catatan: tidak ada kolom attachment (scope teks+emoji).

## 4. API Routes

Semua route pakai `createServerClient()` (service role) dan memanggil
`emitMessageUpdate()` setelah perubahan data.

### 4.1 `GET /api/messages/list`
- Auth: session (wali atau admin).
- Query: `?santri_id=X` (wali mengabaikan param, pakai `session.user.santri_id`).
- Select `*, santri(nama, nisn, classes(name))`, order `created_at ASC`.
- Wali: `eq('santri_id', session.user.santri_id)`.
- Admin: `eq('santri_id', X)`. Bila X kosong -> 400.
- Response: array pesan thread (ASC).

### 4.2 `GET /api/messages/conversations` (khusus admin)
- Auth: Kabid/Sekretaris.
- Mengembalikan 1 baris per `santri_id` yang punya pesan:
  - `santri_id`, `santri(nama, nisn, classes(name))`
  - `last_message` (pesan terakhir, teks apa adanya)
  - `last_at` (created_at terakhir)
  - `unread_count` (jumlah pesan sender_type='wali' && is_read=false pada thread ini)
- Diimplementasikan via query messages lalu agregasi di server (atau RPC bila perlu).
  Pendekatan sederhana: ambil pesan terurut desc, kelompokkan di JS.

### 4.3 `POST /api/messages` (kirim pesan)
- Auth: wali atau admin.
- Body: `{ santri_id?, message }`.
  - Wali: `santri_id` diambil dari session (`session.user.santri_id`); `message` wajib.
  - Admin: `santri_id` wajib dari body; `message` wajib.
- Insert:
  - `santri_id`, `sender_type` ('wali' untuk wali, 'kabid' untuk admin),
  - `sender_id` = session.user.id, `sender_name` = session.user.name,
  - `message`, `is_read` = false, `created_at` = now().
- Validasi: message tidak boleh kosong/whitespace.
- `emitMessageUpdate()`.
- Response 201 `{ message: 'Pesan terkirim' }`.

### 4.4 `POST /api/messages/read`
- Auth: wali atau admin.
- Body: `{ santri_id? }`.
- Update `is_read = true` untuk pesan pada thread ini yang berasal dari pihak lawan:
  - Wali membaca -> update `is_read=true` where `santri_id = sendiri` AND `sender_type='kabid'`.
  - Admin membaca -> update `is_read=true` where `santri_id = X` AND `sender_type='wali'`.
- `emitMessageUpdate()` (agar badge unread di sisi lawan/update list).

### 4.5 `DELETE /api/messages/delete` (tetap ada)
- Auth: wali (hanya pesan sendiri) atau admin (semua).
- Body `{ message_id }`. Hapus 1 baris.
- `emitMessageUpdate()`.

### 4.6 SSE (`/api/messages/stream`) — tidak diubah
- Sudah ada; tetap mengembalikan event saat `emitMessageUpdate()`.

## 5. Real-time (SSE)

- Kedua halaman (wali & admin) membuka `EventSource('/api/messages/stream')`
  dan memanggil fetch ulang thread (dan daftar conversation di admin) saat event masuk.
- Fallback polling 30s tetap dipertahankan bila SSE terputus.
- Deploy: pm2 **fork** (single instance) + Nginx `proxy_buffering off` (sudah dilakukan).

## 6. UI — Wali (`src/app/wali/pesan/page.tsx`)

- Tampilan thread (bukan lagi kartu per pesan).
- Bubble: wali di kiri (emas), admin di kanan (hijau).
- Header: nama santri + kelas.
- Auto-scroll ke bawah saat pesan baru/load (hanya bila user sudah di bawah).
- Input bar bawah: [tombol emoji] [text input] [tombol kirim].
- Emoji picker: popover grid emoji Unicode (tanpa lib). Klik emoji -> sisip ke input.
- Kirim via `POST /api/messages`.
- Tandai dibaca: saat thread dibuka, panggil `POST /api/messages/read`.

## 7. UI — Kabid/Sekretaris (`src/app/(dashboard)/pesan/page.tsx`)

- Layout dua kolom:
  - Kiri: daftar conversation (`GET /api/messages/conversations`): avatar, nama santri,
    preview last message, waktu, badge unread (merah) bila `unread_count>0`.
  - Kanan: thread pesan terpilih (sama seperti UI wali) + input bar (emoji + text + kirim).
- Klik conversation -> load thread (`GET /api/messages/list?santri_id=X`) + tandai read.
- Emoji picker sama dengan wali.
- Kirim via `POST /api/messages` dengan `santri_id` conversation aktif.

## 8. Komponen Baru

- `src/components/features/chat/EmojiPicker.tsx` — popover grid emoji (data emoji
  statis, ~100-150 emoji umum). Prop: `onSelect(emoji: string)`.
- `src/components/features/chat/ChatThread.tsx` (opsional, bisa inline di page) —
  render daftar bubble.
- `src/components/features/chat/MessageInput.tsx` (opsional) — input bar dgn emoji.

## 9. Error Handling

- `message` kosong/whitespace -> tombol kirim disable (client) + 400 (server).
- Upload tidak relevan (tidak ada foto).
- Kegagalan fetch -> toast error, tidak mengosongkan input secara prematur
  (input di-clear hanya bila sukses).
- SSE error -> `console.warn`, fallback polling jalan terus.

## 10. Testing / Verifikasi

- Tanpa test runner (sesuai AGENTS.md). Verifikasi manual:
  1. Wali kirim pesan -> muncul di sisi admin (daftar conversation + badge unread).
  2. Admin balas -> muncul instant di wali (SSE) tanpa reload.
  3. Emoji terkirim & tampil benar.
  4. Hapus pesan -> hilang di kedua sisi.
  5. Badge unread berkurang setelah thread dibuka.
- `npm run lint` & `npx tsc --noEmit` harus lolos.

## 11. Migrasi & Deploy

- Jalankan `026_chat_thread.sql` di Supabase SQL Editor (idempoten).
- `git pull && npm install && npm run build && pm2 restart tim-quran` di VPS.
- Pastikan pm2 fork (single instance).
