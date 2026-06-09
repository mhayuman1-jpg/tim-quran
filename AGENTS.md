# AGENTS.md — Tim Qur'an

## Quick start

```bash
npm install               # also runs `npx playwright install chromium` (postinstall)
npm run dev               # next dev on http://localhost:3000
npm run build             # next build (eslint errors ignored during build)
npm run lint              # eslint src/ --ext .ts,.tsx,.js,.jsx (exits 0 even on warnings)
npm run create-admin      # node scripts/create-admin.js — CLI to seed first Kabid user
```

Supabase storage buckets needed: `timquran-rekap` (private), `timquran-profile-photos`, `timquran-assets`, `timquran-raports`. Run SQL migrations from `src/db/migrations/` and `src/lib/supabase/migrations/` in order in Supabase SQL Editor.

## Architecture

- **Next.js 14 App Router** with TypeScript, Tailwind CSS, Supabase (PostgreSQL), NextAuth v4 (Credentials, JWT, 24h session)
- RBAC: `Kabid`, `Tim_Quran`, `Sekretaris`, `Bendahara`. Kabid-only routes enforced in middleware (`src/middleware.ts:12`) and in UI sidebar
- All API routes use `SUPABASE_SERVICE_ROLE_KEY` (bypass RLS) via `src/lib/supabase/server.ts`
- Data isolation: `Tim_Quran` sees only students with `assigned_teacher_id` matching their user ID
- Raport PDF uses Playwright (server-side), signed print tokens, Supabase Storage (`raports` bucket)
- Photo uploads go to `timquran-profile-photos` bucket

## Route groups

| Group | Layout | Notes |
|---|---|---|
| `(auth)` | Minimal, no navbar | Login, unlock |
| `(dashboard)` | DashboardShell + sidebar | All admin pages, RBAC |
| `(print)` | raport-print.css | Print raport, auth via signed token |

## Key conventions

- **Project path alias:** `@/*` → `src/*`
- **Language:** Indonesian (UI, API messages, comments)
- **UI components:** `src/components/ui/` (Button, Input, Modal, Badge)
- **Shared components:** `src/components/shared/` (DataTable, RichTextEditor, ID cards, ImageUpload)
- **API pattern:** each feature has GET/POST/PUT/DELETE routes in `src/app/api/<feature>/`

## Testing

No test runner configured (playwright dep is for PDF generation, not testing).

## Database

- Main tables: `users`, `santri`, `classes`, `attendances`, `hafalan`, `tahsin`, `tahfidz`, `raport_tahfidz`, `raport_tahfidz_detail`, `rekap_bulanan`, `pengumuman`, `artikel`, `jurnal_hafalan_tahsin`
- Raport V2 uses `raport_tahfidz` (header) + `raport_tahfidz_detail` (per-surah rows with `wafa_buku`, `wafa_halaman` fields)
- `wafa_halaman` in `raport_tahfidz_detail` maps to "Ayat" in the UI form
- `wafa_buku` and `wafa_halaman` come from `hafalan` journal ONLY. The generate API (`api/raport/generate`) previously leaked `tahsin.halaman` into `wafa_halaman` — fix at `route.ts:146`
- All migrations idempotent (IF NOT EXISTS), run manually in Supabase SQL Editor
- `src/types/index.ts` has all TypeScript interfaces matching DB schema
