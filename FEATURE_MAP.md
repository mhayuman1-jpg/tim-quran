# Tim Qur'an — Comprehensive Feature Map

> Auto-generated from source analysis of all page.tsx files, Sidebar, DashboardShell, and middleware.ts

---

## 1. System Architecture Overview

| Layer | Details |
|---|---|
| Framework | Next.js 14 App Router, `'use client'` pages with `force-dynamic` |
| Auth | NextAuth.js (credentials provider), custom `wali-credentials` for guardians |
| RBAC | 5 roles: `Kabid`, `Tim_Quran`, `Sekretaris`, `Bendahara`, `Wali_Murid` |
| Shell | `DashboardShell` → `Sidebar` + `Header` + `ToastProvider` + `ViewModeProvider` |
| Database | Supabase (PostgreSQL) |

---

## 2. Roles

| Role | Label | Color | Description |
|---|---|---|---|
| `Kabid` | Kepala Bidang | `#6366f1` | Full admin access — all features |
| `Tim_Quran` | Tim Qur'an | `#3b82f6` | Teacher — manages students assigned to their classes |
| `Sekretaris` | Sekretaris | `#10b981` | Secretary — can view/manage data, viewed "under Kabid" |
| `Bendahara` | Bendahara | `#f59e0b` | Treasurer — limited dashboard access |
| `Wali_Murid` | Wali Murid | `#34d399` | Parent/guardian — separate portal with NIS-based login |

---

## 3. Middleware RBAC Rules (`src/middleware.ts`)

### KABID_ONLY_ROUTES (redirect non-Kabid → `/dashboard?error=forbidden`)
`/kelas`, `/semester`, `/tim`, `/dashboard/kelola-artikel`, `/absensi/monitoring`, `/absensi/kabid-mark`, `/website`, `/dashboard/website`, `/admin`, `/kalender-libur`

### MANAJEMEN_ROUTES (Kabid + Sekretaris only)
`/laporan-masuk`, `/rekap`

### PUBLIC_WALI_ROUTES (no auth required)
`/wali/login`

### Matcher
All `/dashboard/*`, `/siswa/*`, `/absensi/*`, `/raport/*` (except `/raport/print/*`), `/scan/*`, `/rekap/*`, `/pengaturan/*`, `/semester/*`, `/kalender-libur/*`, `/kelas/*`, `/tim/*`, `/laporan*`, `/dashboard/kelola-artikel/*`, `/website/*`, `/dashboard/website/*`, `/admin/*`, `/wali/*`

---

## 4. Sidebar Navigation (`src/components/layout/Sidebar.tsx`)

### Menu Groups & Items

| Group | Label | Href | Icon | Visible To |
|---|---|---|---|---|
| **Utama** | Dashboard | `/dashboard` | `LayoutDashboard` | All roles |
| **Utama** | Dashboard Guru | `/dashboard-guru` | `LayoutDashboard` | Kabid, Sekretaris |
| **Akademik** | Data Siswa | `/siswa` | `Users` | Kabid, Tim_Quran, Sekretaris |
| **Akademik** | Hafalan & Tahsin | `/tahsin` | `BookOpen` | Kabid, Tim_Quran, Sekretaris |
| **Akademik** | Raport | `/raport` | `FileText` | Kabid, Tim_Quran, Sekretaris |
| **Kehadiran** | Absensi | `/absensi` | `BarChart2` | Kabid, Tim_Quran, Sekretaris |
| **Kehadiran** | Monitoring | `/absensi/monitoring` | `TrendingUp` | Kabid only |
| **Kehadiran** | Tandai Hadir | `/absensi/kabid-mark` | `UserX` | Kabid only |
| **Manajemen** | Pesan | `/pesan` | `MessageCircle` | Kabid, Sekretaris |
| **Manajemen** | Rekap Tahfidz & Tahsin | `/rekap` | `Repeat` | Kabid, Sekretaris |
| **Manajemen** | Laporan Progres | `/laporan` | `TrendingUp` | Kabid, Sekretaris |
| **Manajemen** | Semester | `/semester` | `CalendarDays` | Kabid only |
| **Manajemen** | Kalender Libur | `/kalender-libur` | `CalendarOff` | Kabid only |
| **Manajemen** | Kelas | `/kelas` | `School` | Kabid only |
| **Manajemen** | Tim Qur'an | `/tim` | `UserCheck` | Kabid only |
| **Konten** | Kelola Pengumuman | `/dashboard/pengumuman` | `Megaphone` | Kabid, Sekretaris, Bendahara |
| **Konten** | Kelola Artikel | `/dashboard/kelola-artikel` | `Newspaper` | Kabid, Sekretaris |
| **Konten** | Kelola Testimoni | `/kelola-testimoni` | `MessageSquareQuote` | Kabid only |
| **Konten** | Kelola Website | `/dashboard/website` | `Globe` | Kabid only |
| **Akun** | Pengaturan | `/pengaturan` | `Settings` | All (no roles restriction) |

