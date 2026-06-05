'use client';

// RaportTahfidzForm.tsx
// Form pengisian raport tahfidz berbasis tabel surah
// - Pilih siswa & periode
// - Template otomatis dari daftar surah per juz, atau input manual
// - Nilai per surah: Makhroj, Tajwid, Lancar (✓/A/B/C/D), WAFA (Buku & Halaman)
// - Catatan ustadz/ah

import React, { useEffect, useState } from 'react';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
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
  nama_kabid: string;
  nama_kepala_sekolah: string;
  detail: DetailSurah[];
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
  value,
  onChange,
  disabled,
}: {
  value: NilaiTahfidz;
  onChange: (v: NilaiTahfidz) => void;
  disabled?: boolean;
}) {
  const current = NILAI_OPTS.find(o => o.v === value) ?? NILAI_OPTS[0];
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(p => !p)}
        className={`min-w-[44px] h-8 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-all ${current.cls} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm cursor-pointer'}`}
      >
        {current.label}
        <ChevronDown size={10} />
      </button>
      {open && !disabled && (
        <div className="absolute top-9 left-0 z-20 bg-white rounded-xl shadow-xl border border-slate-100 py-1 min-w-[80px]">
          {NILAI_OPTS.map(opt => (
            <button
              key={opt.v}
              type="button"
              onClick={() => { onChange(opt.v); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 transition-colors ${opt.cls.replace('border', '')} rounded`}
            >
              {opt.label === '—' ? '— Kosong' : `${opt.v}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Empty row helper ────────────────────────────────────────────────────────

const emptyRow = (): DetailSurah => ({
  nama_surah: '', makhroj: '', tajwid: '', lancar: '', wafa_buku: '', wafa_halaman: '',
});

// ─── Main Form ────────────────────────────────────────────────────────────────

export default function RaportTahfidzForm({
  editingId, initialData, loading = false, onSubmit, onCancel,
}: Props) {
  const isEdit = Boolean(editingId);

  const [form, setForm] = useState<RaportTahfidzFormData>({
    student_id: '', periode: '', tahun_ajaran: '', juz: null, catatan: '',
    nama_guru_kelas: '', nama_kabid: '', nama_kepala_sekolah: '',
    detail: [emptyRow()],
  });
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
        student_id: initialData.student_id ?? '',
        periode: initialData.periode ?? '',
        tahun_ajaran: initialData.tahun_ajaran ?? '',
        juz: initialData.juz ?? null,
        catatan: initialData.catatan ?? '',
        nama_guru_kelas: initialData.nama_guru_kelas ?? '',
        nama_kabid: initialData.nama_kabid ?? '',
        nama_kepala_sekolah: initialData.nama_kepala_sekolah ?? '',
        detail: initialData.detail && initialData.detail.length > 0
          ? initialData.detail
          : [emptyRow()],
      });
    }
  }, [initialData, editingId]);

  const set = <K extends keyof RaportTahfidzFormData>(k: K, v: RaportTahfidzFormData[K]) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: '' }));
  };

  // Load template surah dari juz
  const loadTemplate = (juz: number) => {
    const surahList = SURAH_PER_JUZ[juz];
    if (!surahList) return;
    set('juz', juz);
    set('detail', surahList.map(s => ({ ...emptyRow(), nama_surah: s.nama })));
  };

  // Update baris detail
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
    const hasEmpty = form.detail.some(d => !d.nama_surah.trim());
    if (hasEmpty) errs.detail = 'Nama surah tidak boleh kosong.';

    if (Object.values(errs).some(Boolean)) {
      setErrors(errs);
      return;
    }
    onSubmit(form, editingId ?? undefined);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">

      {/* ── Pilih Siswa (hanya tambah) ─────────────────────────────────────── */}
      {!isEdit && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Siswa <span className="text-red-500">*</span></label>
            {studentsLoading ? (
              <div className="h-9 bg-slate-100 rounded-lg animate-pulse" />
            ) : (
              <select
                value={form.student_id}
                onChange={e => set('student_id', e.target.value)}
                disabled={loading}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
              >
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

          <Input
            label="Periode *"
            value={form.periode}
            onChange={e => set('periode', e.target.value)}
            error={errors.periode}
            placeholder="Contoh: Semester I"
            disabled={loading}
          />
        </div>
      )}

      {!isEdit && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Tahun Ajaran *"
            value={form.tahun_ajaran}
            onChange={e => set('tahun_ajaran', e.target.value)}
            error={errors.tahun_ajaran}
            placeholder="Contoh: 2025/2026"
            disabled={loading}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Juz</label>
            <select
              value={form.juz ?? ''}
              onChange={e => {
                const v = e.target.value;
                if (v) set('juz', Number(v));
                else set('juz', null);
              }}
              disabled={loading}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
            >
              <option value="">— Pilih Juz (opsional) —</option>
              {Array.from({length: 30}, (_, i) => i + 1).map(j => (
                <option key={j} value={j}>Juz {j}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── Template Surah ─────────────────────────────────────────────────── */}
      {!isEdit && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
          <p className="text-sm font-semibold text-emerald-800 mb-3">
            📋 Muat Template Surah dari Juz
          </p>
          <div className="flex flex-wrap gap-2">
            {JUZ_TERSEDIA.map(j => (
              <button
                key={j}
                type="button"
                onClick={() => loadTemplate(j)}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all disabled:opacity-50"
              >
                Juz {j}
              </button>
            ))}
          </div>
          <p className="text-xs text-emerald-600/70 mt-2">
            Klik untuk mengisi otomatis nama-nama surah. Kamu bisa edit atau hapus baris setelahnya.
          </p>
        </div>
      )}

      {/* ── Tabel Surah ────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">Daftar Surah & Penilaian</p>
          <span className="text-xs text-slate-400">{form.detail.length} baris</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                <th className="px-3 py-2 text-left w-8">No</th>
                <th className="px-3 py-2 text-left min-w-[140px]">Surah</th>
                <th className="px-3 py-2 text-center w-14" colSpan={1}>Makhroj</th>
                <th className="px-3 py-2 text-center w-14">Tajwid</th>
                <th className="px-3 py-2 text-center w-14">Lancar</th>
                <th className="px-3 py-2 text-center min-w-[80px]">WAFA Buku</th>
                <th className="px-3 py-2 text-center min-w-[80px]">WAFA Hal.</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
              <tr className="bg-slate-50 border-b border-slate-200">
                <td colSpan={8} className="px-3 py-1 text-[10px] text-slate-400">
                  Nilai: ✓ = Hafal &nbsp;|&nbsp; A = Sangat Baik &nbsp;|&nbsp; B = Baik &nbsp;|&nbsp; C = Cukup Baik &nbsp;|&nbsp; D = Kurang Baik
                </td>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {form.detail.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2 text-slate-400 text-xs">{i + 1}</td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={row.nama_surah}
                      onChange={e => updateRow(i, 'nama_surah', e.target.value)}
                      disabled={loading}
                      placeholder="Nama surah..."
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 disabled:bg-slate-50"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <NilaiSelect
                      value={row.makhroj}
                      onChange={v => updateRow(i, 'makhroj', v)}
                      disabled={loading}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <NilaiSelect
                      value={row.tajwid}
                      onChange={v => updateRow(i, 'tajwid', v)}
                      disabled={loading}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <NilaiSelect
                      value={row.lancar}
                      onChange={v => updateRow(i, 'lancar', v)}
                      disabled={loading}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={row.wafa_buku}
                      onChange={e => updateRow(i, 'wafa_buku', e.target.value)}
                      disabled={loading}
                      placeholder="Wafa 4..."
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={row.wafa_halaman}
                      onChange={e => updateRow(i, 'wafa_halaman', e.target.value)}
                      disabled={loading}
                      placeholder="Tuntas..."
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      disabled={loading || form.detail.length <= 1}
                      className="p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
                    >
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
          <button
            type="button"
            onClick={addRow}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors disabled:opacity-50"
          >
            <Plus size={15} />
            Tambah Baris Surah
          </button>
        </div>
      </div>

      {/* ── Catatan ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">
          Catatan / Motivasi Ustadz/ah
          <span className="text-xs font-normal text-slate-400 ml-1">(opsional)</span>
        </label>
        <textarea
          value={form.catatan}
          onChange={e => set('catatan', e.target.value)}
          rows={3}
          disabled={loading}
          placeholder='Contoh: "Carilah waktu untuk membaca Al Quran di tengah kesibukanmu..."'
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 resize-none"
        />
      </div>

      {/* ── Nama untuk Tanda Tangan ────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
        <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          ✍️ Nama Penandatangan
          <span className="text-xs font-normal text-slate-400">(akan dicetak di bawah garis tanda tangan)</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Nama Guru Kelas"
            value={form.nama_guru_kelas}
            onChange={e => set('nama_guru_kelas', e.target.value)}
            placeholder="Nama lengkap guru..."
            disabled={loading}
          />
          <Input
            label="Nama Kabid Qur'an"
            value={form.nama_kabid}
            onChange={e => set('nama_kabid', e.target.value)}
            placeholder="Nama kepala bidang..."
            disabled={loading}
          />
          <Input
            label="Nama Kepala Sekolah"
            value={form.nama_kepala_sekolah}
            onChange={e => set('nama_kepala_sekolah', e.target.value)}
            placeholder="Nama kepala sekolah..."
            disabled={loading}
          />
        </div>
      </div>

      {/* ── Actions ────────────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Batal
        </Button>
        <Button type="submit" variant="primary" loading={loading}>
          {isEdit ? 'Perbarui Raport' : 'Simpan Raport'}
        </Button>
      </div>
    </form>
  );
}
