'use client';

// src/components/features/tahfidz/TahfidzForm.tsx
// Form input catatan tahfidz harian:
// - Pilih siswa
// - Tanggal
// - Surah / Juz
// - Halaman
// - Penilaian makhroj / tajwid / kelancaran
// - Catatan opsional

import React, { useEffect, useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import type { Tahfidz } from '@/types';
import type { NilaiTahfidz } from '@/lib/surahData';
import { NILAI_OPTIONS } from '@/lib/surahData';

interface StudentOption {
  id: string;
  nama: string;
}

export interface TahfidzFormData {
  student_id: string;
  tanggal: string;
  surah_juz: string;
  halaman: number;
  makhroj: string;
  tajwid: string;
  lancar: string;
  catatan: string;
}

interface TahfidzFormProps {
  initialData?: Tahfidz | null;
  loading?: boolean;
  onSubmit: (data: TahfidzFormData) => void;
  onCancel: () => void;
}

interface FormErrors {
  student_id?: string;
  tanggal?: string;
  surah_juz?: string;
  halaman?: string;
  makhroj?: string;
  tajwid?: string;
  lancar?: string;
}

function validate(data: TahfidzFormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.student_id) errors.student_id = 'Siswa wajib dipilih.';
  if (!data.tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(data.tanggal)) {
    errors.tanggal = 'Tanggal wajib diisi.';
  }
  if (!data.surah_juz.trim()) errors.surah_juz = 'Surah / Juz wajib diisi.';
  if (isNaN(data.halaman) || data.halaman < 1) {
    errors.halaman = 'Halaman harus berupa angka positif.';
  }
  if (!data.makhroj) errors.makhroj = 'Penilaian makhroj wajib dipilih.';
  if (!data.tajwid) errors.tajwid = 'Penilaian tajwid wajib dipilih.';
  if (!data.lancar) errors.lancar = 'Penilaian kelancaran wajib dipilih.';
  return errors;
}

export default function TahfidzForm({
  initialData,
  loading = false,
  onSubmit,
  onCancel,
}: TahfidzFormProps) {
  const isEdit = Boolean(initialData);
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState<TahfidzFormData>({
    student_id: initialData?.student_id ?? '',
    tanggal: initialData?.tanggal ?? today,
    surah_juz: initialData?.surah_juz ?? '',
    halaman: initialData?.halaman ?? 1,
    makhroj: initialData?.makhroj ?? '',
    tajwid: initialData?.tajwid ?? '',
    lancar: initialData?.lancar ?? '',
    catatan: initialData?.catatan ?? '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStudentsLoading(true);

    fetch('/api/siswa/list')
      .then((res) => {
        if (!res.ok) return { data: [] };
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        const list = (json.data ?? []).map((item: any) => ({
          id: item.id,
          nama: item.nama,
        }));
        setStudents(list);
      })
      .catch(() => {
        if (!cancelled) setStudents([]);
      })
      .finally(() => {
        if (!cancelled) setStudentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setForm({
      student_id: initialData?.student_id ?? '',
      tanggal: initialData?.tanggal ?? today,
      surah_juz: initialData?.surah_juz ?? '',
      halaman: initialData?.halaman ?? 1,
      makhroj: initialData?.makhroj ?? '',
      tajwid: initialData?.tajwid ?? '',
      lancar: initialData?.lancar ?? '',
      catatan: initialData?.catatan ?? '',
    });
    setErrors({});
  }, [initialData, today]);

  const set = <K extends keyof TahfidzFormData>(key: K, value: TahfidzFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">
          Siswa <span className="text-red-500 ml-1">*</span>
        </label>
        {studentsLoading ? (
          <div className="h-10 rounded-lg bg-slate-100 animate-pulse" />
        ) : (
          <select
            value={form.student_id}
            onChange={(e) => set('student_id', e.target.value)}
            disabled={loading || isEdit}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            <option value="">— Pilih Siswa —</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.nama}
              </option>
            ))}
          </select>
        )}
        {errors.student_id && (
          <p className="text-xs text-red-600" role="alert">{errors.student_id}</p>
        )}
      </div>

      <Input
        label="Tanggal"
        required
        type="date"
        value={form.tanggal}
        onChange={(e) => set('tanggal', e.target.value)}
        error={errors.tanggal}
        disabled={loading}
      />

      <Input
        label="Surah / Juz"
        required
        value={form.surah_juz}
        onChange={(e) => set('surah_juz', e.target.value)}
        error={errors.surah_juz}
        placeholder="Contoh: Juz 30 / An-Naba'"
        disabled={loading}
      />

      <Input
        label="Halaman"
        required
        type="number"
        min={1}
        value={String(form.halaman)}
        onChange={(e) => set('halaman', Number(e.target.value) || 1)}
        error={errors.halaman}
        helperText="Halaman tahfidz yang dipelajari"
        disabled={loading}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Makhroj <span className="text-red-500">*</span></label>
          <select
            value={form.makhroj}
            onChange={(e) => set('makhroj', e.target.value as NilaiTahfidz)}
            disabled={loading}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            <option value="">— Pilih —</option>
            {NILAI_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.makhroj && (
            <p className="text-xs text-red-600" role="alert">{errors.makhroj}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Tajwid <span className="text-red-500">*</span></label>
          <select
            value={form.tajwid}
            onChange={(e) => set('tajwid', e.target.value as NilaiTahfidz)}
            disabled={loading}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            <option value="">— Pilih —</option>
            {NILAI_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.tajwid && (
            <p className="text-xs text-red-600" role="alert">{errors.tajwid}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Kelancaran <span className="text-red-500">*</span></label>
          <select
            value={form.lancar}
            onChange={(e) => set('lancar', e.target.value as NilaiTahfidz)}
            disabled={loading}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            <option value="">— Pilih —</option>
            {NILAI_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.lancar && (
            <p className="text-xs text-red-600" role="alert">{errors.lancar}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Catatan <span className="text-xs font-normal text-slate-400">(opsional)</span></label>
        <textarea
          value={form.catatan}
          onChange={(e) => set('catatan', e.target.value)}
          rows={4}
          disabled={loading}
          className="min-h-[110px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
          placeholder="Tambahkan catatan singkat tentang pembelajaran hari ini"
        />
      </div>

      <div className="flex justify-end items-center gap-3 pt-2 border-t border-slate-200">
        <Button variant="secondary" type="button" onClick={onCancel} disabled={loading}>
          Batal
        </Button>
        <Button type="submit" loading={loading}>
          {isEdit ? 'Perbarui Tahfidz' : 'Simpan Tahfidz'}
        </Button>
      </div>
    </form>
  );
}