### Sidebar Features
- Unread message badge on "Pesan" menu item (polls `/api/messages/unread-count` every 30s)
- User profile card at bottom with avatar, name, role, and "Mode Mengajar" indicator
- View mode support (Kabid/Sekretaris can "view as" Tim_Quran teacher)
- Mobile: collapsible with overlay backdrop

---

## 5. Page-by-Page Feature Map

### 5.1 Landing & Public Pages

#### `src/app/page.tsx` — Landing Page
- **Access**: Public (no auth)
- **Features**: Hero section, Islamic decorations, student progress chart (Recharts), testimonials, programs, agenda preview
- **UI**: `PublicNavbar`, `StudentProgressChart` (dynamic/SSR disabled), `TestimonialBubble`
- **Data**: Server-side from Supabase (`profil_website`, `program`, `agenda`, `testimonials`)

#### `src/app/profil/page.tsx` — Public Profile
- **Access**: Public
- **Features**: Institution profile — visi, misi, contact, social media
- **Data**: Server-side from Supabase (`profil_website`)

#### `src/app/artikel/page.tsx` — Article List (Public)
- **Access**: Public
- **Features**: Grid of published articles with cover images, author, date
- **Data**: Server-side from Supabase (`artikel` table, published only)

#### `src/app/artikel/[slug]/page.tsx` — Article Detail (Public)
- **Access**: Public
- **Features**: Full article view with cover image, author, content, social share meta tags
- **Data**: Server-side from Supabase

#### `src/app/agenda/page.tsx` — Public Agenda
- **Access**: Public
- **Features**: Upcoming and past events with date, time, location
- **Data**: Server-side from Supabase (`agenda` table)

#### `src/app/pengumuman/page.tsx` — Public Announcements
- **Access**: Public
- **Features**: List of published announcements
- **Data**: Server-side from Supabase (`pengumuman` table)

#### `src/app/galeri/page.tsx` — Public Gallery
- **Access**: Public
- **Features**: Photo gallery grid of published images
- **Data**: Server-side from Supabase (`galeri` table)

#### `src/app/program/page.tsx` — Public Programs
- **Access**: Public
- **Features**: Program cards with icons, descriptions
- **Data**: Server-side from Supabase (`program` table)

#### `src/app/info/page.tsx` — Redirect
- **Access**: Public
- **Features**: Redirects to `/pengumuman`

---

### 5.2 Auth Pages

#### `src/app/(auth)/auth/login/page.tsx` — Staff Login
- **Access**: Public (pre-auth)
- **Features**: Email + password form, "Remember Me" checkbox (localStorage), role-based redirect after login
- **Forms**: Email input, password input with show/hide toggle, remember me checkbox
- **Post-login**: Kabid/Sekretaris → role-select; Tim_Quran → `/dashboard-guru`; Bendahara → `/dashboard`

#### `src/app/(auth)/auth/unlock/page.tsx` — Access Code Gate
- **Access**: Public
- **Features**: Access code verification (gates the login page)
- **Forms**: Code input field
- **API**: `POST /api/auth/verify-code`
- **Post-verify**: Sets `auth_unlocked` in sessionStorage, redirects to `/auth/login`

#### `src/app/(dashboard)/role-select/page.tsx` — Role View Selector
- **Access**: Kabid, Sekretaris only (redirects others to `/dashboard`)
- **Features**: Choose between "Admin" view or "Guru" (teaching) view
- **Post-select**: Sets `viewAsRole` via `useViewMode` hook, redirects to `/dashboard`

#### `src/app/wali/login/page.tsx` — Guardian (Wali) Login
- **Access**: Public (excluded from middleware)
- **Features**: NIS-based login (no password — simple guardian identification)
- **Forms**: NIS input
- **Post-login**: Redirects to `/wali/dashboard`

