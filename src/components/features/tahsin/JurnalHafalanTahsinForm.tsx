'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Trash2, ChevronDown, Loader2, Edit2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { TahsinMetode } from '@/types';
import type { NilaiTahfidz } from '@/lib/surahData';
import { JUZ_TERSEDIA, SURAH_PER_JUZ, NILAI_TANPA_HAFAL, NILAI_LANCAR, SURAH_ALQURAN_LIST } from '@/lib/surahData';
import { todayStr } from '@/lib/time';

interface StudentOption {
  id: string;
  nama: string;
  nisn: string;
  classes?: { name: string } | null;
}

export interface JurnalDetailRow {
  nama_surah: string;
  makhroj: NilaiTahfidz;
  tajwid: NilaiTahfidz;
  lancar: NilaiTahfidz;
  buku: string;
  halaman: string;
}

// ── Slide: each slide = one juz with its own rows ──
export interface JurnalSlide {
  id: number;
  juz: number | '';
  rows: JurnalDetailRow[];
}

export interface JurnalHafalanTahsinFormData {
  student_id: string;
  tanggal: string;
  tahsin_metode: TahsinMetode | '';
  tahsin_buku: string;
  tahsin_halaman: string;
  tahsin_makhroj: NilaiTahfidz;
  tahsin_kelancaran: NilaiTahfidz;
  tahsin_adab: NilaiTahfidz;
  tahsin_catatan: string;
  detail: JurnalDetailRow[];
}

export type JurnalFormMode = 'both' | 'hafalan' | 'tahsin';

interface Props {
  loading?: boolean;
  mode?: JurnalFormMode;
  selectedStudentId?: string | null;
  onSubmit: (data: JurnalHafalanTahsinFormData) => void;
  onCancel: () => void;
}

// Options for Makhroj and Tajwid (without Hafal option)
const NILAI_MAKHROJ_TAJWID = NILAI_TANPA_HAFAL;

// Options for Lancar column (Kosong, Lancar, Kurang Lancar, Tidak Lancar)
const NILAI_LANCAR_OPTS = NILAI_LANCAR;

// Opsi buku/jilid berdasarkan metode tahsin
const BUKU_WAFA_OPTIONS = ['WAFA 1', 'WAFA 2', 'WAFA 3', 'WAFA 4', 'WAFA 5', 'TAJWID', 'GHORIB'];
const BUKU_IWR_OPTIONS = ['Jilid 1', 'Jilid 2', 'Jilid 3', 'Jilid 4', 'Panduan Tajwid & Ghorib'];

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

const emptyRow = (): JurnalDetailRow => ({
  nama_surah: '',
  makhroj: '',
  tajwid: '',
  lancar: '',
  buku: '',
  halaman: '',
});

let nextSlideId = 1;
const newSlide = (juz: number | '' = '', rows: JurnalDetailRow[] = [emptyRow()]): JurnalSlide => ({
  id: nextSlideId++,
  juz,
  rows,
});

const EMPTY_FORM: JurnalHafalanTahsinFormData = {
  student_id: '',
  tanggal: todayStr(),
  tahsin_metode: '',
  tahsin_buku: '',
  tahsin_halaman: '',
  tahsin_makhroj: '',
  tahsin_kelancaran: '',
  tahsin_adab: '',
  tahsin_catatan: '',
  detail: [emptyRow()],
};

