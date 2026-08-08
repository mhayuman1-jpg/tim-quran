# Album Galeri & Lightbox Auto-Swipe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add album system with drag-drop multi-upload to dashboard, and auto-swipe lightbox to public gallery page.

**Architecture:** New `album` table with FK from `galeri`, new REST API route for album CRUD, multipart upload support in existing galeri API, new client components (AlbumCard, AlbumGrid, LightboxModal, MultiUploadDrop, AlbumDetailModal), and modified dashboard/public pages.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase, Tigris S3 storage, embla-carousel-react + autoplay + fade, lucide-react

## Global Constraints

- Follow existing code patterns in `src/app/(dashboard)/website/page.tsx` (client component with tab-based layout, useToast, fetch pattern)
- Follow existing API patterns in `src/app/api/website/galeri/route.ts` (NextRequest, getServerSession, createServerClient, revalidatePath)
- Image upload uses existing `/api/upload` endpoint + Tigris storage bucket `timquran-assets`
- Photo URLs stored as Tigris keys, converted via `toImageUrl()` from `@/lib/storage/urls`
- All public queries use `createServerClient()` from `@/lib/supabase/server`
- Kabid-only write operations use `getServerSession(authOptions)` + role check
- UI components from `src/components/ui/` (Button, Input, Modal, Badge)
- amber/slate tailwind color scheme consistent with existing pages

---

### Task 1: Create Database Migration for `album` Table

**Files:**
- Create: `src/lib/supabase/migrations/007_album.sql`

**Interfaces:**
- Produces: `album` table with columns (id uuid PK, judul text NOT NULL, deskripsi text nullable, cover_url text nullable, urutan int DEFAULT 0, is_published boolean DEFAULT true, created_at timestamptz, updated_at timestamptz) + RLS policy
- Produces: `ALTER TABLE galeri ADD COLUMN album_id uuid REFERENCES album(id) ON DELETE SET NULL` + index

- [ ] **Step 1: Write the migration SQL file**

```sql
-- 007_album.sql
-- Tabel album untuk mengelompokkan foto galeri

CREATE TABLE IF NOT EXISTS public.album (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  judul        text        NOT NULL,
  deskripsi    text,
  cover_url    text,
  urutan       int         NOT NULL DEFAULT 0,
  is_published boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.album ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read album" ON public.album
  FOR SELECT TO anon, authenticated
  USING (true);

ALTER TABLE public.galeri
  ADD COLUMN IF NOT EXISTS album_id uuid REFERENCES public.album(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_galeri_album_id ON public.galeri(album_id);
```

- [ ] **Step 2: Apply migration to Supabase**

Run in Supabase SQL Editor or via CLI:
```bash
psql -f src/lib/supabase/migrations/007_album.sql
```

- [ ] **Step 3: Verify tables exist**

Query Supabase:
```sql
SELECT table_name FROM information_schema.tables WHERE table_name IN ('album', 'galeri');
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'album';
```

Expected: `album` table with 8 columns, `galeri` has new `album_id` column.

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/migrations/007_album.sql
git commit -m "feat: add album table migration and galeri album_id FK"
```

---

### Task 2: Create Album API Route (CRUD)

**Files:**
- Create: `src/app/api/website/album/route.ts`

**Interfaces:**
- Consumes: Supabase client pattern from `src/app/api/website/galeri/route.ts`
- Produces: `GET /api/website/album[?all=true]` returns `{ data: AlbumWithCount[] }` where `AlbumWithCount = { id, judul, deskripsi, cover_url, urutan, is_published, created_at, updated_at, foto_count: number }`
- Produces: `POST /api/website/album` with body `{ judul, deskripsi?, cover_url?, urutan?, is_published? }`
- Produces: `PUT /api/website/album` with body `{ id, judul?, deskripsi?, cover_url?, urutan?, is_published? }`
- Produces: `DELETE /api/website/album` with body `{ id }`

- [ ] **Step 1: Create the route file**

```typescript
// src/app/api/website/album/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