---

### 5.3 Dashboard Pages

#### `src/app/(dashboard)/dashboard/page.tsx` — Main Dashboard
- **Access**: All authenticated roles (non-Wali_Murid)
- **Features**:
  - Greeting banner with time-based greeting + Arabic decoration
  - Audio greeting (auto-play with fallback button)
  - 3 stat cards: Santri Aktif, Kehadiran Hari Ini (with progress bar), Tim Aktif
  - Juz distribution bar chart (hafalan per juz)
  - **Staff ID Card** section (download as PNG or PDF via `html-to-image` + `jsPDF`)
  - **Sekretaris shortcuts** section with quick links (Data Siswa, Rekap, Laporan, etc.)
- **UI Components**: `StatCard`, `JuzChart`, `StaffIDCard`
- **API**: `/api/dashboard/stats` (admin) or `/api/dashboard/stats-guru` (teacher mode)
- **Role behavior**: Tim_Quran (or Kabid in teaching mode) uses stats-guru endpoint

#### `src/app/(dashboard)/dashboard-guru/page.tsx` — Teacher Dashboard
- **Access**: Kabid, Sekretaris (view as "Guru" mode)
- **Features**:
  - Greeting banner for teacher-specific data
  - 3 stat cards: Siswa Diampu, Kehadiran Hari Ini, Hafalan Terakhir
  - Juz distribution chart for assigned students
  - Recent Hafalan list (latest recordings)
  - Recent Tahsin list (latest tahsin recordings)
  - Quick links: Data Siswa, Hafalan & Tahsin, Raport, Kirim Laporan
  - Staff ID Card with PNG download
- **API**: `/api/dashboard/stats-guru`

---

### 5.4 Academic Pages

#### `src/app/(dashboard)/siswa/page.tsx` — Student Data Management
- **Access**: Kabid, Tim_Quran, Sekretaris
- **Features**:
  - Student list with search, class filter, limit selector
  - Add/Edit student (modal form)
  - Delete single + bulk delete with confirmation
  - Import Excel (modal)
  - Export Excel
  - Print ID Card (single or selected) → redirects to `/siswa/print`
  - Download PDF (bulk ID cards as A4 landscape PDF)
- **Teacher Mode**: Class-first view (select class → see students)
- **Forms**: `SiswaForm` (add/edit modal), `ImportExcelModal`
- **Tables**: `SiswaTable` with selection checkboxes
- **Modals**: Form modal, delete confirm, bulk delete confirm, import modal
- **UI Actions (role-based)**:
  - Tim_Quran: Cannot add/edit/delete students, no export/import
  - Kabid/Sekretaris: Full CRUD, bulk operations

#### `src/app/(dashboard)/siswa/print/page.tsx` — Print Student ID Cards
- **Access**: Kabid, Tim_Quran, Sekretaris (via URL with student IDs)
- **Features**:
  - Renders selected students' ID cards (85mm × 55mm business card size)
  - Print via browser (`react-to-print`, A4 Landscape)
  - Download individual PNG
  - Download all as PDF (A4 Landscape, 3×3 grid = 9 cards/page)
- **UI**: `StudentIDCard` component
- **Query param**: `?ids=student1,student2,...`

#### `src/app/(dashboard)/tahsin/page.tsx` — Hafalan & Tahsin Journal
- **Access**: Kabid, Tim_Quran, Sekretaris
- **Features**:
  - QR Scanner integration (attendance check before journaling)
  - Student list (left panel) with search, class filter
  - Hafalan & Tahsin history (right panel) per selected student
  - Add combined hafalan+tahsin journal entry (modal)
  - Edit hafalan records (inline modal)
  - Edit tahsin records (inline modal)
  - Delete hafalan/tahsin records
  - Audio feedback: success beep, warning beep, error beep
  - Today's attendance list (scanned students)
- **Teacher Mode**: Class-first view, only assigned students
- **Forms**: `JurnalHafalanTahsinForm`, `HafalanForm`, `TahsinForm`
- **UI Components**: `QRScanner` (dynamic), `TahsinHistory`, `HafalanHistory`

