'use client';

// src/components/features/tahsin/TahsinForm.tsx
// Form input catatan tahsin:
// - Pilih siswa dari daftar (fetch dari /api/siswa/list)
// - Metode dropdown (Wafa / IWR / Al-Quran)
// - Isi buku, halaman, catatan

import React, { useEffect, useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { ChevronDown } from 'lucide-react';
import type { Tahsin, TahsinMetode } from '@/types';
import type { NilaiTahfidz } from '@/lib/surahData';
import { NILAI_TANPA_HAFAL, NILAI_LANCAR, SURAH_ALQURAN_LIST } from '@/lib/surahData';
import { useSiswaList } from '@/hooks/useSWRFetcher';

// ─── Types ───────────────────────────────────────────────────────────────────

interface StudentOption {
  id: string;
  nama: string;
}

export interface TahsinFormData {
  student_id: string;
  tanggal: string;
  metode: TahsinMetode;
  buku: string;
  halaman: string;
  catatan: string;
  makhroj?: string;
  kelancaran?: string;
  adab?: string;
}

interface TahsinFormProps {
  /** Jika diberikan, form beroperasi dalam mode edit */
  initialData?: Tahsin | null;
  /** Isi student_id dari luar */
  preselectedStudentId?: string;
  loading?: boolean;
  onSubmit: (data: TahsinFormData) => void;
  onCancel: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const METODE_OPTIONS: TahsinMetode[] = ['Wafa', 'IWR', 'Al-Quran'];

// Opsi buku/jilid berdasarkan metode tahsin
const BUKU_WAFA_OPTIONS = ['WAFA 1', 'WAFA 2', 'WAFA 3', 'WAFA 4', 'WAFA 5', 'TAJWID', 'GHORIB'];
const BUKU_IWR_OPTIONS = ['Jilid 1', 'Jilid 2', 'Jilid 3', 'Jilid 4', 'Panduan Tajwid & Ghorib'];

const NILAI_MAKHROJ_TAJWID = NILAI_TANPA_HAFAL;

function NilaiSelect({ value, onChange, disabled, options }: {
  value: NilaiTahfidz;
  onChange: (v: NilaiTahfidz) => void;
  disabled?: boolean;
  options?: { v: NilaiTahfidz; label: string; cls: string }[];
}) {
  const opts = options || NILAI_MAKHROJ_TAJWID;
  const current = opts.find((o) => o.v === value) ?? opts[0];
  const [open, setOpen] = useState(false);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const handleOpen = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + window.scrollY + 4, left: rect.left });
    setOpen((prev) => !prev);
  };

  return (
    <div className="relative inline-block">
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        className={`min-w-[44px] h-8 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-all ${current.cls} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm cursor-pointer'}`}
      >
        {current.label}
        <ChevronDown size={10} />
      </button>
      {open && !disabled && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            className="fixed z-40 bg-white rounded-xl shadow-xl border border-slate-100 py-1 min-w-[90px]"
            style={{ top: pos.top, left: pos.left }}
          >
            {opts.map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => {
                  onChange(opt.v);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 transition-colors rounded"
              >
                <span className={`inline-block w-6 h-6 rounded text-center leading-6 mr-2 ${opt.cls}`}>
                  {opt.label}
                </span>
                {opt.v === '' ? 'Kosong'
                  : opt.v === 'L' ? 'Lancar'
                    : opt.v === 'KL' ? 'Kurang Lancar'
                      : opt.v === 'TL' ? 'Tidak Lancar'
                        : opt.v === 'A' ? 'Sangat Baik'
                          : opt.v === 'B' ? 'Baik'
                            : opt.v === 'C' ? 'Cukup'
                              : 'Kurang'}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Validation ──────────────────────────────────────────────────────────────

interface FormErrors {
  student_id?: string;
  tanggal?: string;
  metode?: string;
  buku?: string;
  halaman?: string;
}

function validate(data: TahsinFormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.student_id) {
    errors.student_id = 'Siswa wajib dipilih.';
  }
  if (!data.tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(data.tanggal)) {
    errors.tanggal = 'Tanggal wajib diisi.';
  }
  if (!data.metode || !METODE_OPTIONS.includes(data.metode)) {
    errors.metode = 'Metode wajib dipilih.';
  }
  if (!data.buku.trim()) {
    errors.buku = 'Buku wajib diisi.';
  }
  if (!data.halaman || !data.halaman.trim()) {
    errors.halaman = 'Halaman wajib diisi.';
  }
  return errors;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TahsinForm({
  initialData,
  preselectedStudentId,
  loading = false,
  onSubmit,
  onCancel,
}: TahsinFormProps) {
  const isEdit = Boolean(initialData);
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState<TahsinFormData>({
    student_id: preselectedStudentId ?? '',
    tanggal: today,
    metode: 'Wafa',
    buku: '',
    halaman: '',
    catatan: '',
    makhroj: '',
    kelancaran: '',
    adab: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // Fetch daftar siswa via SWR (cached & deduplicated)
  const { siswa: allSiswa, isLoading: studentsLoading } = useSiswaList();
  const students: StudentOption[] = allSiswa.map((s: any) => ({
    id: s.id,
    nama: s.nama,
  }));

  // ── Populate form saat edit
  useEffect(() => {
    if (initialData) {
      setForm({
        student_id: initialData.student_id,
        tanggal: initialData.tanggal,
        metode: initialData.metode,
        buku: initialData.buku ?? '',
        halaman: initialData.halaman ?? '',
        catatan: initialData.catatan ?? '',
        makhroj: (initialData as any).makhroj ?? '',
        kelancaran: (initialData as any).kelancaran ?? '',
        adab: (initialData as any).adab ?? '',
      });
    } else {
      setForm({
        student_id: preselectedStudentId ?? '',
        tanggal: today,
        metode: 'Wafa',
        buku: '',
        halaman: '',
        catatan: '',
        makhroj: '',
        kelancaran: '',
        adab: '',
      });
    }
    setErrors({});
  }, [initialData, preselectedStudentId, today]);

  const set = <K extends keyof TahsinFormData>(key: K, value: TahsinFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* Pilih Siswa */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">
          Siswa <span className="text-red-500 ml-1">*</span>
        </label>
        {studentsLoading ? (
          <div className="h-9 rounded-lg bg-slate-100 animate-pulse" />
        ) : (
          <select
            value={form.student_id}
            onChange={(e) => set('student_id', e.target.value)}
            disabled={loading || isEdit}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            <option value="">— Pilih Siswa —</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama}
              </option>
            ))}
          </select>
        )}
        {errors.student_id && (
          <p className="text-xs text-red-600" role="alert">{errors.student_id}</p>
        )}
      </div>

      {/* Tanggal */}
      <Input
        label="Tanggal"
        required
        type="date"
        value={form.tanggal}
        onChange={(e) => set('tanggal', e.target.value)}
        error={errors.tanggal}
        disabled={loading}
      />

      {/* Metode */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">
          Metode <span className="text-red-500 ml-1">*</span>
        </label>
        <select
          value={form.metode}
          onChange={(e) => {
            const newMetode = e.target.value as TahsinMetode;
            setForm((prev) => ({ ...prev, metode: newMetode, buku: '' }));
            if (errors.metode) setErrors((prev) => ({ ...prev, metode: undefined }));
            if (errors.buku) setErrors((prev) => ({ ...prev, buku: undefined }));
          }}
          disabled={loading}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
        >
          {METODE_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        {errors.metode && (
          <p className="text-xs text-red-600" role="alert">{errors.metode}</p>
        )}
      </div>

      {/* Buku / Jilid / Surah */}
      {form.metode === 'Wafa' || form.metode === 'IWR' || form.metode === 'Al-Quran' ? (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">
            Jilid / Surah <span className="text-red-500 ml-1">*</span>
          </label>
          <select
            value={form.buku}
            onChange={(e) => set('buku', e.target.value)}
            disabled={loading}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            <option value="">— Pilih —</option>
            {(form.metode === 'Wafa' ? BUKU_WAFA_OPTIONS : form.metode === 'IWR' ? BUKU_IWR_OPTIONS : SURAH_ALQURAN_LIST).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          {errors.buku && <p className="text-xs text-red-600" role="alert">{errors.buku}</p>}
        </div>
      ) : (
        <Input
          label="Jilid / Surah"
          required
          value={form.buku}
          onChange={(e) => set('buku', e.target.value)}
          error={errors.buku}
          placeholder="Contoh: Nuraniyah, Juz 30"
          disabled={loading}
        />
      )}

      {/* Halaman */}
      <Input
        label="Halaman / Ayat"
        required
        value={form.halaman}
        onChange={(e) => set('halaman', e.target.value)}
        error={errors.halaman}
        placeholder="Contoh: 1, 1-20, atau ayat 1-5"
        helperText="Halaman atau ayat yang dipelajari"
        disabled={loading}
      />

      {/* Catatan */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">
          Catatan <span className="text-xs font-normal text-slate-400">(opsional)</span>
        </label>
        <textarea
          value={form.catatan}
          onChange={(e) => set('catatan', e.target.value)}
          rows={3}
          disabled={loading}
          placeholder="Contoh: Perbaiki makhroj huruf Qaf, perhatikan ghunnah..."
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-slate-100 disabled:cursor-not-allowed resize-none"
        />
      </div>

      {/* Extra fields - hanya tampil saat edit */}
      {isEdit && (
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Makhroj</label>
            <NilaiSelect
              value={form.makhroj as NilaiTahfidz ?? ''}
              onChange={(v) => set('makhroj', v)}
              disabled={loading}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Kelancaran</label>
            <NilaiSelect
              value={form.kelancaran as NilaiTahfidz ?? ''}
              onChange={(v) => set('kelancaran', v)}
              disabled={loading}
              options={NILAI_LANCAR}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Tajwid</label>
            <NilaiSelect
              value={form.adab as NilaiTahfidz ?? ''}
              onChange={(v) => set('adab', v)}
              disabled={loading}
            />
          </div>
        </div>
      )}

      {/* Tombol Aksi */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Batal
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={loading}
        >
          {isEdit ? 'Perbarui Tahsin' : 'Simpan Tahsin'}
        </Button>
      </div>
    </form>
  );
}
