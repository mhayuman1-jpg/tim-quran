'use client';

// RaportTahfidzForm.tsx — Form raport tahfidz + tahsin
// Fitur: auto-load dari data hafalan & tahsin siswa, penilaian tahsin lengkap

import React, { useEffect, useState } from 'react';
import { Plus, Trash2, ChevronDown, Download, Loader2, BookOpen, Mic } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { SURAH_PER_JUZ, JUZ_TERSEDIA, type NilaiTahfidz } from '@/lib/surahData';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DetailSurah {
  nama_surah: string;
  makhroj: NilaiTahfidz;
  tajwid: NilaiTahfidz;
  lancar: NilaiTahfidz;
  wafa_buku: string;
  wafa_halaman: string;
}

export interface RaportTahfidzFormData {
  student_id: string;
  periode: string;
  tahun_ajaran: string;
  juz: number | null;
  catatan: string;
  nama_guru_kelas: string;
  niy_guru_kelas: string;
  nama_kabid: string;
  niy_kabid: string;
  nama_kepala_sekolah: string;
  niy_kepala_sekolah: string;
  detail: DetailSurah[];
  // Penilaian Tahsin
  tahsin_metode: string;
  tahsin_buku: string;
  tahsin_halaman: string;
  tahsin_makhroj: NilaiTahfidz;
  tahsin_kelancaran: NilaiTahfidz;
  tahsin_adab: NilaiTahfidz;
  tahsin_catatan: string;
}

interface Props {
  editingId?: string | null;
  initialData?: Partial<RaportTahfidzFormData> | null;
  loading?: boolean;
  onSubmit: (data: RaportTahfidzFormData, id?: string) => void;
  onCancel: () => void;
}

interface StudentOption {
  id: string;
  nama: string;
  nisn: string;
  classes?: { name: string } | null;
}

// ─── Nilai Selector ───────────────────────────────────────────────────────────