#### `src/app/(dashboard)/raport/page.tsx` — Raport Management
- **Access**: Kabid, Tim_Quran, Sekretaris
- **Features**:
  - **Admin view** (Kabid/Sekretaris): Class groups with raport counts, filter by period
  - **Teacher view** (Tim_Quran): Class-first view → raport list per class
  - View raport detail (inline preview with `RaportTahfidzPrintable`)
  - Add/Edit raport (modal form `RaportTahfidzForm`)
  - Delete raport with confirmation
  - **Print** via browser (`react-to-print`)
  - **Download PDF** (server-rendered via `/api/raport/render-pdf`)
  - **Download Word** (DOCX via `triggerRaportDocxDownload`)
  - **Download Excel** (client-side XLSX generation)
  - Multi-juz raport support (sibling raports for same student+period)
  - Inline editing mode for quick changes
- **Forms**: `RaportTahfidzForm` (student, period, juz, tahsin details, surah detail table)
- **Modals**: Form modal, delete confirm
- **APIs**: `/api/raport/admin-list`, `/api/raport/tahfidz`, `/api/raport/render-pdf`

#### `src/app/(dashboard)/hafalan/page.tsx` — Hafalan Recording (standalone)
- **Access**: Kabid, Tim_Quran, Sekretaris
- **Features**:
  - Add/Edit hafalan records (modal form)
  - Hafalan history with date filters
  - Class-first view for Tim_Quran
  - Download hafalan data
- **Forms**: `HafalanForm` (student, date, surah/juz, page, score, notes)
- **UI Components**: `HafalanHistory`

#### `src/app/(dashboard)/tahfidz/page.tsx` — Tahfidz Recording (standalone)
- **Access**: Kabid, Tim_Quran, Sekretaris
- **Features**:
  - Add/Edit tahfidz records (modal form)
  - Tahfidz history
- **Forms**: `TahfidzForm` (student, date, surah/juz, page, score, notes)
- **UI Components**: `TahfidzHistory`

---

### 5.5 Attendance Pages

#### `src/app/(dashboard)/absensi/page.tsx` — Attendance Data
- **Access**: Kabid, Tim_Quran, Sekretaris
- **Features**:
  - Class-first grid (select class → attendance views)
  - **Harian** (daily) tab: Date picker + table showing hadir/tidak hadir per student
  - **Bulanan** (monthly) tab: Month selector + table with attendance percentages
  - Export attendance data
- **UI Components**: `DataTable`, `Badge` (status badges)
- **APIs**: `/api/absensi/harian`, `/api/absensi/bulanan`

#### `src/app/(dashboard)/absensi/monitoring/page.tsx` — Attendance Monitoring
- **Access**: Kabid only (middleware-enforced)
- **Features**:
  - Class grid → select class → attendance chart
  - Line/bar chart showing daily attendance trends (Recharts, dynamic import)
  - Date range filter (7/14/30/60/90 days)
  - Per-class attendance visualization
- **UI Components**: `AttendanceChart` (dynamic, SSR disabled)

#### `src/app/(dashboard)/absensi/kabid-mark/page.tsx` — Kabid Manual Attendance
- **Access**: Kabid only (middleware-enforced)
- **Features**:
  - Select class → view student list → mark individual students as "Hadir"
  - Manual override for attendance marking
  - Search/filter students within class
  - Confirmation modal for mark action
- **UI Components**: `Button`, `Badge`, `Modal`

#### `src/app/(dashboard)/scan/page.tsx` — QR Scanner (Standalone)
- **Access**: Kabid, Tim_Quran, Sekretaris
- **Features**:
  - Full-screen QR scanner for student ID cards
  - Auto-mark attendance on scan
  - Success/error/warning audio feedback
  - Opens `JurnalHafalanTahsinForm` after scan for quick journal entry
- **UI Components**: `QRScanner` (dynamic), `JurnalHafalanTahsinForm` (dynamic)

---

### 5.6 Management Pages

#### `src/app/(dashboard)/rekap/page.tsx` — Semester Recap
- **Access**: Kabid, Sekretaris (middleware-enforced)
- **Features**:
  - Charts: Bar, Line, Pie charts (Recharts) for student progress
  - Per-student recap table (hafalan count, tahsin count, attendance %)
  - Monthly progress comparison
  - Semester comparison (side-by-side)
  - Export recap as PNG
- **UI Components**: `BarChart`, `LineChart`, `PieChart` from Recharts, `Button`
- **API**: `/api/rekap`

