'use client';

// src/components/features/raport/RaportForm.tsx
// Form penilaian raport Qur'an:
// - Pilih siswa dari daftar (fetch dari /api/siswa/list)
// - Input periode (teks bebas, misal: "Semester 1 2024")
// - Input nilai Makhroj, Tajwid, Lancar (0-100)
// - Input Buku/Surah, Halaman, Catatan
// - Deteksi duplikat otomatis → switch ke mode edit

import React, { useEffect, useState, useCallback } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { AlertCircle, Edit2 } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface StudentOption {
  id: string;
  nama: string;
  nisn: string;
}

export interface RaportFormData {
  student_id: string;
  periode: string;
  makhroj: number | '';
  tajwid: number | '';
  lancar: number | '';
  buku_surah: string;
  halaman: number | '';
  catatan: string;
}

export interface RaportFormProps {
  /** Jika diberikan, form beroperasi dalam mode edit (menyembunyikan pilih siswa+periode) */
  editingId?: string | null;
  /** Data awal untuk mode edit */
  initialData?: Partial<RaportFormData> | null;
  /** Pre-fill student_id dari luar */
  preselectedStudentId?: string;
  loading?: boolean;
  onSubmit: (data: RaportFormData, id?: string) => void;
  onCancel: () => void;
  /** Dipanggil saat duplikat terdeteksi, berikan existing raport id */
  onDuplicateDetected?: (existingId: string, existingData: any) => void;
}