const NILAI_OPTS: { v: NilaiTahfidz; label: string; cls: string }[] = [
  { v: '',  label: '—', cls: 'bg-slate-50 text-slate-400 border-slate-200' },
  { v: '✓', label: '✓', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { v: 'A', label: 'A', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  { v: 'B', label: 'B', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { v: 'C', label: 'C', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  { v: 'D', label: 'D', cls: 'bg-red-50 text-red-700 border-red-200' },
];

function NilaiSelect({
  value, onChange, disabled,
}: {
  value: NilaiTahfidz; onChange: (v: NilaiTahfidz) => void; disabled?: boolean;
}) {
  const current = NILAI_OPTS.find(o => o.v === value) ?? NILAI_OPTS[0];
  const [open, setOpen] = useState(false);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });

  const handleOpen = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + window.scrollY + 4, left: r.left });
    setOpen(p => !p);
  };

  return (
    <div className="relative inline-block">
      <button ref={btnRef} type="button" disabled={disabled} onClick={handleOpen}
        className={`min-w-[44px] h-8 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-all ${current.cls} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm cursor-pointer'}`}>
        {current.label}
        <ChevronDown size={10} />
      </button>
      {open && !disabled && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="fixed z-40 bg-white rounded-xl shadow-xl border border-slate-100 py-1 min-w-[90px]"
            style={{ top: pos.top, left: pos.left }}>
            {NILAI_OPTS.map(opt => (
              <button key={opt.v} type="button"
                onClick={() => { onChange(opt.v); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 transition-colors rounded`}>
                <span className={`inline-block w-6 h-6 rounded text-center leading-6 mr-2 ${opt.cls}`}>{opt.label}</span>
                {opt.label === '—' ? 'Kosong' : opt.v === '✓' ? 'Hafal' : opt.v === 'A' ? 'Sangat Baik' : opt.v === 'B' ? 'Baik' : opt.v === 'C' ? 'Cukup' : 'Kurang'}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const emptyRow = (): DetailSurah => ({
  nama_surah: '', makhroj: '', tajwid: '', lancar: '', wafa_buku: '', wafa_halaman: '',
});

const EMPTY_FORM: RaportTahfidzFormData = {
  student_id: '', periode: '', tahun_ajaran: '', juz: null, catatan: '',
  nama_guru_kelas: '', niy_guru_kelas: '',
  nama_kabid: '', niy_kabid: '',
  nama_kepala_sekolah: '', niy_kepala_sekolah: '',
  detail: [emptyRow()],
  tahsin_metode: '', tahsin_buku: '', tahsin_halaman: '',
  tahsin_makhroj: '', tahsin_kelancaran: '', tahsin_adab: '', tahsin_catatan: '',
};

// ─── Main Form ────────────────────────────────────────────────────────────────

export default function RaportTahfidzForm({
  editingId, initialData, loading = false, onSubmit, onCancel,
}: Props) {
  const isEdit = Boolean(editingId);

  const [form, setForm] = useState<RaportTahfidzFormData>(EMPTY_FORM);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoMsg, setAutoMsg] = useState('');

  // Fetch siswa
  useEffect(() => {
    setStudentsLoading(true);
    fetch('/api/siswa/list')
      .then(r => r.ok ? r.json() : { data: [] })
      .then(j => setStudents((j.data ?? []).map((s: any) => ({
        id: s.id, nama: s.nama, nisn: s.nisn, classes: s.classes,
      }))))
      .catch(() => setStudents([]))
      .finally(() => setStudentsLoading(false));
  }, []);

  // Populate form saat edit
  useEffect(() => {
    if (initialData) {
      setForm({
        ...EMPTY_FORM,
        student_id: initialData.student_id ?? '',
        periode: initialData.periode ?? '',
        tahun_ajaran: initialData.tahun_ajaran ?? '',
        juz: initialData.juz ?? null,
        catatan: initialData.catatan ?? '',
        nama_guru_kelas: initialData.nama_guru_kelas ?? '',
        niy_guru_kelas: initialData.niy_guru_kelas ?? '',
        nama_kabid: initialData.nama_kabid ?? '',
        niy_kabid: initialData.niy_kabid ?? '',
        nama_kepala_sekolah: initialData.nama_kepala_sekolah ?? '',
        niy_kepala_sekolah: initialData.niy_kepala_sekolah ?? '',
        detail: initialData.detail?.length ? initialData.detail : [emptyRow()],
        tahsin_metode: (initialData as any).tahsin_metode ?? '',
        tahsin_buku: (initialData as any).tahsin_buku ?? '',
        tahsin_halaman: (initialData as any).tahsin_halaman ?? '',
        tahsin_makhroj: (initialData as any).tahsin_makhroj ?? '',
        tahsin_kelancaran: (initialData as any).tahsin_kelancaran ?? '',
        tahsin_adab: (initialData as any).tahsin_adab ?? '',
        tahsin_catatan: (initialData as any).tahsin_catatan ?? '',
      });
    }
  }, [initialData, editingId]);

  const set = <K extends keyof RaportTahfidzFormData>(k: K, v: RaportTahfidzFormData[K]) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: '' }));
  };

  // ── Auto-load dari data hafalan & tahsin ────────────────────────────────
  const handleAutoLoad = async () => {
    if (!form.student_id) {
      setErrors(p => ({ ...p, student_id: 'Pilih siswa terlebih dahulu.' }));
      return;
    }
    setAutoLoading(true);
    setAutoMsg('');
    try {
      const res = await fetch(`/api/raport/generate?student_id=${form.student_id}`);
      const json = await res.json();
      if (!res.ok) { setAutoMsg(`Gagal: ${json.message}`); return; }

      const { detail_surah, catatan_terbaru, tahsin_summary, stats } = json.data;

      if (detail_surah?.length > 0) {
        setForm(p => ({
          ...p,
          detail: detail_surah.map((d: any) => ({
            nama_surah: d.nama_surah,
            makhroj: d.makhroj || '',
            tajwid: d.tajwid || '',
            lancar: d.lancar || '',
            wafa_buku: d.wafa_buku || '',
            wafa_halaman: d.wafa_halaman || '',
          })),
          catatan: catatan_terbaru || p.catatan,
          // Isi tahsin dari data terbaru
          tahsin_metode: tahsin_summary?.[0]?.metode || p.tahsin_metode,
          tahsin_buku: tahsin_summary?.[0]?.buku || p.tahsin_buku,
          tahsin_halaman: tahsin_summary?.[0]?.halaman ? String(tahsin_summary[0].halaman) : p.tahsin_halaman,
          tahsin_catatan: tahsin_summary?.[0]?.catatan || p.tahsin_catatan,
        }));
        setAutoMsg(`✓ Dimuat: ${stats.surah_hafal} surah dari ${stats.total_hafalan} catatan hafalan, ${stats.total_tahsin} catatan tahsin`);
      } else {
        setAutoMsg('Tidak ada data hafalan ditemukan untuk siswa ini.');
      }
    } catch {
      setAutoMsg('Gagal memuat data. Silakan isi manual.');
    } finally {
      setAutoLoading(false);
    }
  };

  const loadTemplate = (juz: number) => {
    const surahList = SURAH_PER_JUZ[juz];
    if (!surahList) return;
    set('juz', juz);
    set('detail', surahList.map(s => ({ ...emptyRow(), nama_surah: s.nama })));
  };

  const updateRow = (i: number, field: keyof DetailSurah, value: string) => {
    setForm(p => {
      const d = [...p.detail];
      d[i] = { ...d[i], [field]: value };
      return { ...p, detail: d };
    });
  };

  const addRow = () => setForm(p => ({ ...p, detail: [...p.detail, emptyRow()] }));
  const removeRow = (i: number) => setForm(p => ({ ...p, detail: p.detail.filter((_, idx) => idx !== i) }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!isEdit && !form.student_id) errs.student_id = 'Siswa wajib dipilih.';
    if (!isEdit && !form.periode.trim()) errs.periode = 'Periode wajib diisi.';
    if (!isEdit && !form.tahun_ajaran.trim()) errs.tahun_ajaran = 'Tahun ajaran wajib diisi.';
    if (form.detail.length === 0) errs.detail = 'Minimal satu baris surah.';
    if (form.detail.some(d => !d.nama_surah.trim())) errs.detail = 'Nama surah tidak boleh kosong.';
    if (Object.values(errs).some(Boolean)) { setErrors(errs); return; }
    onSubmit(form, editingId ?? undefined);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">

      {/* ── Pilih Siswa ─────────────────────────────────────────────────── */}
      {!isEdit && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Siswa <span className="text-red-500">*</span></label>
              {studentsLoading ? (
                <div className="h-9 bg-slate-100 rounded-lg animate-pulse" />
              ) : (
                <select value={form.student_id} onChange={e => set('student_id', e.target.value)}
                  disabled={loading}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100">
                  <option value="">— Pilih Siswa —</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nama} ({s.nisn}){s.classes ? ` — ${s.classes.name}` : ''}
                    </option>
                  ))}
                </select>
              )}
              {errors.student_id && <p className="text-xs text-red-600">{errors.student_id}</p>}
            </div>
            <Input label="Periode *" value={form.periode} onChange={e => set('periode', e.target.value)}
              error={errors.periode} placeholder="Contoh: Semester I" disabled={loading} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Tahun Ajaran *" value={form.tahun_ajaran} onChange={e => set('tahun_ajaran', e.target.value)}
              error={errors.tahun_ajaran} placeholder="Contoh: 2025/2026" disabled={loading} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Juz</label>
              <select value={form.juz ?? ''} onChange={e => set('juz', e.target.value ? Number(e.target.value) : null)}
                disabled={loading}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100">
                <option value="">— Pilih Juz (opsional) —</option>
                {Array.from({ length: 30 }, (_, i) => i + 1).map(j => (
                  <option key={j} value={j}>Juz {j}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Auto-load dari data siswa ─────────────────────────────── */}
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                  <Download size={15} /> Muat Otomatis dari Data Siswa
                </p>
                <p className="text-xs text-blue-600 mt-0.5">
                  Isi tabel surah & tahsin secara otomatis dari riwayat hafalan & tahsin siswa yang sudah diinput
                </p>
              </div>
              <button type="button" onClick={handleAutoLoad} disabled={loading || autoLoading || !form.student_id}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {autoLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {autoLoading ? 'Memuat...' : 'Muat Data'}
              </button>
            </div>
            {autoMsg && (
              <p className={`mt-2 text-xs ${autoMsg.startsWith('✓') ? 'text-blue-700' : 'text-amber-600'}`}>
                {autoMsg}
              </p>
            )}
          </div>

          {/* ── Template manual dari juz ──────────────────────────────── */}
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
            <p className="text-sm font-semibold text-emerald-800 mb-2">📋 Atau Muat Template dari Juz</p>
            <div className="flex flex-wrap gap-2">
              {JUZ_TERSEDIA.map(j => (
                <button key={j} type="button" onClick={() => loadTemplate(j)} disabled={loading}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50">
                  Juz {j}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ══ BAGIAN TAHFIDZ ══════════════════════════════════════════════════ */}
      <div className="rounded-xl border-2 border-emerald-200 overflow-hidden">
        <div className="bg-emerald-700 px-4 py-3 flex items-center gap-2">
          <BookOpen size={15} className="text-white" />
          <p className="text-sm font-bold text-white">Penilaian Tahfidz</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wide border-b border-slate-200">
                <th className="px-3 py-2 text-left w-8">No</th>
                <th className="px-3 py-2 text-left min-w-[140px]">Surah</th>
                <th className="px-3 py-2 text-center w-14">Makhroj</th>
                <th className="px-3 py-2 text-center w-14">Tajwid</th>
                <th className="px-3 py-2 text-center w-14">Lancar</th>
                <th className="px-3 py-2 text-center min-w-[80px]">Buku</th>
                <th className="px-3 py-2 text-center min-w-[80px]">Hal.</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {form.detail.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-400 text-xs">{i + 1}</td>
                  <td className="px-3 py-2">
                    <input type="text" value={row.nama_surah}
                      onChange={e => updateRow(i, 'nama_surah', e.target.value)}
                      disabled={loading} placeholder="Nama surah..."
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50" />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <NilaiSelect value={row.makhroj} onChange={v => updateRow(i, 'makhroj', v)} disabled={loading} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <NilaiSelect value={row.tajwid} onChange={v => updateRow(i, 'tajwid', v)} disabled={loading} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <NilaiSelect value={row.lancar} onChange={v => updateRow(i, 'lancar', v)} disabled={loading} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" value={row.wafa_buku}
                      onChange={e => updateRow(i, 'wafa_buku', e.target.value)}
                      disabled={loading} placeholder="Wafa 4..."
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" value={row.wafa_halaman}
                      onChange={e => updateRow(i, 'wafa_halaman', e.target.value)}
                      disabled={loading} placeholder="Tuntas..."
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50" />
                  </td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => removeRow(i)}
                      disabled={loading || form.detail.length <= 1}
                      className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {errors.detail && (
          <p className="px-4 py-2 text-xs text-red-600 border-t border-red-100 bg-red-50">{errors.detail}</p>
        )}
        <div className="px-4 py-3 border-t border-slate-100 bg-white">
          <button type="button" onClick={addRow} disabled={loading}
            className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors disabled:opacity-50">
            <Plus size={15} /> Tambah Baris Surah
          </button>
        </div>
      </div>

      {/* ══ BAGIAN TAHSIN ═══════════════════════════════════════════════════ */}
      <div className="rounded-xl border-2 border-indigo-200 overflow-hidden">
        <div className="bg-indigo-700 px-4 py-3 flex items-center gap-2">
          <Mic size={15} className="text-white" />
          <p className="text-sm font-bold text-white">Penilaian Tahsin</p>
        </div>
        <div className="p-4 space-y-4">
          {/* Metode & Buku */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Metode</label>
              <select value={form.tahsin_metode} onChange={e => set('tahsin_metode', e.target.value)}
                disabled={loading}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100">
                <option value="">— Pilih Metode —</option>
                <option value="Wafa">Wafa</option>
                <option value="IWR">IWR</option>
                <option value="Al-Quran">Al-Qur'an</option>
                <option value="Iqra">Iqra</option>
              </select>
            </div>
            <Input label="Buku / Jilid" value={form.tahsin_buku}
              onChange={e => set('tahsin_buku', e.target.value)}
              placeholder="Contoh: Wafa 3" disabled={loading} />
            <Input label="Halaman / Level" value={form.tahsin_halaman}
              onChange={e => set('tahsin_halaman', e.target.value)}
              placeholder="Contoh: 45" disabled={loading} />
          </div>

          {/* Tabel Penilaian Tahsin */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase border-b border-slate-200">
                  <th className="px-4 py-2.5 text-left">Aspek Penilaian</th>
                  <th className="px-4 py-2.5 text-center">Nilai</th>
                  <th className="px-4 py-2.5 text-left hidden sm:table-cell">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { field: 'tahsin_makhroj' as const, label: 'Makhroj', desc: 'Ketepatan tempat keluarnya huruf' },
                  { field: 'tahsin_kelancaran' as const, label: 'Kelancaran', desc: 'Kelancaran membaca tanpa terhenti' },
                  { field: 'tahsin_adab' as const, label: 'Adab & Tajwid', desc: 'Adab membaca dan penerapan tajwid' },
                ].map(({ field, label, desc }) => (
                  <tr key={field} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 text-sm">{label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <NilaiSelect value={form[field]} onChange={v => set(field, v)} disabled={loading} />
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-slate-400">
                        {form[field] === '✓' ? 'Lulus / Hafal' :
                         form[field] === 'A' ? 'Sangat Baik (86–100)' :
                         form[field] === 'B' ? 'Baik (71–85)' :
                         form[field] === 'C' ? 'Cukup (56–70)' :
                         form[field] === 'D' ? 'Kurang (<56)' :
                         '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Catatan Tahsin */}
          <div>
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wide block mb-1">
              Catatan Tahsin
            </label>
            <textarea value={form.tahsin_catatan} onChange={e => set('tahsin_catatan', e.target.value)}
              rows={2} disabled={loading}
              placeholder="Catatan perkembangan tahsin siswa..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 resize-none" />
          </div>
        </div>
      </div>

      {/* ── Catatan Tahfidz ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">
          Catatan / Motivasi Ustadz/ah
          <span className="text-xs font-normal text-slate-400 ml-1">(opsional)</span>
        </label>
        <textarea value={form.catatan} onChange={e => set('catatan', e.target.value)}
          rows={3} disabled={loading}
          placeholder='"Carilah waktu untuk membaca Al Quran di tengah kesibukanmu..."'
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 resize-none" />
      </div>

      {/* ── Nama Penandatangan ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
        <p className="text-sm font-semibold text-slate-700">✍️ Nama Penandatangan</p>
        {[
          { key: 'guru', nama: 'nama_guru_kelas' as const, niy: 'niy_guru_kelas' as const, label: 'Guru Kelas', ph1: 'Fitri Nurhandayani, S. Pd., Gr.', ph2: 'NIY.NIY.GTTY.0842020' },
          { key: 'kabid', nama: 'nama_kabid' as const, niy: 'niy_kabid' as const, label: "Kabid Qur'an", ph1: 'M. Fikramullah, S. Ag., Gr.', ph2: 'NIY.GTTY.0832020' },
          { key: 'kepsek', nama: 'nama_kepala_sekolah' as const, niy: 'niy_kepala_sekolah' as const, label: 'Kepala Sekolah', ph1: 'Syamsul, S. Pd., M.Pd., Gr.', ph2: 'NIY.GTY.0012011' },
        ].map(({ key, nama, niy, label, ph1, ph2 }) => (
          <div key={key}>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{label}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Nama Lengkap" value={form[nama]} onChange={e => set(nama, e.target.value)}
                placeholder={ph1} disabled={loading} />
              <Input label="NIY" value={form[niy]} onChange={e => set(niy, e.target.value)}
                placeholder={ph2} disabled={loading} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Actions ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>Batal</Button>
        <Button type="submit" variant="primary" loading={loading}>
          {isEdit ? 'Perbarui Raport' : 'Simpan Raport'}
        </Button>
      </div>
    </form>
  );
}