#### `src/app/(dashboard)/laporan/page.tsx` — Progress Report
- **Access**: Kabid, Sekretaris
- **Features**:
  - Select Tim_Quran member from dropdown
  - View all students under that teacher with progress summary
  - Detail modal: full history of hafalan, tahsin, attendance per student
  - Search/filter students
- **UI Components**: `Button`, `Badge`, `Modal`
- **API**: `/api/laporan`

#### `src/app/(dashboard)/laporan-kirim/page.tsx` — Send Report (Teacher)
- **Access**: Tim_Quran
- **Features**:
  - Auto-generate recap data for all assigned students
  - Preview recap summary + per-student breakdown
  - Send report to Kabid/Sekretaris
  - View sent report history (status: draft/sent/reviewed)
  - Detail view of previously sent reports
- **UI Components**: `Button`, `Badge`, `Modal`
- **API**: `/api/laporan-baru`

#### `src/app/(dashboard)/laporan-masuk/page.tsx` — Incoming Reports (Admin)
- **Access**: Kabid, Sekretaris (middleware-enforced)
- **Features**:
  - View all reports from Tim_Quran members
  - Filter by status (all/sent/reviewed)
  - Search reports
  - Review reports (add review note, mark as "reviewed")
  - Detail modal with full report data
- **UI Components**: `Button`, `Badge`, `Modal`
- **API**: `/api/laporan-baru`

#### `src/app/(dashboard)/semester/page.tsx` — Semester Management
- **Access**: Kabid only (middleware-enforced)
- **Features**:
  - Set semester name, end date, notes
  - Transfer students to new class (bulk)
  - Reset semester (with option to reset juz progress)
  - Full reset (destructive — confirmation required)
  - Deactivate semester
  - Student list with class filter, search, bulk selection
- **Modals**: Reset confirm, Full reset confirm, Deactivate confirm, Transfer confirm
- **Forms**: Semester settings, student transfer target class selector

#### `src/app/(dashboard)/kalender-libur/page.tsx` — Holiday Calendar
- **Access**: Kabid only (middleware-enforced)
- **Features**:
  - Calendar view with colored holiday types
  - Holiday types: National, School, Religious, Other
  - Add/delete holidays (modal form)
  - Filter by type
  - Month navigation
- **UI Components**: `Button`, `Modal`

#### `src/app/(dashboard)/kelas/page.tsx` — Class Management
- **Access**: Kabid only (middleware-enforced)
- **Features**:
  - Class table with student count, assigned teachers
  - Add class (modal form)
  - Edit class name (inline)
  - Delete class with confirmation (shows affected student count)
  - Assign/unassign teachers per class (manual + auto-assign)
  - Assign class teacher name/NIY
  - Export class data
  - Bulk student transfer between classes
- **UI Components**: `Button`, `Input`, `Modal`, `ConfirmDialog`

#### `src/app/(dashboard)/tim/page.tsx` — Team Management
- **Access**: Kabid only (middleware-enforced)
- **Features**:
  - Team member table with name, email, role, status, photo
  - Add member (modal: name, email, role, password, photo upload)
  - Edit member (inline or modal)
  - Toggle active/inactive status
  - Reset password
  - Delete member with confirmation
  - Upload profile photo via `ImageUpload`
- **UI Components**: `Button`, `Input`, `Modal`, `Badge`, `ConfirmDialog`, `ImageUpload`

---

### 5.7 Messaging

#### `src/app/(dashboard)/pesan/page.tsx` — Messages (Staff)
- **Access**: Kabid, Sekretaris
- **Features**:
  - Message list from guardians (wali murid) about their children
  - Select message → view thread
  - Reply to messages
  - Search messages
  - Delete messages
  - Read/unread status tracking
  - Unread count badge in sidebar
- **UI**: `MessageCircle`, `Send`, `Search`, `ArrowLeft`, `CheckCheck`, `Clock`

#### `src/app/wali/pesan/page.tsx` — Messages (Guardian)
- **Access**: Wali_Murid
- **Features**:
  - View messages from Kabid
  - Send new message about their child
  - Message thread view
  - Delete sent messages
  - Read/unread status
- **UI**: `Send`, `MessageCircle`, `Clock`, `CheckCheck`, `Trash2`

---

### 5.8 Content Management