function requireKabid(session: any) {
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (session.user.role !== 'Kabid') return NextResponse.json({ message: 'Akses tidak diizinkan.' }, { status: 403 });
  return null;
}
```

- [ ] **Step 2: Implement GET handler**

```typescript
// GET: publik atau all=true untuk dashboard
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';

    let q = supabase
      .from('album')
      .select('*, galeri(count)')
      .order('urutan', { ascending: true })
      .order('created_at', { ascending: false });

    if (!all) q = q.eq('is_published', true);

    const { data, error } = await q;

    if (error) {
      console.error('[album GET]', error);
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    const albums = (data ?? []).map((row: any) => ({
      id: row.id,
      judul: row.judul,
      deskripsi: row.deskripsi,
      cover_url: row.cover_url,
      urutan: row.urutan,
      is_published: row.is_published,
      created_at: row.created_at,
      updated_at: row.updated_at,
      foto_count: row.galeri?.[0]?.count ?? 0,
    }));

    return NextResponse.json({ data: albums }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Implement POST handler**

```typescript
// POST: tambah album (Kabid only)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const kabidCheck = requireKabid(session);
  if (kabidCheck) return kabidCheck;

  try {
    const body = await request.json();
    const { judul, deskripsi, cover_url, urutan, is_published } = body;

    if (!judul?.trim()) {
      return NextResponse.json({ message: 'Judul album wajib diisi.' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('album')
      .insert([{
        judul: judul.trim(),
        deskripsi: deskripsi || null,
        cover_url: cover_url || null,
        urutan: urutan ?? 0,
        is_published: is_published ?? true,
      }])
      .select('*')
      .single();

    if (error) {
      console.error('[album POST]', error);
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    try { revalidatePath('/'); revalidatePath('/galeri'); } catch {}

    return NextResponse.json({ message: 'Album berhasil ditambahkan.', data }, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Implement PUT handler**

```typescript
// PUT: edit album (Kabid only)
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const kabidCheck = requireKabid(session);
  if (kabidCheck) return kabidCheck;

  try {
    const body = await request.json();
    const { id, judul, deskripsi, cover_url, urutan, is_published } = body;

    if (!id) return NextResponse.json({ message: 'ID album wajib diisi.' }, { status: 400 });

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (judul !== undefined) updates.judul = judul?.trim() || null;
    if (deskripsi !== undefined) updates.deskripsi = deskripsi || null;
    if (cover_url !== undefined) updates.cover_url = cover_url || null;
    if (urutan !== undefined) updates.urutan = urutan;
    if (is_published !== undefined) updates.is_published = is_published;

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('album')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[album PUT]', error);
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    try { revalidatePath('/'); revalidatePath('/galeri'); } catch {}

    return NextResponse.json({ message: 'Album berhasil diperbarui.', data }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}
```

- [ ] **Step 5: Implement DELETE handler**

```typescript
// DELETE: hapus album (Kabid only), foto tetap ada (album_id = NULL via FK)
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const kabidCheck = requireKabid(session);
  if (kabidCheck) return kabidCheck;

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) return NextResponse.json({ message: 'ID album wajib diisi.' }, { status: 400 });

    const supabase = createServerClient();
    const { error } = await supabase.from('album').delete().eq('id', id);

    if (error) {
      console.error('[album DELETE]', error);
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    try { revalidatePath('/'); revalidatePath('/galeri'); } catch {}

    return NextResponse.json({ message: 'Album berhasil dihapus.' }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}
```

- [ ] **Step 6: Test API with curl (optional)**

```bash
# Test GET public
curl http://localhost:3000/api/website/album

# Test POST (requires Kabid session cookie)
```

- [ ] **Step 7: Commit**

```bash
git add src/app/api/website/album/route.ts
git commit -m "feat: add album CRUD API route"
```

---

### Task 3: Add Multipart Multi-Upload to Galeri API

**Files:**
- Modify: `src/app/api/website/galeri/route.ts`

**Interfaces:**
- Consumes: existing galeri route pattern
- Produces: Modified POST handler — detects `multipart/form-data` vs `application/json`, when multipart, processes `album_id` + `files[]`

- [ ] **Step 1: Add multipart POST handler alongside existing JSON POST**

The existing POST handler at line 33-58 expects `application/json`. Add a new export or modify the existing POST to detect content type. Since Next.js route handlers only allow one export per method, modify the existing POST:

Read the current file at `src/app/api/website/galeri/route.ts`. Replace the entire POST handler (lines 32-58) with:

```typescript
// POST: tambah foto (Kabid only) — supports JSON single & multipart multi-upload
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (session.user.role !== 'Kabid') return NextResponse.json({ message: 'Akses tidak diizinkan.' }, { status: 403 });

  const contentType = request.headers.get('content-type') || '';

  // ── Multipart multi-upload ──
  if (contentType.includes('multipart/form-data')) {
    return handleMultiUpload(request);
  }

  // ── JSON single-upload (backward compatible) ──
  return handleSingleUpload(request);
}
```

- [ ] **Step 2: Keep existing single-upload logic as `handleSingleUpload`**

Move existing POST logic (lines 38-58) into `handleSingleUpload` and add `album_id` support:

```typescript
async function handleSingleUpload(request: NextRequest) {
  try {
    const body = await request.json();
    const { judul, deskripsi, foto_url, urutan, is_published, album_id } = body;
    if (!judul?.trim()) return NextResponse.json({ message: 'Judul wajib diisi.' }, { status: 400 });
    if (!foto_url?.trim()) return NextResponse.json({ message: 'Foto wajib diupload.' }, { status: 400 });

    const supabase = createServerClient();

    // Validate album_id if provided
    if (album_id) {
      const { data: album } = await supabase.from('album').select('id').eq('id', album_id).maybeSingle();
      if (!album) return NextResponse.json({ message: 'Album tidak ditemukan.' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('galeri')
      .insert([{
        judul: judul.trim(),
        deskripsi: deskripsi || null,
        foto_url,
        urutan: urutan ?? 0,
        is_published: is_published ?? true,
        album_id: album_id || null,
      }])
      .select('*').single();

    if (error) return NextResponse.json({ message: error.message }, { status: 500 });

    try { revalidatePath('/'); revalidatePath('/galeri'); } catch (e) { console.warn('revalidatePath failed', e); }

    return NextResponse.json({ message: 'Foto berhasil ditambahkan.', data }, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Add multi-upload handler**

Add the `handleMultiUpload` function and import storageUpload:

Add import at top:
```typescript
import { storageUpload } from '@/lib/storage/tigris';
```

Add handler before or after `handleSingleUpload`:
```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

async function handleMultiUpload(request: NextRequest) {
  try {
    const formData = await request.formData();
    const albumId = formData.get('album_id') as string | null;

    if (!albumId) {
      return NextResponse.json({ message: 'album_id wajib diisi.' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Validate album exists
    const { data: album } = await supabase.from('album').select('id').eq('id', albumId).maybeSingle();
    if (!album) {
      return NextResponse.json({ message: 'Album tidak ditemukan.' }, { status: 404 });
    }

    // Collect files from formData
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('files') && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ message: 'Minimal satu file wajib diupload.' }, { status: 400 });
    }

    const results: Array<{ judul: string; foto_url: string; error?: string }> = [];
    const bucket = 'timquran-assets';
    const folder = 'galeri';

    for (const file of files) {
      // Validate type
      if (!ALLOWED_TYPES.includes(file.type)) {
        results.push({ judul: file.name, foto_url: '', error: 'Format tidak didukung' });
        continue;
      }

      // Validate size
      if (file.size > MAX_SIZE_BYTES) {
        results.push({ judul: file.name, foto_url: '', error: `Ukuran > ${MAX_SIZE_MB}MB` });
        continue;
      }

      try {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await storageUpload(bucket, fileName, buffer, file.type);

        const fotoUrl = `/api/images/${bucket}/${fileName}`;

        const { error: insertErr } = await supabase.from('galeri').insert([{
          judul: file.name.replace(/\.[^.]+$/, ''),
          foto_url: fotoUrl,
          album_id: albumId,
          urutan: 0,
          is_published: true,
        }]);

        if (insertErr) {
          results.push({ judul: file.name, foto_url: fotoUrl, error: insertErr.message });
        } else {
          results.push({ judul: file.name, foto_url: fotoUrl });
        }
      } catch (uploadErr: any) {
        results.push({ judul: file.name, foto_url: '', error: uploadErr?.message || 'Upload gagal' });
      }
    }

    try { revalidatePath('/'); revalidatePath('/galeri'); } catch {}

    const inserted = results.filter(r => !r.error).length;
    return NextResponse.json({
      message: `${inserted} dari ${files.length} foto berhasil diupload.`,
      inserted,
      total: files.length,
      photos: results,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan saat upload.' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Build to verify compilation**

```bash
npm run build
```

Expected: No TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/website/galeri/route.ts
git commit -m "feat: add multipart multi-upload support to galeri API"
```

---

### Task 4: Create MultiUploadDrop Component

**Files:**
- Create: `src/components/features/galeri/MultiUploadDrop.tsx`

**Interfaces:**
- Produces: `MultiUploadDrop` component — props: `albumId: string`, `onUploadComplete: () => void`, `disabled?: boolean`. Handles drag-drop + click file picker (multiple), uploads each file via multipart POST to `/api/website/galeri`, shows progress per file.

- [ ] **Step 1: Create the component**

```typescript
'use client';

// src/components/features/galeri/MultiUploadDrop.tsx
// Zone drag & drop untuk upload banyak foto ke satu album

import { useCallback, useRef, useState } from 'react';
import { Upload, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface UploadResult {
  judul: string;
  foto_url: string;
  error?: string;
}

interface MultiUploadDropProps {
  albumId: string;
  onUploadComplete: () => void;
  disabled?: boolean;
}

export default function MultiUploadDrop({ albumId, onUploadComplete, disabled }: MultiUploadDropProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);

  const handleFiles = useCallback(async (fileList: FileList) => {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;

    setUploading(true);
    setResults([]);

    const formData = new FormData();
    formData.append('album_id', albumId);
    files.forEach((f, i) => formData.append(`files[${i}]`, f));

    try {
      const res = await fetch('/api/website/galeri', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      setResults(json.photos ?? []);
      onUploadComplete();
    } catch {
      setResults([{ judul: 'Error', foto_url: '', error: 'Gagal menghubungi server.' }]);
    } finally {
      setUploading(false);
    }
  }, [albumId, onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }, [disabled, uploading, handleFiles]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
    e.target.value = '';
  };

  const okCount = results.filter(r => !r.error).length;
  const errCount = results.filter(r => r.error).length;

  return (
    <div className="space-y-3">
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
          dragOver
            ? 'border-amber-400 bg-amber-50'
            : 'border-slate-300 bg-slate-50 hover:border-amber-300 hover:bg-amber-50/30'
        } ${(disabled || uploading) ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); if (!disabled && !uploading) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={28} className="text-amber-600 animate-spin" />
            <p className="text-sm font-medium text-slate-600">Mengunggah...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <Upload size={22} className="text-amber-600" />
            </div>
            <p className="text-sm font-medium text-slate-700">
              {dragOver ? 'Lepas foto di sini' : 'Seret & lepas foto di sini'}
            </p>
            <p className="text-xs text-slate-400">atau klik untuk pilih file • JPG, PNG, WebP • maks 5MB/foto</p>
          </div>
        )}
      </div>

      {/* Upload results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            {okCount > 0 && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 size={14} /> {okCount} berhasil
              </span>
            )}
            {errCount > 0 && (
              <span className="flex items-center gap-1 text-red-500">
                <AlertCircle size={14} /> {errCount} gagal
              </span>
            )}
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {results.map((r, i) => (
              <div key={i} className={`text-xs flex items-center gap-2 px-2 py-1 rounded ${r.error ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                {r.error ? <X size={12} /> : <CheckCircle2 size={12} />}
                <span className="truncate">{r.judul}</span>
                {r.error && <span className="text-red-400 shrink-0">— {r.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleChange}
        disabled={disabled || uploading}
        className="hidden"
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/features/galeri/MultiUploadDrop.tsx
git commit -m "feat: add MultiUploadDrop component for drag-drop multi-photo upload"
```

---

### Task 5: Add Album Tab to Dashboard Website Page

**Files:**
- Modify: `src/app/(dashboard)/website/page.tsx`

**Interfaces:**
- Consumes: existing tab pattern (ProfilTab, ProgramTab, GaleriTab)
- Produces: `AlbumTab` component — album list grid, create/edit album modal, album detail with MultiUploadDrop + existing photo grid, delete confirmation

- [ ] **Step 1: Add Album type and import**

At the top of the file, add to the existing type definitions:
```typescript
interface AlbumItem {
  id: string;
  judul: string;
  deskripsi?: string;
  cover_url: string | null;
  urutan: number;
  is_published: boolean;
  foto_count: number;
}
```

Add imports:
```typescript
import { Album, ArrowLeft } from 'lucide-react';
import MultiUploadDrop from '@/components/features/galeri/MultiUploadDrop';
```

- [ ] **Step 2: Add Album tab button in the tab bar**

In the tab array (lines 49-55), add after the 'galeri' entry:
```typescript
{ id: 'album', label: 'Album', icon: Album },
```

Also add `'album'` to the `useState` type:
```typescript
const [tab, setTab] = useState<'profil' | 'program' | 'agenda' | 'galeri' | 'album' | 'menu'>('profil');
```

And add the tab render (line 76):
```typescript
{tab === 'album' && <AlbumTab toast={toast} />}
```

- [ ] **Step 3: Implement the AlbumTab component**

Add the full `AlbumTab` component after the `GaleriTab` component. This is the largest single piece of code. Structure:

```typescript
function AlbumTab({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<AlbumItem | null>(null);
  const [form, setForm] = useState({ judul: '', deskripsi: '', cover_url: '', urutan: 0, is_published: true });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AlbumItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Album detail state
  const [detailAlbum, setDetailAlbum] = useState<AlbumItem | null>(null);
  const [detailPhotos, setDetailPhotos] = useState<GaleriItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchAlbums = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/website/album?all=true');
    const j = await r.json();
    setAlbums(j.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAlbums(); }, [fetchAlbums]);

  const openAdd = () => {
    setEditItem(null);
    setForm({ judul: '', deskripsi: '', cover_url: '', urutan: 0, is_published: true });
    setModalOpen(true);
  };

  const openEdit = (a: AlbumItem) => {
    setEditItem(a);
    setForm({
      judul: a.judul,
      deskripsi: a.deskripsi ?? '',
      cover_url: a.cover_url ?? '',
      urutan: a.urutan,
      is_published: a.is_published,
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.judul.trim()) { toast.error('Judul album wajib diisi.'); return; }
    setSaving(true);
    try {
      const body = editItem ? { id: editItem.id, ...form } : form;
      const res = await fetch('/api/website/album', {
        method: editItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (res.ok) { toast.success(j.message); setModalOpen(false); fetchAlbums(); }
      else toast.error(j.message);
    } catch { toast.error('Terjadi kesalahan.'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const res = await fetch('/api/website/album', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: deleteTarget.id }),
    });
    const j = await res.json();
    if (res.ok) { toast.success(j.message); setDeleteTarget(null); fetchAlbums(); if (detailAlbum?.id === deleteTarget.id) setDetailAlbum(null); }
    else toast.error(j.message);
    setDeleteLoading(false);
  };

  // Open album detail (fetch photos)
  const openDetail = async (album: AlbumItem) => {
    setDetailAlbum(album);
    setDetailLoading(true);
    try {
      const r = await fetch(`/api/website/galeri?all=true`);
      const j = await r.json();
      const photos = (j.data ?? []).filter((p: GaleriItem) => (p as any).album_id === album.id);
      setDetailPhotos(photos);
    } catch { toast.error('Gagal memuat foto album.'); }
    finally { setDetailLoading(false); }
  };

  const handlePhotoDelete = async (photo: GaleriItem) => {
    const res = await fetch('/api/website/galeri', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: photo.id }),
    });
    const j = await res.json();
    if (res.ok) {
      toast.success('Foto dihapus.');
      setDetailPhotos(prev => prev.filter(p => p.id !== photo.id));
      fetchAlbums();
    } else {
      toast.error(j.message);
    }
  };

  // Detail view for a specific album
  if (detailAlbum) {
    return (
      <div className="space-y-6">
        {/* Back button + header */}
        <div className="flex items-center gap-4">
          <button onClick={() => { setDetailAlbum(null); fetchAlbums(); }}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{detailAlbum.judul}</h2>
            {detailAlbum.deskripsi && <p className="text-sm text-slate-500">{detailAlbum.deskripsi}</p>}
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={detailAlbum.is_published ? 'green' : 'red'}>
                {detailAlbum.is_published ? 'Publik' : 'Draft'}
              </Badge>
              <span className="text-xs text-slate-400">{detailPhotos.length} foto</span>
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" leftIcon={<Pencil size={13} />} onClick={() => openEdit(detailAlbum)}>Edit</Button>
            <Button variant="ghost" size="sm" leftIcon={<Trash2 size={13} />} onClick={() => setDeleteTarget(detailAlbum)} className="text-red-600">Hapus</Button>
          </div>
        </div>

        {/* Drop zone */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Tambah Foto ke Album</h3>
          <MultiUploadDrop
            albumId={detailAlbum.id}
            onUploadComplete={() => { openDetail(detailAlbum); }}
          />
        </div>

        {/* Existing photos grid */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Foto dalam Album ({detailPhotos.length})</h3>
          {detailLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="aspect-square bg-slate-200 rounded-xl animate-pulse" />)}
            </div>
          ) : detailPhotos.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Belum ada foto. Seret & lepas foto di atas.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {detailPhotos.map(photo => (
                <div key={photo.id} className="group relative rounded-xl overflow-hidden border border-slate-200">
                  <div className="aspect-square relative">
                    <Image src={toImageUrl(photo.foto_url) || ''} alt={photo.judul} fill className="object-cover" sizes="25vw" />
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handlePhotoDelete(photo)}
                      className="p-1.5 bg-white rounded-lg shadow text-red-500 hover:text-red-700">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="p-2">
                    <p className="text-xs text-slate-700 truncate">{photo.judul}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modals (same as below) */}
        <AlbumFormModal modalOpen={modalOpen} setModalOpen={setModalOpen} form={form} setForm={setForm}
          editItem={editItem} saving={saving} save={save} />
        <ConfirmDialog open={!!deleteTarget} onClose={() => !deleteLoading && setDeleteTarget(null)} onConfirm={confirmDelete}
          title="Hapus Album" message={`Hapus album "${deleteTarget?.judul}"? Foto-foto di dalamnya akan tetap ada tanpa album.`} confirmLabel="Hapus" loading={deleteLoading} />
      </div>
    );
  }

  // Main album list view
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" leftIcon={<Plus size={15} />} onClick={openAdd}>Buat Album</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="aspect-[4/3] bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      ) : albums.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <Album size={48} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium">Belum ada album</p>
          <p className="text-xs mt-1">Buat album untuk mengelompokkan foto galeri.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {albums.map(album => {
            const coverSrc = album.cover_url
              ? toImageUrl(album.cover_url)
              : null;

            return (
              <div key={album.id} className="group cursor-pointer rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all"
                onClick={() => openDetail(album)}>
                <div className="aspect-[4/3] relative bg-slate-100">
                  {coverSrc ? (
                    <Image src={coverSrc} alt={album.judul} fill className="object-cover" sizes="33vw" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Album size={40} className="text-slate-300" />
                    </div>
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  {/* Info at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-white font-semibold text-base">{album.judul}</h3>
                    <p className="text-white/70 text-xs">{album.foto_count} foto</p>
                    {!album.is_published && (
                      <span className="inline-block mt-1 text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full">Draft</span>
                    )}
                  </div>
                </div>
                {/* Hover edit/delete buttons */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <button onClick={(e) => { e.stopPropagation(); openEdit(album); }}
                    className="p-1.5 bg-white rounded-lg shadow text-slate-600 hover:text-blue-600">
                    <Pencil size={13} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(album); }}
                    className="p-1.5 bg-white rounded-lg shadow text-slate-600 hover:text-red-600">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Album Modal */}
      <AlbumFormModal modalOpen={modalOpen} setModalOpen={setModalOpen} form={form} setForm={setForm}
        editItem={editItem} saving={saving} save={save} />

      {/* Delete Confirmation */}
      <ConfirmDialog open={!!deleteTarget} onClose={() => !deleteLoading && setDeleteTarget(null)} onConfirm={confirmDelete}
        title="Hapus Album" message={`Hapus album "${deleteTarget?.judul}"? Foto-foto di dalamnya akan tetap ada tanpa album.`} confirmLabel="Hapus" loading={deleteLoading} />
    </div>
  );
}

// Helper component for the Album form modal (avoids code duplication)
function AlbumFormModal({
  modalOpen, setModalOpen, form, setForm, editItem, saving, save,
}: {
  modalOpen: boolean;
  setModalOpen: (v: boolean) => void;
  form: { judul: string; deskripsi: string; cover_url: string; urutan: number; is_published: boolean };
  setForm: (f: any) => void;
  editItem: AlbumItem | null;
  saving: boolean;
  save: () => void;
}) {
  return (
    <Modal open={modalOpen} onClose={() => !saving && setModalOpen(false)} title={editItem ? 'Edit Album' : 'Buat Album Baru'} size="md">
      <div className="space-y-4">
        <Input label="Judul Album" value={form.judul}
          onChange={e => setForm((f: any) => ({ ...f, judul: e.target.value }))} required />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Deskripsi (opsional)</label>
          <textarea rows={2} value={form.deskripsi}
            onChange={e => setForm((f: any) => ({ ...f, deskripsi: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none" />
        </div>
        <ImageUpload
          label="Foto Cover Album (opsional)"
          value={form.cover_url || null}
          onUpload={(url) => setForm((f: any) => ({ ...f, cover_url: url }))}
          bucket="timquran-assets" folder="galeri" shape="wide"
          helperText="Kosongkan untuk menggunakan foto pertama sebagai cover"
        />
        <Input label="Urutan" type="number" value={String(form.urutan)}
          onChange={e => setForm((f: any) => ({ ...f, urutan: parseInt(e.target.value) || 0 }))} />
        <div className="flex items-center gap-3">
          <button onClick={() => setForm((f: any) => ({ ...f, is_published: !f.is_published }))}>
            {form.is_published ? <ToggleRight size={28} className="text-amber-600" /> : <ToggleLeft size={28} className="text-slate-400" />}
          </button>
          <span className="text-sm text-slate-700">Tampilkan di website publik</span>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Batal</Button>
          <Button variant="primary" loading={saving} onClick={save}>Simpan</Button>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Build to verify**

```bash
npm run build
```

Expected: No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/website/page.tsx
git commit -m "feat: add Album tab to dashboard website page"
```

---

### Task 6: Install Embla Carousel Dependencies

**Files:**
- None (package.json only)

- [ ] **Step 1: Install packages**

```bash
npm install embla-carousel-react embla-carousel-autoplay embla-carousel-fade
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add embla-carousel dependencies"
```

---

### Task 7: Create Public Gallery Components (AlbumCard, AlbumGrid, LightboxModal)

**Files:**
- Create: `src/components/features/galeri/AlbumCard.tsx`
- Create: `src/components/features/galeri/AlbumGrid.tsx`
- Create: `src/components/features/galeri/LightboxModal.tsx`

**Interfaces:**
- AlbumCard: `{ album: AlbumWithCover, onClick: () => void }` — renders card with cover, title, photo count, hover effects
- AlbumGrid: `{ albums: AlbumWithCover[], onAlbumClick: (album: AlbumWithCover) => void }` — responsive grid of AlbumCard
- LightboxModal: `{ open: boolean, onClose: () => void, photos: GaleriPhoto[], albumTitle: string }` — Embla carousel overlay with autoplay, navigation, counter

- [ ] **Step 1: Create AlbumCard component**

```typescript
'use client';

// src/components/features/galeri/AlbumCard.tsx
import Image from 'next/image';
import { Images } from 'lucide-react';
import { toImageUrl } from '@/lib/storage/urls';

export interface AlbumWithCover {
  id: string;
  judul: string;
  deskripsi?: string;
  cover_url: string | null;
  foto_count: number;
  first_photo_url?: string;
}

interface AlbumCardProps {
  album: AlbumWithCover;
  onClick: () => void;
}

export default function AlbumCard({ album, onClick }: AlbumCardProps) {
  const coverSrc = album.cover_url
    ? toImageUrl(album.cover_url)
    : album.first_photo_url
      ? toImageUrl(album.first_photo_url)
      : null;

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-3xl overflow-hidden bg-white shadow-lg border border-amber-100 hover:shadow-xl hover:shadow-amber-900/5 hover:scale-[1.02] transition-all duration-300"
    >
      <div className="aspect-[4/3] relative bg-amber-100">
        {coverSrc ? (
          <Image
            src={coverSrc}
            alt={album.judul}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Images size={48} className="text-amber-300" />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
        {/* Text overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="text-white font-bold text-lg leading-tight">{album.judul}</h3>
          <p className="text-white/70 text-sm mt-1">{album.foto_count} foto</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create AlbumGrid component**

```typescript
'use client';

// src/components/features/galeri/AlbumGrid.tsx
import AlbumCard, { type AlbumWithCover } from './AlbumCard';
import { Images } from 'lucide-react';

interface AlbumGridProps {
  albums: AlbumWithCover[];
  onAlbumClick: (album: AlbumWithCover) => void;
}

export default function AlbumGrid({ albums, onAlbumClick }: AlbumGridProps) {
  if (albums.length === 0) {
    return (
      <div className="text-center py-24 bg-white rounded-3xl border border-amber-100">
        <Images size={48} className="text-amber-300 mx-auto mb-4" />
        <p className="text-lg font-semibold text-slate-600">Belum ada album</p>
        <p className="text-sm text-slate-500 mt-1">Album foto kegiatan akan ditampilkan di sini.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {albums.map(album => (
        <AlbumCard key={album.id} album={album} onClick={() => onAlbumClick(album)} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create LightboxModal component**

```typescript
'use client';

// src/components/features/galeri/LightboxModal.tsx
import { useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import Fade from 'embla-carousel-fade';
import { toImageUrl } from '@/lib/storage/urls';

export interface GaleriPhoto {
  id: string;
  judul: string;
  foto_url: string;
}

interface LightboxModalProps {
  open: boolean;
  onClose: () => void;
  photos: GaleriPhoto[];
  albumTitle: string;
}

export default function LightboxModal({ open, onClose, photos, albumTitle }: LightboxModalProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'center' },
    [
      Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true }),
      Fade(),
    ]
  );

  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    onSelect();
  }, [emblaApi, onSelect]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') emblaApi?.scrollPrev();
      if (e.key === 'ArrowRight') emblaApi?.scrollNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose, emblaApi]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Tutup"
      >
        <X size={24} />
      </button>

      {/* Header */}
      <div className="absolute top-4 left-4 z-10 text-white">
        <p className="text-sm font-medium text-white/60">Album</p>
        <h2 className="text-lg font-bold">{albumTitle}</h2>
      </div>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-white text-sm font-medium">
        {selectedIndex + 1} / {photos.length}
      </div>

      {/* Carousel */}
      <div className="relative w-full max-w-[90vw] max-h-[70vh]" ref={emblaRef}>
        <div className="flex h-full">
          {photos.map(photo => (
            <div key={photo.id} className="flex-[0_0_100%] min-w-0 flex items-center justify-center">
              <div className="relative w-full aspect-[4/3] max-h-[70vh]">
                <Image
                  src={toImageUrl(photo.foto_url) || ''}
                  alt={photo.judul}
                  fill
                  className="object-contain"
                  sizes="90vw"
                  priority
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows */}
      {photos.length > 1 && (
        <>
          <button
            onClick={() => emblaApi?.scrollPrev()}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Sebelumnya"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            onClick={() => emblaApi?.scrollNext()}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Selanjutnya"
          >
            <ChevronRight size={28} />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {photos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                i === selectedIndex ? 'bg-white scale-110' : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Foto ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Caption */}
      {photos[selectedIndex] && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 text-white text-sm font-medium bg-black/40 px-4 py-1.5 rounded-full">
          {photos[selectedIndex].judul}
        </div>
      )}
    </div>
  );
}
```

Note: Also need to import `useState` at the top of the file.

- [ ] **Step 4: Commit**

```bash
git add src/components/features/galeri/AlbumCard.tsx src/components/features/galeri/AlbumGrid.tsx src/components/features/galeri/LightboxModal.tsx
git commit -m "feat: add public gallery components (AlbumCard, AlbumGrid, LightboxModal)"
```

---

### Task 8: Redesign Public Gallery Page with Album Grid + Lightbox

**Files:**
- Modify: `src/app/galeri/page.tsx`

**Interfaces:**
- Consumes: AlbumGrid, LightboxModal components
- Consumes: toImageUrl from `@/lib/storage/urls`
- Produces: Server component fetching albums with cover + client wrapper for lightbox interactivity

- [ ] **Step 1: Convert galeri page to fetch albums + uncategorized photos**

The page needs both:
1. Albums (for the grid)
2. Uncategorized photos (backward compat for photos without album_id)

Since the page uses client interactivity (lightbox), split into server component wrapper + client interactive part.

Rewrite `src/app/galeri/page.tsx`:

```typescript
// src/app/galeri/page.tsx — Halaman Galeri Publik (Album + Lightbox)

import { createServerClient } from '@/lib/supabase/server';
import { toImageUrl } from '@/lib/storage/urls';
import GaleriClient from './GaleriClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Galeri — Tim Qur\'an',
  description: 'Dokumentasi foto kegiatan Tim Qur\'an.',
};

interface AlbumRow {
  id: string;
  judul: string;
  deskripsi?: string;
  cover_url: string | null;
  urutan: number;
  is_published: boolean;
  foto_count: number;
}

interface GaleriRow {
  id: string;
  judul: string;
  foto_url: string;
  album_id: string | null;
}

interface AlbumWithCover {
  id: string;
  judul: string;
  deskripsi?: string;
  cover_url: string | null;
  foto_count: number;
  first_photo_url?: string;
}

interface GaleriPhoto {
  id: string;
  judul: string;
  foto_url: string;
}

async function getPageData() {
  try {
    const supabase = createServerClient();

    // Fetch published albums with photo count
    const { data: albumData } = await supabase
      .from('album')
      .select('*, galeri(count)')
      .eq('is_published', true)
      .order('urutan', { ascending: true })
      .order('created_at', { ascending: false });

    const albums: AlbumWithCover[] = [];

    if (albumData) {
      for (const row of albumData) {
        const count = row.galeri?.[0]?.count ?? 0;
        // Skip empty albums if desired, or show them with 0 count
        // Get first photo as fallback cover
        let firstPhotoUrl: string | undefined;
        if (!row.cover_url && count > 0) {
          const { data: firstPhoto } = await supabase
            .from('galeri')
            .select('foto_url')
            .eq('album_id', row.id)
            .eq('is_published', true)
            .order('urutan', { ascending: true })
            .limit(1)
            .maybeSingle();
          firstPhotoUrl = firstPhoto?.foto_url;
        }

        albums.push({
          id: row.id,
          judul: row.judul,
          deskripsi: row.deskripsi,
          cover_url: row.cover_url,
          foto_count: count,
          first_photo_url: firstPhotoUrl,
        });
      }
    }

    // Fetch published uncategorized photos (backward compat)
    const { data: uncategorized } = await supabase
      .from('galeri')
      .select('id, judul, foto_url')
      .eq('is_published', true)
      .is('album_id', null)
      .order('urutan', { ascending: true })
      .order('created_at', { ascending: false });

    return { albums, uncategorized: (uncategorized ?? []) as GaleriPhoto[] };
  } catch (error) {
    console.error('[GaleriPage] Fetch error:', error);
    return { albums: [], uncategorized: [] };
  }
}

export default async function GaleriPage() {
  const { albums, uncategorized } = await getPageData();

  return <GaleriClient albums={albums} uncategorized={uncategorized} />;
}
```

- [ ] **Step 2: Create the client component**

Create `src/app/galeri/GaleriClient.tsx`:

```typescript
'use client';

// src/app/galeri/GaleriClient.tsx
import { useState } from 'react';
import Image from 'next/image';
import { Camera } from 'lucide-react';
import AlbumGrid from '@/components/features/galeri/AlbumGrid';
import LightboxModal, { type GaleriPhoto } from '@/components/features/galeri/LightboxModal';
import { type AlbumWithCover } from '@/components/features/galeri/AlbumCard';
import { toImageUrl } from '@/lib/storage/urls';

interface Props {
  albums: AlbumWithCover[];
  uncategorized: GaleriPhoto[];
}

export default function GaleriClient({ albums, uncategorized }: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState<GaleriPhoto[]>([]);
  const [lightboxTitle, setLightboxTitle] = useState('');

  const openAlbum = async (album: AlbumWithCover) => {
    // Fetch photos for this album
    try {
      const res = await fetch(`/api/website/galeri?all=true`);
      const j = await res.json();
      const allPhotos: any[] = j.data ?? [];
      const albumPhotos: GaleriPhoto[] = allPhotos
        .filter((p: any) => p.album_id === album.id && p.is_published)
        .map((p: any) => ({ id: p.id, judul: p.judul, foto_url: p.foto_url }));

      if (albumPhotos.length === 0) return;
      setLightboxPhotos(albumPhotos);
      setLightboxTitle(album.judul);
      setLightboxOpen(true);
    } catch {
      // silently fail
    }
  };

  const hasContent = albums.length > 0 || uncategorized.length > 0;

  return (
    <div className="bg-amber-50 min-h-screen text-slate-800">
      {/* Hero */}
      <div className="bg-gradient-to-br from-amber-50 via-amber-100 to-white py-20 px-6 text-center">
        <span className="inline-block px-4 py-1 rounded-full border text-amber-600 text-sm font-semibold mb-4 border-amber-500/20 bg-amber-500/10">
          Dokumentasi
        </span>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Galeri Kegiatan</h1>
        <p className="text-slate-700 text-lg max-w-xl mx-auto">
          Kumpulan foto kegiatan dan dokumentasi aktivitas Tim Qur&apos;an.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-16 space-y-16">
        {/* Albums Section */}
        <section>
          <AlbumGrid albums={albums} onAlbumClick={openAlbum} />
        </section>

        {/* Uncategorized Photos (backward compat) */}
        {uncategorized.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Foto Lainnya</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {uncategorized.map(item => (
                <div key={item.id} className="group overflow-hidden rounded-3xl bg-white shadow-lg border border-amber-100 hover:shadow-amber-900/5 transition-all">
                  <div className="relative aspect-[4/3] bg-amber-100">
                    <Image
                      src={toImageUrl(item.foto_url) || ''}
                      alt={item.judul}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, 33vw"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="text-base font-semibold text-slate-900">{item.judul}</h3>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Combined empty state */}
        {!hasContent && (
          <div className="text-center py-24 bg-white rounded-3xl border border-amber-100">
            <Camera size={48} className="text-amber-600 mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-600">Belum ada foto galeri</p>
            <p className="text-sm text-slate-500 mt-1">Foto kegiatan akan ditampilkan di sini.</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      <LightboxModal
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        photos={lightboxPhotos}
        albumTitle={lightboxTitle}
      />
    </div>
  );
}
```

- [ ] **Step 3: Build to verify**

```bash
npm run build
```

Expected: No TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/galeri/page.tsx src/app/galeri/GaleriClient.tsx
git commit -m "feat: redesign public gallery with album grid and lightbox auto-swipe"
```

---

### Task 9: Final Build & Deploy

- [ ] **Step 1: Full build verification**

```bash
npm run build
```

Expected: Compiled successfully, all routes generated.

- [ ] **Step 2: Git push**

```bash
git push origin master
```

- [ ] **Step 3: Netlify deploy to production**

```bash
npx netlify deploy --prod --dir=.next
```

- [ ] **Step 4: Verify on production**

- Open https://timquran.my.id/galeri — albums should appear in grid
- Click an album — lightbox with auto-swipe should open
- Login as Kabid → Kelola Website → Album tab — create album, drag-drop upload
