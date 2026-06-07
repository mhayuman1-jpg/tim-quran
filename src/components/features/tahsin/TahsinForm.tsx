'use client';

// src/components/features/tahsin/TahsinForm.tsx
// Form input catatan tahsin:
// - Pilih siswa dari daftar (fetch dari /api/siswa/list)
// - Metode dropdown (Wafa / IWR / Al-Quran)
// - Isi buku, halaman, catatan

import React, { useEffect, useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import type { Tahsin, TahsinMetode } from '@/types';

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
  halaman: number;
  catatan: string;
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
  const halamanNum = Number(data.halaman);
  if (isNaN(halamanNum) || halamanNum < 1) {
    errors.halaman = 'Halaman harus berupa angka positif.';
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
    halaman: 1,
    catatan: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // ── Fetch daftar siswa
  useEffect(() => {
    let cancelled = false;
    setStudentsLoading(true);

    fetch('/api/siswa/list')
      .then((res) => {
        if (!res.ok) return { data: [] };
        return res.json();
      })
      .then((json) => {
        if (!cancelled) {
          const list: StudentOption[] = (json.data ?? []).map((s: any) => ({
            id: s.id,
            nama: s.nama,
          }));
          setStudents(list);
        }
      })
      .catch(() => {
        if (!cancelled) setStudents([]);
      })
      .finally(() => {
        if (!cancelled) setStudentsLoading(false);
      });

    return () => { cancelled = true; };
     
  }, []);

  // ── Populate form saat edit
  useEffect(() => {
    if (initialData) {
      setForm({
        student_id: initialData.student_id,
        tanggal: initialData.tanggal,
        metode: initialData.metode,
        buku: initialData.buku ?? '',
        halaman: initialData.halaman ?? 1,
        catatan: initialData.catatan ?? '',
      });
    } else {
      setForm({
        student_id: preselectedStudentId ?? '',
        tanggal: today,
        metode: 'Wafa',
        buku: '',
        halaman: 1,
        catatan: '',
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
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
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
          onChange={(e) => set('metode', e.target.value as TahsinMetode)}
          disabled={loading}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
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

      {/* Buku */}
      <Input
        label="Buku"
        required
        value={form.buku}
        onChange={(e) => set('buku', e.target.value)}
        error={errors.buku}
        placeholder="Contoh: Wafa Jilid 3, Nuraniyah"
        disabled={loading}
      />

      {/* Halaman */}
      <Input
        label="Halaman"
        required
        type="number"
        min={1}
        value={String(form.halaman)}
        onChange={(e) => set('halaman', parseInt(e.target.value) || 1)}
        error={errors.halaman}
        helperText="Halaman buku yang dipelajari"
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
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed resize-none"
        />
      </div>

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