#### `src/app/(dashboard)/dashboard/pengumuman/page.tsx` — Manage Announcements
- **Access**: Kabid, Sekretaris, Bendahara
- **Features**:
  - List announcements with title, target audience, date
  - Add announcement (modal: title, content, target)
  - Edit announcement
  - Delete with confirmation
  - Target options: Semua, Guru, Siswa, Orang Tua
- **UI Components**: `Button`, `Input`, `Modal`, `Badge`, `ConfirmDialog`

#### `src/app/(dashboard)/dashboard/kelola-artikel/page.tsx` — Manage Articles
- **Access**: Kabid, Sekretaris (middleware-enforced: Kabid only)
- **Features**:
  - Article list with cover image, title, author, publish status
  - Add article (modal with Rich Text Editor, cover image upload)
  - Edit article (inline modal)
  - AI article generator (`ArtikelGenerator` component)
  - Publish/unpublish toggle
  - Delete with confirmation
  - Preview article (link to public page)
- **UI Components**: `Button`, `Badge`, `ConfirmDialog`, `ImageUpload`, `RichTextEditor` (lazy), `ArtikelGenerator`

#### `src/app/(dashboard)/kelola-testimoni/page.tsx` — Manage Testimonials
- **Access**: Kabid only
- **Features**:
  - Testimonial list with parent name, child name, rating, message
  - Filter: all/pending/approved
  - Approve testimonial
  - Delete testimonial
  - Search testimonials
- **UI**: `MessageSquareQuote`, `Check`, `Trash2`, `Star`, `User`

#### `src/app/(dashboard)/website/page.tsx` — Website Content Management
- **Access**: Kabid only (middleware-enforced)
- **Features** (5 tabs):
  1. **Profil & Visi Misi**: Edit institution name, description, visi, misi (add/remove points), contact info, social media links, logo uploads (auto-save on upload)
  2. **Program**: CRUD programs with name, description, icon, order, active toggle
  3. **Agenda**: CRUD events with title, description, date, time, location, publish toggle
  4. **Galeri**: Upload photos with titles, reorder, publish toggle
  5. **Navigasi Menu**: Manage public website navigation items (CRUD, reorder, active toggle)
- **UI Components**: `Button`, `Input`, `Modal`, `Badge`, `ConfirmDialog`, `ImageUpload`
- **Preview**: Live navbar preview with logo, ID card header preview

#### `src/app/(dashboard)/dashboard/website/page.tsx` — Website (Redirect)
- **Access**: Kabid only
- **Features**: Re-exports the Website page (alias at `/dashboard/website`)

---

### 5.9 Guardian (Wali) Portal

#### `src/app/wali/dashboard/page.tsx` — Guardian Dashboard
- **Access**: Wali_Murid
- **Features**:
  - Child's profile info (name, NISN, class, status)
  - Hafalan history with scores
  - Tahsin history with scores
  - Raport list with scores (makhroj, tajwid, lancar)
  - Attendance summary with percentage
  - Charts/visualizations for progress
  - Quick stats cards
- **UI Components**: Stat cards, charts, tables

---

### 5.10 Admin Tools

#### `src/app/(dashboard)/admin/fix-qr/page.tsx` — QR Code Fix Tool
- **Access**: Kabid only (middleware-enforced via `/admin` route)
- **Features**:
  - Upload PDF of printed ID cards
  - Extract QR codes from uploaded PDFs (OCR/decode)
  - Match extracted QR codes against database records
  - Preview extracted cards with match status
  - Bulk update QR codes in database
  - View stored PDFs for re-processing
- **UI Components**: `Button`, `Modal`
- **File handling**: PDF upload, QR extraction, batch database updates

#### `src/app/(print)/raport/print/[id]/page.tsx` — Raport Print Page (Server)
- **Access**: Token-based auth (HMAC print token via `_pt` query param or `print_token` cookie)
- **Features**:
  - Server-side rendered raport document (no client-side auth)
  - Used by Playwright for PDF generation
  - Renders `RaportTahfidzDocument` with full data
  - Excluded from middleware (auth handled in page via Node.js crypto)
- **Security**: HMAC signature verification, expiry check

---

## 6. Form/Modal/Table Inventory

