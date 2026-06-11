'use client';

// src/components/features/hafalan/HafalanForm.tsx
// Form input setoran hafalan:
// - Pilih siswa dari daftar (fetch dari /api/siswa/list)
// - Isi surah/juz, halaman, catatan
// - Opsi update juz terakhir siswa

import React, { useEffect, useMemo, useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import type { Hafalan } from '@/types';
import { useSiswaList } from '@/hooks/useSWRFetcher';
import type { NilaiTahfidz } from '@/lib/surahData';
import { NILAI_TANPA_HAFAL, NILAI_LANCAR } from '@/lib/surahData';

// ─── Types ───────────────────────────────────────────────────────────────────

interface StudentOption {
  id: string;
  nama: string;
  juz_terakhir: number;
}

export interface HafalanFormData {
  student_id: string;
  tanggal: string;
  surah_juz: string;
  ayat: string;
  catatan: string;
  makhroj: NilaiTahfidz;
  tajwid: NilaiTahfidz;
  lancar: NilaiTahfidz;
  update_juz_terakhir: boolean;
  juz_baru: number;
}

interface HafalanFormProps {
  /** Jika diberikan, form beroperasi dalam mode edit */
  initialData?: Hafalan | null;
  /** Isi student_id dari luar (misalnya dari pilihan siswa di halaman utama) */
  preselectedStudentId?: string;
  loading?: boolean;
  onSubmit: (data: HafalanFormData) => void;
  onCancel: () => void;
}

// ─── Validation ──────────────────────────────────────────────────────────────

interface FormErrors {
  student_id?: string;
  tanggal?: string;
  surah_juz?: string;
  ayat?: string;
  juz_baru?: string;
}

function validate(data: HafalanFormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.student_id) {
    errors.student_id = 'Siswa wajib dipilih.';
  }
  if (!data.tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(data.tanggal)) {
    errors.tanggal = 'Tanggal wajib diisi.';
  }
  if (!data.surah_juz.trim()) {
    errors.surah_juz = 'Surah/Juz wajib diisi.';
  }
  if (!data.ayat.trim()) {
    errors.ayat = 'Ayat wajib diisi.';
  }
  if (data.update_juz_terakhir) {
    const juzNum = Number(data.juz_baru);
    if (isNaN(juzNum) || juzNum < 1 || juzNum > 30) {
      errors.juz_baru = 'Juz harus antara 1 dan 30.';
    }
  }
  return errors;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HafalanForm({
  initialData,
  preselectedStudentId,
  loading = false,
  onSubmit,
  onCancel,
}: HafalanFormProps) {
  const isEdit = Boolean(initialData);
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState<HafalanFormData>({
    student_id: preselectedStudentId ?? '',
    tanggal: today,
    surah_juz: '',
    ayat: '',
    catatan: '',
    makhroj: '',
    tajwid: '',
    lancar: '',
    update_juz_terakhir: false,
    juz_baru: 1,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [selectedStudentJuz, setSelectedStudentJuz] = useState<number>(1);

  // Fetch daftar siswa via SWR (cached & deduplicated)
  const { siswa: allSiswa, isLoading: studentsLoading } = useSiswaList();
  const students: StudentOption[] = useMemo(() => allSiswa.map((s: any) => ({
    id: s.id,
    nama: s.nama,
    juz_terakhir: s.juz_terakhir ?? 1,
  })), [allSiswa]);

  // Sync juz_baru dengan siswa yang dipilih
  useEffect(() => {
    const selected = students.find((s) => s.id === form.student_id);
    if (selected) {
      setSelectedStudentJuz(selected.juz_terakhir);
      setForm((prev) => ({ ...prev, juz_baru: selected.juz_terakhir }));
    }
  }, [form.student_id, students]);

  // ── Populate form saat edit
  useEffect(() => {
    if (initialData) {
      setForm({
        student_id: initialData.student_id,
        tanggal: initialData.tanggal,
        surah_juz: initialData.surah_juz,
        ayat: String(initialData.halaman ?? ''),
        catatan: initialData.catatan ?? '',
        makhroj: (initialData.makhroj as NilaiTahfidz) ?? '',
        tajwid: (initialData.tajwid as NilaiTahfidz) ?? '',
        lancar: (initialData.lancar as NilaiTahfidz) ?? '',
        update_juz_terakhir: false,
        juz_baru: 1,
      });
    } else {
      setForm({
        student_id: preselectedStudentId ?? '',
        tanggal: today,
        surah_juz: '',
        ayat: '',
        catatan: '',
        makhroj: '',
        tajwid: '',
        lancar: '',
        update_juz_terakhir: false,
        juz_baru: 1,
      });
    }
    setErrors({});
  }, [initialData, preselectedStudentId, today]);

  const set = <K extends keyof HafalanFormData>(key: K, value: HafalanFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const handleStudentChange = (studentId: string) => {
    set('student_id', studentId);
    const selected = students.find((s) => s.id === studentId);
    if (selected) {
      setSelectedStudentJuz(selected.juz_terakhir);
      setForm((prev) => ({ ...prev, student_id: studentId, juz_baru: selected.juz_terakhir }));
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
            onChange={(e) => handleStudentChange(e.target.value)}
            disabled={loading || isEdit}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            <option value="">— Pilih Siswa —</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama} (Juz {s.juz_terakhir})
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
        label="Tanggal Setoran"
        required
        type="date"
        value={form.tanggal}
        onChange={(e) => set('tanggal', e.target.value)}
        error={errors.tanggal}
        disabled={loading}
      />

      {/* Surah/Juz */}
      <Input
        label="Surah / Juz"
        required
        value={form.surah_juz}
        onChange={(e) => set('surah_juz', e.target.value)}
        error={errors.surah_juz}
        placeholder="Contoh: Al-Mulk 1-15 / Juz 29"
        disabled={loading}
      />

      {/* Ayat */}
      <Input
        label="Ayat"
        required
        value={form.ayat}
        onChange={(e) => set('ayat', e.target.value)}
        error={errors.ayat}
        placeholder="Contoh: 1-5, 10, 15-20"
        helperText="Nomor ayat atau rentang (contoh: 1-5)"
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
          placeholder="Contoh: Perhatikan mad thobi'i..."
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-slate-100 disabled:cursor-not-allowed resize-none"
        />
      </div>

      {/* Penilaian */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
        <label className="text-sm font-medium text-slate-700">Penilaian</label>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Makhroj</label>
            <select
              value={form.makhroj}
              onChange={(e) => set('makhroj', e.target.value as NilaiTahfidz)}
              disabled={loading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100"
            >
              {NILAI_TANPA_HAFAL.map((opt) => (
                <option key={opt.v} value={opt.v}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Tajwid</label>
            <select
              value={form.tajwid}
              onChange={(e) => set('tajwid', e.target.value as NilaiTahfidz)}
              disabled={loading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100"
            >
              {NILAI_TANPA_HAFAL.map((opt) => (
                <option key={opt.v} value={opt.v}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Lancar</label>
            <select
              value={form.lancar}
              onChange={(e) => set('lancar', e.target.value as NilaiTahfidz)}
              disabled={loading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100"
            >
              {NILAI_LANCAR.map((opt) => (
                <option key={opt.v} value={opt.v}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Update Juz Terakhir */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.update_juz_terakhir}
            onChange={(e) => set('update_juz_terakhir', e.target.checked)}
            disabled={loading || !form.student_id}
            className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 disabled:cursor-not-allowed"
          />
          <span className="text-sm font-medium text-slate-700">
            Update Juz Terakhir Siswa
          </span>
        </label>
        {form.update_juz_terakhir && (
          <div className="pl-6">
            <p className="text-xs text-slate-500 mb-2">
              Juz terakhir saat ini: <strong>{selectedStudentJuz}</strong>
            </p>
            <Input
              label="Juz Baru"
              required
              type="number"
              min={1}
              max={30}
              value={String(form.juz_baru)}
              onChange={(e) => set('juz_baru', parseInt(e.target.value) || 1)}
              error={errors.juz_baru}
              helperText="Nilai antara 1 dan 30"
              disabled={loading}
            />
          </div>
        )}
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
          {isEdit ? 'Perbarui Hafalan' : 'Simpan Hafalan'}
        </Button>
      </div>
    </form>
  );
}
