# Album Galeri & Lightbox Auto-Swipe — Design Spec

**Date:** 2026-08-08
**Status:** Approved
**Project:** Tim Quran Website — Galeri

---

## Overview

Three-part feature on the existing gallery:

1. **Album system** — Kabid can group photos into albums (one album = many photos)
2. **Drag-and-drop multi-upload** — Upload many photos at once per album via drag-drop from file explorer
3. **Public gallery lightbox** — Album grid on public page → click album → lightbox with auto-swipe carousel

---

## 1. Database

### New table: `album`

```sql
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

ALTER TABLE album ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read album" ON album FOR SELECT TO anon, authenticated USING (true);
```

### Modify existing table: `galeri`

```sql
ALTER TABLE galeri ADD COLUMN IF NOT EXISTS album_id uuid REFERENCES album(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_galeri_album_id ON galeri(album_id);

-- Existing photos (album_id = NULL) stay visible as before — treated as "uncategorized" in public view.
```

**Design decisions:**
- `ON DELETE SET NULL` — deleting an album doesn't delete its photos; they become uncategorized
- `cover_url` nullable — if NULL, first photo in album serves as cover
- Photos without `album_id` remain visible on public page for backward compatibility (shown as "Uncategorized" or mixed in with albums if desired)

---

## 2. API

### 2.1 New: `api/website/album` (CRUD)

| Method | Auth | Body/Params | Behavior |
|--------|------|-------------|----------|
| **GET** | Public | `?all=true` (optional) | Returns albums ordered by `urutan ASC`. Includes `foto_count` (COUNT from galeri). If `all=false` (default), filters `is_published=true`. |
| **POST** | Kabid | `{ judul, deskripsi?, cover_url?, urutan?, is_published? }` | Creates album, revalidates `/` and `/galeri` |
| **PUT** | Kabid | `{ id, judul?, deskripsi?, cover_url?, urutan?, is_published? }` | Updates album, revalidates |
| **DELETE** | Kabid | `{ id }` | Deletes album row. Photos set to `album_id = NULL` (FK ON DELETE SET NULL). Revalidates. |

### 2.2 Modified: `api/website/galeri` (multi-upload)

**Existing endpoints unchanged** (GET/PUT/DELETE). Only POST gains multi-file support:

| Method | Change |
|--------|--------|
| **POST (existing)** | Still works with single `foto_url`. Add optional `album_id` field. |
| **POST (new mode)** | Accept `multipart/form-data` with `album_id` + multiple `files[]`. Uploads each to Tigris `galeri/`, inserts batch rows into `galeri` with the `album_id`. Returns `{ inserted: N, photos: [...] }`. |

Multipart POST flow:
1. Validate auth (Kabid)
2. Validate `album_id` exists
3. For each file in `files[]`:
   - Validate MIME type + size (≤5MB, same rules as existing upload)
   - Upload to Tigris `galeri/{timestamp}-{rand}.{ext}`
   - Insert row into `galeri` (student_id, teacher_id → NULL since this is website gallery, not student journal)
4. Revalidate `/` and `/galeri`

---

## 3. Dashboard UI (Kabid)

### 3.1 Album Management Tab

Added as a new tab **"Album"** in `/(dashboard)/website/page.tsx` alongside existing tabs (Profil, Program, Agenda, Galeri, Menu Navigasi).

**Album list view:**
- Grid of album cards with: cover image (or placeholder if empty), title, photo count
- Each card: hover → Edit / Delete buttons
- "Buat Album" button (top-right)
- Drag-to-reorder (future; not in this iteration)

**Create/Edit Album modal:**
- Judul (text input, required)
- Deskripsi (textarea, optional)
- Cover foto (ImageUpload, optional — upload via existing ImageUpload component)
- Published toggle
- Urutan (number input)

### 3.2 Album Detail / Multi-Upload

Clicking an album card opens a detail view (or expand within the card):

- Album header: title, description, published badge
- **Drop zone area:** dashed border rectangle with "Seret & lepas foto di sini, atau klik untuk pilih" text
  - Accepts drag-drop from Windows Explorer
  - Accepts click → file picker (multiple)
  - Shows uploading progress (spinner per file or overall progress)
- **Photo grid below:** thumbnails of photos already in this album
  - Each photo: thumbnail, title, delete button
  - Delete removes from `galeri` (API existing DELETE)

**Upload state machine:**
```
idle → dragging (visual feedback: border highlight) → uploading (per-file progress) → done (photos appear in grid)
```

### 3.3 Changes to Existing Galeri Tab

Existing "Galeri" tab keeps working for uncategorized photos. Add an optional "Album" dropdown/selector when adding photos so photos can be assigned to an album from here too.

---

## 4. Public Gallery Page (`/galeri`)

### 4.1 Layout