### Forms
| Component | Used In | Fields |
|---|---|---|
| `SiswaForm` | `/siswa` | Name, NISN, gender, DOB, class, photo, status |
| `HafalanForm` | `/hafalan`, `/tahsin` | Student, date, surah/juz, page, makhroj, tajwid, lancar, notes |
| `TahsinForm` | `/tahsin` | Student, date, method, book, page, makhroj, kelancaran, adab, notes |
| `TahfidzForm` | `/tahfidz` | Student, date, surah/juz, page, score, notes |
| `JurnalHafalanTahsinForm` | `/tahsin`, `/scan` | Combined hafalan + tahsin entry |
| `RaportTahfidzForm` | `/raport` | Student, period, juz, tahsin details, surah detail table, signatures |
| `ImportExcelModal` | `/siswa` | Excel file upload |
| `ArtikelGenerator` | `/dashboard/kelola-artikel` | AI-assisted article generation |
| `RichTextEditor` | `/dashboard/kelola-artikel` | WYSIWYG article content editor |

### Tables
| Component | Used In | Columns |
|---|---|---|
| `SiswaTable` | `/siswa` | Name, NISN, class, gender, juz, status, actions |
| `DataTable` | `/absensi` | No, name, NISN, class, status/score, actions |
| Inline tables | `/kelas`, `/tim`, `/rekap`, `/laporan` | Various per feature |

### Modals
| Type | Used In |
|---|---|
| CRUD form modals | `/siswa`, `/raport`, `/tahsin`, `/hafalan`, `/tahfidz`, `/kelas`, `/tim`, `/website/*` |
| Confirm delete dialogs | All CRUD pages |
| Detail/preview modals | `/laporan`, `/laporan-masuk` |
| Import modal | `/siswa` |
| QR Scanner overlay | `/tahsin`, `/scan` |

---

## 7. API Endpoints Referenced

| Endpoint | Method | Used In |
|---|---|---|
| `/api/siswa/list` | GET | `/siswa`, `/tahsin` |
| `/api/siswa/add` | POST | `/siswa` |
| `/api/siswa/update` | PUT | `/siswa` |
| `/api/siswa/delete` | DELETE | `/siswa` |
| `/api/siswa/bulk-delete` | DELETE | `/siswa` |
| `/api/siswa/export` | GET | `/siswa` |
| `/api/kelas/list` | GET | `/siswa`, `/tahsin`, `/absensi`, `/raport` |
| `/api/hafalan/*` | CRUD | `/hafalan`, `/tahsin` |
| `/api/tahsin/*` | CRUD | `/tahsin` |
| `/api/raport/tahfidz` | CRUD | `/raport` |
| `/api/raport/admin-list` | GET | `/raport` |
| `/api/raport/render-pdf` | GET | `/raport` |
| `/api/absensi/*` | GET/POST | `/absensi`, `/absensi/kabid-mark` |
| `/api/dashboard/stats` | GET | `/dashboard` |
| `/api/dashboard/stats-guru` | GET | `/dashboard`, `/dashboard-guru` |
| `/api/laporan-baru` | CRUD | `/laporan-kirim`, `/laporan-masuk` |
| `/api/rekap` | GET | `/rekap` |
| `/api/messages/list` | GET | `/pesan` |
| `/api/messages/unread-count` | GET | Sidebar badge |
| `/api/website/profil` | GET/PUT | `/dashboard`, `/website` |
| `/api/website/program` | CRUD | `/website` |
| `/api/website/agenda` | CRUD | `/website` |
| `/api/testimonials/manage` | GET | `/kelola-testimoni` |
| `/api/auth/verify-code` | POST | `/auth/unlock` |

---

## 8. Key Cross-Cutting Patterns

1. **View Mode**: Kabid/Sekretaris can switch to "teaching mode" (view as Tim_Quran) via `useViewMode` hook. All data fetches add `x-view-mode: teaching` header.
2. **Class-First Flow**: Tim_Quran teachers always see class selection first, then drill into students.
3. **ID Card System**: Both staff (`StaffIDCard`) and student (`StudentIDCard`) ID cards with QR codes, printable as PNG/PDF.
4. **QR Attendance**: Camera-based QR scanning for student attendance + journal entry.
5. **Multi-format Export**: PDF (jsPDF + html-to-image), Word (docx library), Excel (xlsx library), PNG capture.
6. **Dynamic Imports**: Heavy components (QR Scanner, Charts, Rich Text Editor) loaded via `next/dynamic` with SSR disabled.
7. **Toast System**: Custom toast provider (`useToast`) used across all dashboard pages.
8. **All dashboard pages** use `export const dynamic = 'force-dynamic'` to prevent caching.
