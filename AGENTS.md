# AGENTS.md — Tim Qur'an

## Quick start

```bash
npm install               # postinstall: `npx playwright install chromium`
npm run dev               # next dev on http://localhost:3000
npm run build             # eslint ignored during build (next.config.mjs)
npm run lint              # eslint src/ -- always exits 0 (eslint.config.cjs + .eslintrc.json coexist)
npm run create-admin      # node scripts/create-admin.js — seeds first Kabid user interactively
```

## Architecture

- **Next.js 14 App Router**, TypeScript, Tailwind CSS, Supabase (PostgreSQL), NextAuth v4 (Credentials, JWT, 24h session)
- **RBAC:** `Kabid`, `Tim_Quran`, `Sekretaris`, `Bendahara`. Kabid-only routes in middleware (`src/middleware.ts:12` list), Sekretaris+Kabid on `/laporan-masuk`, `/rekap`
- **Auth flow:** RPC `auth_user()` first; falls back to bcrypt compare on `users.password_hash`
- **JWT auto-refresh:** Every request re-fetches `{id, name, role, photo_url}` from DB in JWT callback
- **API routes:** All use `SUPABASE_SERVICE_ROLE_KEY` (bypass RLS) via `src/lib/supabase/server.ts` — never in client components
- **Data isolation:** `Tim_Quran` sees only students with `assigned_teacher_id` matching their user ID
- **Route groups:** `(auth)` minimal layout, `(dashboard)` → `DashboardShell` + sidebar (incl `dashboard-guru/` for teacher view with different sidebar), `(print)` → minimal layout, raport-print.css, auth via page-level check (signed print-token bypasses Edge middleware)
- **23 API route groups** in `src/app/api/<feature>/` — each typically GET/POST/PUT/DELETE

## Storage (two backends)

| Backend | Buckets | Used for |
|---|---|---|
| **Tigris** (S3-compatible, `src/lib/storage/tigris.ts`) | `timquran-assets`, `timquran-rekap`, `timquran-raports`, `timquran-profile-photos` | Assets, rekap files, raport PDFs, profile photos |
| **Supabase Storage** | `timquran-rekap`, `timquran-profile-photos`, `timquran-assets`, `timquran-raports` | (configured, may overlap with Tigris) |

Image URLs from Tigris use proxy: `/api/images/<bucket>/<key>` (see `src/lib/storage/urls.ts`).

## Key conventions

- **Path alias:** `@/*` → `src/*`
- **Language:** Indonesian (UI, API, comments)
- **UI:** `src/components/ui/` (Button, Input, Modal, Badge), `src/components/shared/` (DataTable, RichTextEditor, ImageUpload)
- **API:** each feature has routes in `src/app/api/<feature>/`
- **No test runner** — Playwright dep is for PDF generation only

## Database

- Main tables: `users`, `santri`, `classes`, `attendances`, `hafalan`, `tahsin`, `tahfidz`, `raport_tahfidz`, `raport_tahfidz_detail`, `rekap_bulanan`, `pengumuman`, `artikel`, `jurnal_hafalan_tahsin`
- Raport V2: `raport_tahfidz` (header) + `raport_tahfidz_detail` (per-surah rows with `wafa_buku`, `wafa_halaman`)
- `wafa_halaman` in raport_detail maps to "Ayat" in the UI form; data source is `hafalan` journal ONLY (not `tahsin`)
- **Two migration directories** — apply in this order:
  1. `src/lib/supabase/migrations/` (001-013, foundational)
  2. `src/db/migrations/` (014+, raport V2, fixes)
- All migrations idempotent (`IF NOT EXISTS`), run manually in Supabase SQL Editor
- `src/types/index.ts` has TypeScript interfaces matching DB schema; `src/types/next-auth.d.ts` augments NextAuth types with `role`, `photo_url`