export default function JurnalHafalanTahsinForm({ loading = false, mode = 'both', selectedStudentId, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<JurnalHafalanTahsinFormData>(EMPTY_FORM);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Slide state ──
  const [slides, setSlides] = useState<JurnalSlide[]>([newSlide()]);
  const [_activeSlideIndex, setActiveSlideIndex] = useState(0);

  // Cek apakah jurnal sudah ada pada tanggal ini untuk siswa terpilih
  const [isCheckingJournal, setIsCheckingJournal] = useState(false);
  const [isEditingExisting, setIsEditingExisting] = useState(false);

  // Auto-set student when mode is 'hafalan' or 'tahsin'
  useEffect(() => {
    if ((mode === 'hafalan' || mode === 'tahsin') && selectedStudentId) {
      setForm((prev) => ({ ...prev, student_id: selectedStudentId }));
    }
  }, [mode, selectedStudentId]);

  useEffect(() => {
    let cancelled = false;
    setStudentsLoading(true);

    fetch('/api/siswa/list')
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json) => {
        if (!cancelled) {
          setStudents((json.data ?? []).map((s: any) => ({
            id: s.id,
            nama: s.nama,
            nisn: s.nisn,
            classes: s.classes,
          })));
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

  useEffect(() => {
    // Skip existing journal detection when adding from specific section (always new entry)
    if (mode === 'hafalan' || mode === 'tahsin') {
      setIsEditingExisting(false);
      return;
    }

    if (!form.student_id || !form.tanggal) {
      setIsEditingExisting(false);
      return;
    }

    let cancelled = false;
    setIsCheckingJournal(true);

    fetch(`/api/jurnal-hafalan-tahsin/add?student_id=${form.student_id}&tanggal=${form.tanggal}`)
      .then((res) => (res.ok ? res.json() : { data: null }))
      .then((json) => {
        if (cancelled) return;
        const data = json.data;
        if (data && (data.hafalan?.length > 0 || data.tahsin)) {
          // Ada data jurnal eksis -> Muat ke form (Edit mode)
          setIsEditingExisting(true);
          setForm((prev) => ({
            ...prev,
            detail: data.hafalan.map((h: any) => ({
              nama_surah: h.surah_juz || '',
              makhroj: h.makhroj || '',
              tajwid: h.tajwid || '',
              lancar: h.lancar || '',
              buku: h.buku || '',
              halaman: h.halaman ?? '',
            })),
            tahsin_metode: data.tahsin?.metode || 'Wafa',
            tahsin_buku: data.tahsin?.buku || '',
            tahsin_halaman: data.tahsin?.halaman ?? '',
            tahsin_makhroj: data.tahsin?.makhroj || '',
            tahsin_kelancaran: data.tahsin?.kelancaran || '',
            tahsin_adab: data.tahsin?.adab || '',
            tahsin_catatan: data.tahsin?.catatan || '',
          }));
          // When editing existing, put all rows into a single slide (no juz known)
          const loadedRows: JurnalDetailRow[] = data.hafalan.map((h: any) => ({
            nama_surah: h.surah_juz || '',
            makhroj: h.makhroj || '',
            tajwid: h.tajwid || '',
            lancar: h.lancar || '',
            buku: h.buku || '',
            halaman: h.halaman ?? '',
          }));
          setSlides([newSlide('', loadedRows.length > 0 ? loadedRows : [emptyRow()])]);
          setActiveSlideIndex(0);
        } else {
          // Tidak ada data harian -> Auto-fill dari riwayat tahsin terakhir
          setIsEditingExisting(false);

          // Fetch riwayat tahsin terakhir untuk auto-fill
          fetch(`/api/tahsin/list?student_id=${form.student_id}&limit=1`)
            .then((res) => (cancelled ? null : res.ok ? res.json() : { data: [] }))
            .then((tahsinJson) => {
              if (cancelled || !tahsinJson) return;
              const lastTahsin = tahsinJson.data?.[0];
              setForm((prev) => ({
                ...prev,
                tahsin_metode: lastTahsin?.metode || '',
                tahsin_buku: lastTahsin?.buku || '',
                tahsin_halaman: lastTahsin?.halaman ?? '',
                tahsin_makhroj: '',
                tahsin_kelancaran: '',
                tahsin_adab: '',
                tahsin_catatan: '',
                detail: [emptyRow()],
              }));
              setSlides([newSlide()]);
              setActiveSlideIndex(0);
            })
            .catch(() => {
              if (cancelled) return;
              setForm((prev) => ({
                ...prev,
                tahsin_metode: '',
                tahsin_buku: '',
                tahsin_halaman: '',
                tahsin_makhroj: '',
                tahsin_kelancaran: '',
                tahsin_adab: '',
                tahsin_catatan: '',
                detail: [emptyRow()],
              }));
              setSlides([newSlide()]);
              setActiveSlideIndex(0);
            });
        }
      })
      .catch(() => {
        if (!cancelled) setIsEditingExisting(false);
      })
      .finally(() => {
        if (!cancelled) setIsCheckingJournal(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form.student_id, form.tanggal, mode]);

  // Auto-fill tahsin dari riwayat terakhir (mode='tahsin' saja)
  useEffect(() => {
    if (mode !== 'tahsin') return;
    if (!form.student_id) return;

    let cancelled = false;

    fetch(`/api/tahsin/list?student_id=${form.student_id}&limit=1`)
      .then((res) => (cancelled ? null : res.ok ? res.json() : { data: [] }))
      .then((json) => {
        if (cancelled || !json) return;
        const lastTahsin = json.data?.[0];
        if (lastTahsin) {
          setForm((prev) => ({
            ...prev,
            tahsin_metode: lastTahsin.metode || '',
            tahsin_buku: lastTahsin.buku || '',
            tahsin_halaman: lastTahsin.halaman ?? '',
          }));
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [form.student_id, mode]);

  const setField = <K extends keyof JurnalHafalanTahsinFormData>(key: K, value: JurnalHafalanTahsinFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  // ── Slide helpers ──

  const addSlide = () => {
    setSlides((prev) => [...prev, newSlide()]);
    setActiveSlideIndex(slides.length); // switch to the new slide
  };

  const removeSlide = (index: number) => {
    if (slides.length <= 1) return;
    setSlides((prev) => prev.filter((_, i) => i !== index));
    setActiveSlideIndex((prev) => {
      if (prev >= slides.length - 1) return Math.max(0, slides.length - 2);
      return prev > index ? prev - 1 : prev;
    });
  };

  const setSlideJuz = (slideIndex: number, juz: number) => {
    const rows: JurnalDetailRow[] = (SURAH_PER_JUZ[juz] ?? []).map((item) => ({
      nama_surah: item.nama,
      makhroj: '',
      tajwid: '',
      lancar: '',
      buku: '',
      halaman: '',
    }));
    if (rows.length === 0) return;

    setSlides((prev) => prev.map((s, i) => i === slideIndex ? { ...s, juz, rows } : s));
    setErrors((prev) => ({ ...prev, detail: '' }));
  };

  const updateSlideRow = (slideIndex: number, rowIndex: number, field: keyof JurnalDetailRow, value: string | number) => {
    setSlides((prev) => prev.map((s, i) => {
      if (i !== slideIndex) return s;
      const nextRows = [...s.rows];
      nextRows[rowIndex] = { ...nextRows[rowIndex], [field]: value } as JurnalDetailRow;
      return { ...s, rows: nextRows };
    }));
  };

  const addSlideRow = (slideIndex: number) => {
    setSlides((prev) => prev.map((s, i) => i === slideIndex ? { ...s, rows: [...s.rows, emptyRow()] } : s));
  };

  const removeSlideRow = (slideIndex: number, rowIndex: number) => {
    setSlides((prev) => prev.map((s, i) => {
      if (i !== slideIndex) return s;
      return { ...s, rows: s.rows.filter((_, ri) => ri !== rowIndex) };
    }));
  };

  // ── Flatten slides into detail[] for submit ──
  const flattenSlidesToDetail = (): JurnalDetailRow[] => {
    return slides.flatMap((s) => s.rows);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!form.student_id) nextErrors.student_id = 'Pilih siswa terlebih dahulu.';
    if (!form.tanggal || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(form.tanggal)) {
      nextErrors.tanggal = 'Tanggal wajib diisi.';
    }

    // Validate tahsin fields only if mode includes tahsin
    if (mode === 'both' || mode === 'tahsin') {
      if (!form.tahsin_metode) nextErrors.tahsin_metode = 'Metode tahsin wajib dipilih.';
      if (!form.tahsin_buku.trim()) nextErrors.tahsin_buku = 'Buku tahsin wajib diisi.';
    }

    // Validate hafalan fields only if mode includes hafalan
    if (mode === 'both' || mode === 'hafalan') {
      const allRows = flattenSlidesToDetail();
      if (allRows.length === 0) {
        nextErrors.detail = 'Minimal satu baris hafalan harus diisi.';
      } else {
        allRows.forEach((row) => {
          if (!row.nama_surah.trim()) {
            nextErrors.detail = 'Nama surah di setiap baris tidak boleh kosong.';
          }
        });
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    // Flatten slides into detail for backward-compatible submission
    onSubmit({ ...form, detail: flattenSlidesToDetail() });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Indicator Mode Jurnal */}
      {form.student_id && form.tanggal && (
        <div className={`rounded-xl border p-4 transition-all duration-300 ${
          isCheckingJournal 
            ? 'bg-slate-50 border-slate-200 text-slate-600 animate-pulse'
            : isEditingExisting
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              isCheckingJournal
                ? 'bg-slate-200 text-slate-500'
                : isEditingExisting
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-amber-100 text-amber-600'
            }`}>
              {isCheckingJournal ? (
                <Loader2 className="animate-spin" size={16} />
              ) : isEditingExisting ? (
                <Edit2 size={16} />
              ) : (
                <Plus size={16} />
              )}
            </div>
            <div>
              <p className="text-sm font-bold">
                {isCheckingJournal 
                  ? 'Memeriksa riwayat jurnal harian...' 
                  : isEditingExisting 
                    ? 'Mode Edit Jurnal (Perkembangan Harian)' 
                    : 'Membuat Jurnal Baru'}
              </p>
              <p className="text-xs opacity-80 mt-0.5">
                {isCheckingJournal
                  ? 'Harap tunggu, sedang mencari catatan jurnal...'
                  : isEditingExisting
                    ? 'Data untuk siswa ini pada tanggal tersebut sudah ada. Mengubah nilai di bawah akan memperbarui catatan harian yang ada.'
                    : 'Belum ada catatan jurnal pada tanggal tersebut. Data akan disimpan sebagai entri baru.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 gap-4 ${mode === 'both' ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
        {mode === 'both' && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Siswa <span className="text-red-500">*</span></label>
          {studentsLoading ? (
            <div className="h-10 rounded-lg bg-slate-100 animate-pulse" />
          ) : (
            <select
              value={form.student_id}
              onChange={(e) => setField('student_id', e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100"
            >
              <option value="">— Pilih Siswa —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama} ({s.nisn}){s.classes ? ` — ${s.classes.name}` : ''}
                </option>
              ))}
            </select>
          )}
          {errors.student_id && <p className="text-xs text-red-600">{errors.student_id}</p>}
        </div>
        )}
        <Input
          label="Tanggal"
          type="date"
          value={form.tanggal}
          onChange={(e) => setField('tanggal', e.target.value)}
          error={errors.tanggal}
          disabled={loading}
        />
      </div>

      {(mode === 'both' || mode === 'hafalan') && (
      <div className="space-y-4">
        {/* ── Section Header ── */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">Penilaian Hafalan</h3>
          <button
            type="button"
            onClick={addSlide}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-amber-700 border border-dashed border-amber-300 hover:bg-amber-50 transition-colors disabled:opacity-50"
          >
            <Plus size={14} /> Tambah Slide Juz
          </button>
        </div>

        {/* ── Each slide = its own independent section with table ── */}
        {slides.map((slide, slideIdx) => {
          return (
            <div key={slide.id} className="rounded-xl border border-amber-200 overflow-hidden">
              {/* Slide header banner */}
              <div className="bg-amber-700 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-white font-bold text-sm">
                    {slide.juz ? `Juz ${slide.juz}` : `Slide ${slideIdx + 1}`}
                  </span>
                  {slide.juz && (
                    <span className="text-amber-200 text-xs">{slide.rows.length} baris</span>
                  )}
                  {slides.length > 1 && (
                    <span className="text-amber-300 text-xs font-medium">#{slideIdx + 1}</span>
                  )}
                </div>
                {slides.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSlide(slideIdx)}
                    disabled={loading || slides.length <= 1}
                    className="text-amber-200 hover:text-white transition-colors disabled:opacity-30"
                    title="Hapus slide ini"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              <div className="p-4 space-y-3">
                {/* Juz selector per slide */}
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Template Juz</label>
                    <select
                      value={slide.juz === '' ? '' : String(slide.juz)}
                      onChange={(e) => {
                        const value = e.target.value ? Number(e.target.value) : 0;
                        if (value) setSlideJuz(slideIdx, value);
                      }}
                      disabled={loading}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100"
                    >
                      <option value="">— Pilih Template Juz —</option>
                      {JUZ_TERSEDIA.map((juz) => (
                        <option key={juz} value={String(juz)}>
                          Juz {juz}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Table for this slide */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wide border-b border-slate-200">
                      <th className="px-3 py-2 text-left w-8">No</th>
                      <th className="px-3 py-2 text-left min-w-[130px]">Surah</th>
                      <th className="px-3 py-2 text-center w-14">Makhroj</th>
                      <th className="px-3 py-2 text-center w-14">Tajwid</th>
                      <th className="px-3 py-2 text-center w-14">Lancar</th>
                      <th className="px-3 py-2 text-center min-w-[80px]">Ayat</th>
                      <th className="px-3 py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {slide.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-400 text-xs">{rowIndex + 1}</td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.nama_surah}
                            onChange={(e) => updateSlideRow(slideIdx, rowIndex, 'nama_surah', e.target.value)}
                            disabled={loading}
                            placeholder="Nama surah..."
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-50"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <NilaiSelect value={row.makhroj} onChange={(value) => updateSlideRow(slideIdx, rowIndex, 'makhroj', value)} disabled={loading} />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <NilaiSelect value={row.tajwid} onChange={(value) => updateSlideRow(slideIdx, rowIndex, 'tajwid', value)} disabled={loading} />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <NilaiSelect value={row.lancar} onChange={(value) => updateSlideRow(slideIdx, rowIndex, 'lancar', value)} disabled={loading} options={NILAI_LANCAR_OPTS} />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.halaman}
                            onChange={(e) => updateSlideRow(slideIdx, rowIndex, 'halaman', e.target.value)}
                            disabled={loading}
                            placeholder="Ayat..."
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-50"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => removeSlideRow(slideIdx, rowIndex)}
                            disabled={loading || slide.rows.length <= 1}
                            className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer: tambah baris per slide */}
              <div className="px-4 py-2.5 border-t border-slate-100 bg-white">
                <button
                  type="button"
                  onClick={() => addSlideRow(slideIdx)}
                  disabled={loading}
                  className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors disabled:opacity-50"
                >
                  <Plus size={15} /> Tambah Baris Surah
                </button>
              </div>
            </div>
          );
        })}

        {errors.detail && (
          <p className="px-4 py-2 text-xs text-red-600 border border-red-200 rounded-lg bg-red-50">{errors.detail}</p>
        )}
      </div>
      )}

      {(mode === 'both' || mode === 'tahsin') && (
      <div className="rounded-xl border border-indigo-200 overflow-hidden">
        <div className="bg-indigo-700 px-4 py-3 text-white font-semibold">Penilaian Tahsin</div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Metode</label>
              <select
                value={form.tahsin_metode}
                onChange={(e) => {
                  const newMetode = e.target.value as TahsinMetode;
                  setForm((prev) => ({ ...prev, tahsin_metode: newMetode, tahsin_buku: '' }));
                  setErrors((prev) => ({ ...prev, tahsin_metode: '', tahsin_buku: '' }));
                }}
                disabled={loading}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
              >
                <option value="">— Pilih Metode —</option>
                <option value="Wafa">Wafa</option>
                <option value="IWR">IWR</option>
                <option value="Al-Quran">Al-Quran</option>
              </select>
              {errors.tahsin_metode && <p className="text-xs text-red-600">{errors.tahsin_metode}</p>}
            </div>
            {form.tahsin_metode === 'Wafa' || form.tahsin_metode === 'IWR' || form.tahsin_metode === 'Al-Quran' ? (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Jilid / Surah</label>
                <select
                  value={form.tahsin_buku}
                  onChange={(e) => setField('tahsin_buku', e.target.value)}
                  disabled={loading}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                >
                  <option value="">— Pilih —</option>
                  {(form.tahsin_metode === 'Wafa' ? BUKU_WAFA_OPTIONS : form.tahsin_metode === 'IWR' ? BUKU_IWR_OPTIONS : SURAH_ALQURAN_LIST).map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {errors.tahsin_buku && <p className="text-xs text-red-600">{errors.tahsin_buku}</p>}
              </div>
            ) : (
              <Input
                label="Jilid / Surah"
                value={form.tahsin_buku}
                onChange={(e) => setField('tahsin_buku', e.target.value)}
                error={errors.tahsin_buku}
                disabled={loading}
              />
            )}
            <Input
              label="Halaman / Ayat"
              value={form.tahsin_halaman}
              onChange={(e) => setField('tahsin_halaman', e.target.value)}
              disabled={loading}
              placeholder="Halaman..."
            />
          </div>

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
                  { field: 'tahsin_adab' as const, label: 'Tajwid', desc: 'Penerapan tajwid saat membaca' },
                ].map(({ field, label, desc }) => (
                  <tr key={field} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 text-sm">{label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <NilaiSelect
                        value={form[field]}
                        onChange={(value) => setField(field, value)}
                        disabled={loading}
                        options={field === 'tahsin_kelancaran' ? NILAI_LANCAR_OPTS : undefined}
                      />
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs text-slate-400">
                        {form[field] === '✓' ? 'Lulus / Hafal' :
                          form[field] === 'L' ? 'Lancar' :
                          form[field] === 'KL' ? 'Kurang Lancar' :
                          form[field] === 'TL' ? 'Tidak Lancar' :
                          form[field] === 'A' ? 'Sangat Baik (100)' :
                          form[field] === 'B' ? 'Baik (80)' :
                          form[field] === 'C' ? 'Cukup (70)' :
                          form[field] === 'D' ? 'Kurang (55)' :
                          '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wide block mb-1">Catatan Tahsin</label>
            <textarea
              value={form.tahsin_catatan}
              onChange={(e) => setField('tahsin_catatan', e.target.value)}
              rows={3}
              disabled={loading}
              placeholder="Catatan singkat tahsin siswa..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 resize-none"
            />
          </div>
        </div>
      </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Batal
        </Button>
        <Button type="submit" variant="primary" loading={loading}>
          Simpan Jurnal
        </Button>
      </div>
    </form>
  );
}
