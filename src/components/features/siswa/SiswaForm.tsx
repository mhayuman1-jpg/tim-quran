'use client';

import React, { useEffect, useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import ImageUpload from '@/components/shared/ImageUpload';
import type { Santri, Gender } from '@/types';

export interface SiswaFormData {
  nisn: string;
  nama: string;
  gender: Gender;
  tanggal_lahir: string;
  class_id: string;
  juz_terakhir: number;
  status: 'Aktif' | 'Nonaktif';
  photo_url: string;
}

interface KelasOption {
  id: string;
  name: string;
}

interface SiswaFormProps {
  /** When provided, the form operates in edit mode */
  initialData?: Santri | null;
  loading?: boolean;
  onSubmit: (data: SiswaFormData) => void;
  onCancel: () => void;
}

// ─── Validation ─────────────────────────────────────────────────────────────

interface FormErrors {
  nisn?: string;
  nama?: string;
  gender?: string;
  juz_terakhir?: string;
}

function validate(data: SiswaFormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.nisn.trim()) {
    errors.nisn = 'NISN wajib diisi';
  } else if (!/^\d+$/.test(data.nisn.trim())) {
    errors.nisn = 'NISN harus berupa angka';
  }
  if (!data.nama.trim()) {
    errors.nama = 'Nama lengkap wajib diisi';
  }
  if (!data.gender) {
    errors.gender = 'Jenis kelamin wajib dipilih';
  }
  const juz = Number(data.juz_terakhir);
  if (isNaN(juz) || juz < 1 || juz > 30) {
    errors.juz_terakhir = 'Juz harus antara 1 dan 30';
  }
  return errors;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function SiswaForm({
  initialData,
  loading = false,
  onSubmit,
  onCancel,
}: SiswaFormProps) {
  const isEdit = Boolean(initialData);

  const [form, setForm] = useState<SiswaFormData>({
    nisn: '',
    nama: '',
    gender: 'Laki-laki',
    tanggal_lahir: '',
    class_id: '',
    juz_terakhir: 1,
    status: 'Aktif',
    photo_url: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [kelasList, setKelasList] = useState<KelasOption[]>([]);
  const [kelasLoading, setKelasLoading] = useState(false);

  // ── Populate form when editing
  useEffect(() => {
    if (initialData) {
      setForm({
        nisn: initialData.nisn,
        nama: initialData.nama,
        gender: initialData.gender,
        tanggal_lahir: initialData.tanggal_lahir ?? '',
        class_id: initialData.class_id ?? '',
        juz_terakhir: initialData.juz_terakhir,
        status: initialData.status,
        photo_url: initialData.photo_url ?? '',
      });
    } else {
      setForm({
        nisn: '',
        nama: '',
        gender: 'Laki-laki',
        tanggal_lahir: '',
        class_id: '',
        juz_terakhir: 1,
        status: 'Aktif',
        photo_url: '',
      });
    }
    setErrors({});
  }, [initialData]);

  // ── Fetch kelas list (graceful: 404 means no kelas feature yet)
  useEffect(() => {
    let cancelled = false;
    setKelasLoading(true);

    fetch('/api/kelas/list')
      .then((res) => {
        if (!res.ok) return [];
        return res.json().then((json) => json.data ?? []);
      })
      .catch(() => [])
      .then((list: KelasOption[]) => {
        if (!cancelled) setKelasList(list);
      })
      .finally(() => {
        if (!cancelled) setKelasLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const set = <K extends keyof SiswaFormData>(key: K, value: SiswaFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear the error for this field on change
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
      {/* Foto Profil */}
      <div className="flex justify-center">
        <div className="w-28">
          <ImageUpload
            label="Foto Siswa"
            value={form.photo_url || null}
            onUpload={(url) => set('photo_url', url)}
            bucket="timquran-assets"
            folder="siswa"
            shape="circle"
            helperText="Opsional"
            disabled={loading}
          />
        </div>
      </div>

      {/* NISN */}
      <Input
        label="NISN"
        required
        value={form.nisn}
        onChange={(e) => set('nisn', e.target.value)}
        error={errors.nisn}
        placeholder="Contoh: 1234567890"
        maxLength={20}
        disabled={loading}
      />

      {/* Nama Lengkap */}
      <Input
        label="Nama Lengkap"
        required
        value={form.nama}
        onChange={(e) => set('nama', e.target.value)}
        error={errors.nama}
        placeholder="Nama lengkap siswa"
        disabled={loading}
      />

      {/* Jenis Kelamin */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">
          Jenis Kelamin <span className="text-red-500 ml-1">*</span>
        </label>
        <select
          value={form.gender}
          onChange={(e) => set('gender', e.target.value as Gender)}
          disabled={loading}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
        >
          <option value="Laki-laki">Laki-laki</option>
          <option value="Perempuan">Perempuan</option>
        </select>
        {errors.gender && (
          <p className="text-xs text-red-600" role="alert">{errors.gender}</p>
        )}
      </div>

      {/* Tanggal Lahir */}
      <Input
        label="Tanggal Lahir"
        type="date"
        value={form.tanggal_lahir}
        onChange={(e) => set('tanggal_lahir', e.target.value)}
        helperText="Opsional"
        disabled={loading}
      />

      {/* Kelas */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Kelas</label>
        {kelasLoading ? (
          <div className="h-9 rounded-lg bg-slate-100 animate-pulse" />
        ) : kelasList.length === 0 ? (
          <p className="text-xs text-slate-400 italic">
            Data kelas belum tersedia. Tambahkan kelas melalui menu Kelola Kelas.
          </p>
        ) : (
          <select
            value={form.class_id}
            onChange={(e) => set('class_id', e.target.value)}
            disabled={loading}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            <option value="">— Pilih Kelas —</option>
            {kelasList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Juz Terakhir */}
      <Input
        label="Juz Saat Ini"
        required
        type="number"
        min={1}
        max={30}
        value={String(form.juz_terakhir)}
        onChange={(e) => set('juz_terakhir', parseInt(e.target.value) || 1)}
        error={errors.juz_terakhir}
        helperText="Nilai antara 1 dan 30"
        disabled={loading}
      />

      {/* Status (edit only) */}
      {isEdit && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Status</label>
          <select
            value={form.status}
            onChange={(e) => set('status', e.target.value as 'Aktif' | 'Nonaktif')}
            disabled={loading}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            <option value="Aktif">Aktif</option>
            <option value="Nonaktif">Nonaktif</option>
          </select>
        </div>
      )}

      {/* Action buttons */}
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
          {isEdit ? 'Perbarui Siswa' : 'Simpan Siswa'}
        </Button>
      </div>
    </form>
  );
}