```
┌─────────────────────────────────────────┐
│  Hero: "Galeri Kegiatan"               │
│  "Dokumentasi kegiatan Tim Quran"      │
├─────────────────────────────────────────┤
│                                         │
│  ┌────────┐  ┌────────┐  ┌────────┐   │
│  │ Cover  │  │ Cover  │  │ Cover  │   │
│  │        │  │        │  │        │   │
│  │Judul   │  │Judul   │  │Judul   │   │
│  │5 foto  │  │3 foto  │  │8 foto  │   │
│  └────────┘  └────────┘  └────────┘   │
│                                         │
│  (Responsive: 1 col mobile, 3 col lg)  │
└─────────────────────────────────────────┘
```

- Server component, fetch albums + their first photo as cover
- Album cards: aspect-[4/3] cover image, subtle gradient overlay at bottom, title + photo count
- Hover: scale(1.02) + shadow-lg transition
- Empty state: "Belum ada album" icon + text
- **Backward compat:** Photos without `album_id` are shown as individual cards at the bottom, or grouped under a virtual "Lainnya" album if present

### 4.2 Album Card

```tsx
// Data fetched: album + cover photo (first by urutan/created_at)
interface AlbumWithCover {
  id: string;
  judul: string;
  deskripsi?: string;
  cover_url: string | null;
  foto_count: number;
  first_photo_url?: string; // fallback if no cover_url
}
```

Cover logic: `album.cover_url ?? first_photo_url ?? null` → if both null, show placeholder (Image icon)

### 4.3 Lightbox Modal

Client component (`'use client'`) using **Embla Carousel** with `Autoplay` plugin.

```
┌──────────────────────────────────────┐
│ [X]                    Album: Wisuda │
│                                      │
│  ┌────────────────────────────────┐  │
│  │                                │  │
│  │       [Full Photo]             │  │
│  │       object-contain           │  │
│  │                                │  │
│  └────────────────────────────────┘  │
│                                      │
│     ◄          ● ○ ○ ○          ►   │
│               1 / 5                  │
│                                      │
│         Judul foto di sini          │
└──────────────────────────────────────┘
```

**Implementation:**
- Modal overlay: `bg-black/80`, `backdrop-blur-sm`, z-50
- Carousel: Embla with `loop`, `autoplay` (4s interval), `fade` transition
- **Autoplay pauses** on hover or touch
- Navigation: chevron buttons (left/right), dot indicators (clickable)
- Counter: "1 / 5" text
- Each slide: `<img>` with `object-contain`, `max-h-[70vh]`, `max-w-[90vw]`
- Photo caption: `item.judul` shown below image
- Keyboard: ← → to navigate, Esc to close
- Close: X button (top-right) or click outside image area

**Dependencies to add:** `embla-carousel-react`, `embla-carousel-autoplay`, `embla-carousel-fade`

---

## 5. Component Architecture

```
src/
├── components/
│   ├── features/
│   │   └── galeri/
│   │       ├── AlbumCard.tsx          # Public album card (NEW)
│   │       ├── AlbumGrid.tsx          # Public album grid (NEW)
│   │       ├── LightboxModal.tsx      # Embla carousel modal (NEW)
│   │       ├── MultiUploadDrop.tsx    # Drag-drop multi-upload zone (NEW)
│   │       └── AlbumDetailModal.tsx   # Dashboard album detail (NEW)
│   └── shared/
│       └── ImageUpload.tsx            # MODIFY: add `multiple` prop support
├── app/
│   ├── api/
│   │   └── website/
│   │       ├── album/route.ts         # NEW: CRUD album
│   │       └── galeri/route.ts        # MODIFY: multipart upload
│   └── galeri/page.tsx                # MODIFY: album grid + lightbox
└── lib/
    └── supabase/
        └── migrations/
            └── 007_album.sql           # NEW migration
```

---

## 6. Error Handling

| Scenario | Behavior |
|---|---|
| Upload file > 5MB | Reject with toast "File X melebihi 5MB" |
| Invalid file type | Reject with toast "Format file tidak didukung" |
| Album not found | 404 JSON response |
| No auth (non-Kabid tries write) | 403 Forbidden |
| Tigris upload failure | 500 + toast "Gagal upload foto" |
| Empty album opened in lightbox | Show "Album ini belum memiliki foto" |
| Network error during upload | Toast + retry button |

---

## 7. Scope Boundaries

**In this scope:**
- ✅ Album CRUD (Kabid dashboard)
- ✅ Multi-file drag-drop upload to album
- ✅ Public album grid page
- ✅ Lightbox auto-swipe carousel
- ✅ Backward compat for existing photos (album_id = NULL shown as uncategorized)
- ✅ RLS + auth enforcement at API layer

**Out of scope (future):**
- ❌ Drag-to-reorder photos within album
- ❌ Drag-to-reorder albums
- ❌ Video support in gallery
- ❌ Album sharing / social media
- ❌ Photo metadata (EXIF, date taken)
- ❌ Delete Tigris files when gallery item deleted (existing gap — not introduced by this feature)
- ❌ Batch edit photo titles

---

## 8. Dependencies

- **New:** `embla-carousel-react`, `embla-carousel-autoplay`, `embla-carousel-fade`
- **Existing:** Next.js 14, Tailwind CSS, Supabase, Tigris storage, lucide-react, next/image