interface FormErrors {
  student_id?: string;
  periode?: string;
  makhroj?: string;
  tajwid?: string;
  lancar?: string;
  halaman?: string;
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validate(data: RaportFormData, isEdit: boolean): FormErrors {
  const errors: FormErrors = {};

  if (!isEdit && !data.student_id) {
    errors.student_id = 'Siswa wajib dipilih.';
  }
  if (!isEdit && (!data.periode || !data.periode.trim())) {
    errors.periode = 'Periode wajib diisi.';
  }

  const validateScore = (field: keyof FormErrors, value: number | '') => {
    if (value !== '') {
      const num = Number(value);
      if (isNaN(num) || num < 0 || num > 100) {
        errors[field] = `Nilai harus antara 0 dan 100.`;
      }
    }
  };

  validateScore('makhroj', data.makhroj);
  validateScore('tajwid', data.tajwid);
  validateScore('lancar', data.lancar);

  if (data.halaman !== '') {
    const num = Number(data.halaman);
    if (isNaN(num) || num < 1) {
      errors.halaman = 'Halaman harus berupa angka positif.';
    }
  }

  return errors;
}

// ─── Score Input Component ────────────────────────────────────────────────────

function ScoreInput({
  label,
  value,
  onChange,
  error,
  disabled,
}: {
  label: string;
  value: number | '';
  onChange: (v: number | '') => void;
  error?: string;
  disabled?: boolean;
}) {
  // Determine badge color based on score
  let badgeClass = 'bg-slate-100 text-slate-500';
  if (value !== '') {
    const num = Number(value);
    if (num >= 80) badgeClass = 'bg-emerald-100 text-emerald-700';
    else if (num >= 60) badgeClass = 'bg-yellow-100 text-yellow-700';
    else badgeClass = 'bg-red-100 text-red-600';
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={100}
          value={value === '' ? '' : value}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '') {
              onChange('');
            } else {
              const num = parseInt(val, 10);
              onChange(isNaN(num) ? '' : Math.min(100, Math.max(0, num)));
            }
          }}
          disabled={disabled}
          placeholder="0–100"
          className={[
            'w-full rounded-lg border text-sm text-slate-800 placeholder-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500',
            'transition-colors px-3 py-2',
            error
              ? 'border-red-400 bg-red-50 focus:ring-red-400 focus:border-red-400'
              : 'border-slate-300 bg-white',
            'disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed',
          ].join(' ')}
        />
        {value !== '' && (
          <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${badgeClass}`}>
            {value >= 80 ? 'Baik' : value >= 60 ? 'Cukup' : 'Perlu\u00a0Perbaikan'}
          </span>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RaportForm({
  editingId,
  initialData,
  preselectedStudentId,
  loading = false,
  onSubmit,
  onCancel,
  onDuplicateDetected,
}: RaportFormProps) {
  const isEdit = Boolean(editingId);

  const emptyForm = (): RaportFormData => ({
    student_id: preselectedStudentId ?? '',
    periode: '',
    makhroj: '',
    tajwid: '',
    lancar: '',
    buku_surah: '',
    halaman: '',
    catatan: '',
  });

  const [form, setForm] = useState<RaportFormData>(emptyForm());
  const [errors, setErrors] = useState<FormErrors>({});
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // ── Fetch daftar siswa ───────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setStudentsLoading(true);

    fetch('/api/siswa/list')
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json) => {
        if (!cancelled) {
          const list: StudentOption[] = (json.data ?? []).map((s: any) => ({
            id: s.id,
            nama: s.nama,
            nisn: s.nisn,
          }));
          setStudents(list);
        }
      })
      .catch(() => { if (!cancelled) setStudents([]); })
      .finally(() => { if (!cancelled) setStudentsLoading(false); });

    return () => { cancelled = true; };
  }, []);

  // ── Populate form saat edit ──────────────────────────────────────────────
  useEffect(() => {
    if (initialData) {
      setForm({
        student_id: initialData.student_id ?? preselectedStudentId ?? '',
        periode: initialData.periode ?? '',
        makhroj: initialData.makhroj ?? '',
        tajwid: initialData.tajwid ?? '',
        lancar: initialData.lancar ?? '',
        buku_surah: initialData.buku_surah ?? '',
        halaman: initialData.halaman ?? '',
        catatan: initialData.catatan ?? '',
      });
    } else {
      setForm(emptyForm());
    }
    setErrors({});
    setDuplicateWarning(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, editingId, preselectedStudentId]);

  const set = <K extends keyof RaportFormData>(key: K, value: RaportFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
    // Hapus peringatan duplikat saat user mengubah student atau periode
    if (key === 'student_id' || key === 'periode') {
      setDuplicateWarning(null);
    }
  };

  // ── Cek duplikat saat student atau periode berubah (mode tambah) ─────────
  const checkDuplicate = useCallback(
    async (studentId: string, periode: string) => {
      if (!studentId || !periode.trim() || isEdit) return;

      setCheckingDuplicate(true);
      try {
        const res = await fetch(
          `/api/raport/list?student_id=${encodeURIComponent(studentId)}&periode=${encodeURIComponent(periode.trim())}`
        );
        const json = await res.json();
        const list = json.data ?? [];

        if (list.length > 0) {
          const existingRaport = list[0];
          setDuplicateWarning(
            `Raport untuk siswa ini pada periode "${periode.trim()}" sudah ada. Form akan beralih ke mode edit.`
          );
          onDuplicateDetected?.(existingRaport.id, existingRaport);
        } else {
          setDuplicateWarning(null);
        }
      } catch {
        // silent — jangan blok user
      } finally {
        setCheckingDuplicate(false);
      }
    },
    [isEdit, onDuplicateDetected]
  );

  // Debounce check duplicate saat periode berubah
  useEffect(() => {
    if (isEdit || !form.student_id || !form.periode.trim()) return;

    const timer = setTimeout(() => {
      checkDuplicate(form.student_id, form.periode);
    }, 600);

    return () => clearTimeout(timer);
  }, [form.student_id, form.periode, isEdit, checkDuplicate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate(form, isEdit);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    onSubmit(form, editingId ?? undefined);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* ── Pilih Siswa (hanya mode tambah) ──────────────────────────────── */}
      {!isEdit && (
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
              disabled={loading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              <option value="">— Pilih Siswa —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama} ({s.nisn})
                </option>
              ))}
            </select>
          )}
          {errors.student_id && (
            <p className="text-xs text-red-600" role="alert">{errors.student_id}</p>
          )}
        </div>
      )}

      {/* ── Periode (hanya mode tambah) ──────────────────────────────────── */}
      {!isEdit && (
        <div className="relative">
          <Input
            label="Periode"
            required
            value={form.periode}
            onChange={(e) => set('periode', e.target.value)}
            error={errors.periode}
            placeholder="Contoh: Semester 1 2024"
            disabled={loading}
            helperText="Format bebas, misal: Semester 1 2024 atau 2024-01"
            rightAddon={
              checkingDuplicate ? (
                <span className="w-4 h-4 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin" />
              ) : undefined
            }
          />
        </div>
      )}

      {/* ── Peringatan duplikat ───────────────────────────────────────────── */}
      {duplicateWarning && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div className="flex items-center gap-2">
            <Edit2 size={14} className="shrink-0" />
            <span>{duplicateWarning}</span>
          </div>
        </div>
      )}

      {/* ── Nilai ────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">Penilaian (0 – 100)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ScoreInput
            label="Makhroj"
            value={form.makhroj}
            onChange={(v) => set('makhroj', v)}
            error={errors.makhroj}
            disabled={loading}
          />
          <ScoreInput
            label="Tajwid"
            value={form.tajwid}
            onChange={(v) => set('tajwid', v)}
            error={errors.tajwid}
            disabled={loading}
          />
          <ScoreInput
            label="Kelancaran"
            value={form.lancar}
            onChange={(v) => set('lancar', v)}
            error={errors.lancar}
            disabled={loading}
          />
        </div>
        <p className="text-xs text-slate-400">
          ≥80 = Baik (hijau) &nbsp;·&nbsp; 60–79 = Cukup (kuning) &nbsp;·&nbsp; &lt;60 = Perlu Perbaikan (merah)
        </p>
      </div>

      {/* ── Buku / Surah ─────────────────────────────────────────────────── */}
      <Input
        label="Buku / Surah"
        value={form.buku_surah}
        onChange={(e) => set('buku_surah', e.target.value)}
        placeholder="Contoh: Juz 30 / Al-Mulk"
        disabled={loading}
      />

      {/* ── Halaman ──────────────────────────────────────────────────────── */}
      <Input
        label="Halaman"
        type="number"
        min={1}
        value={form.halaman === '' ? '' : String(form.halaman)}
        onChange={(e) => {
          const val = e.target.value;
          set('halaman', val === '' ? '' : parseInt(val, 10) || '');
        }}
        error={errors.halaman}
        placeholder="Opsional"
        disabled={loading}
      />

      {/* ── Catatan ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">
          Catatan Ustadz/ah{' '}
          <span className="text-xs font-normal text-slate-400">(opsional)</span>
        </label>
        <textarea
          value={form.catatan}
          onChange={(e) => set('catatan', e.target.value)}
          rows={3}
          disabled={loading}
          placeholder="Tuliskan catatan atau rekomendasi untuk orang tua..."
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100 disabled:cursor-not-allowed resize-none"
        />
      </div>

      {/* ── Tombol Aksi ──────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Batal
        </Button>
        <Button type="submit" variant="primary" loading={loading}>
          {isEdit ? 'Perbarui Raport' : 'Simpan Raport'}
        </Button>
      </div>
    </form>
  );
}
