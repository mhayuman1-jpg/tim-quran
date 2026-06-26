'use client';
export const dynamic = 'force-dynamic';

// src/app/(dashboard)/tahsin/page.tsx
// Halaman jurnal hafalan & tahsin gabungan dengan ringkasan riwayat.
// Flow: Scan QR absen → pilih siswa → isi jurnal

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import nextDynamic from 'next/dynamic';
import { Plus, BookOpenCheck, Users, XCircle, BookText, BookOpen, ScanLine, CheckCircle, AlertCircle, RefreshCw, ArrowLeft, Filter } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import SearchInput from '@/components/shared/SearchInput';
import { toImageUrl } from '@/lib/storage/urls';
import JurnalHafalanTahsinForm, { type JurnalFormMode } from '@/components/features/tahsin/JurnalHafalanTahsinForm';
import TahsinHistory from '@/components/features/tahsin/TahsinHistory';
import HafalanHistory from '@/components/features/hafalan/HafalanHistory';
import HafalanForm, { type HafalanFormData } from '@/components/features/hafalan/HafalanForm';
import TahsinForm, { type TahsinFormData } from '@/components/features/tahsin/TahsinForm';
import { useViewMode } from '@/hooks/useViewMode';
import { useRole } from '@/hooks/useRole';
import type { Hafalan, Tahsin } from '@/types';

const QRScanner = nextDynamic(
  () => import('@/components/features/qr-scanner/QRScanner'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-48 rounded-2xl bg-slate-100">
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Memuat scanner…</span>
        </div>
      </div>
    ),
  }
);

// ─── Audio ────────────────────────────────────────────────────────────────────

function playBeep(freq: number, duration: number, volume = 0.3, type: OscillatorType = 'sine') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch { /* silent fail */ }
}

function playSuccessBeep() {
  try {
    const audio = new Audio('/audio/absensi-siswa.mp3');
    audio.volume = 0.8;
    audio.play().catch(() => {});
  } catch { /* silent fail */ }
}

function playWarningBeep() {
  playBeep(600, 0.12, 0.25);
}

function playErrorBeep() {
  playBeep(400, 0.1, 0.25);
  setTimeout(() => playBeep(300, 0.12, 0.2), 120);
}

interface StudentOption {
  id: string;
  nama: string;
  nisn?: string | null;
  gender?: string | null;
  tanggal_lahir?: string | null;
  juz_terakhir?: number | null;
  status?: string | null;
  photo_url?: string | null;
  classes?: { id: string; name: string } | null;
}

export default function TahsinPage() {
  const { viewAsRole, viewAsTeacherId } = useViewMode();
  const { role } = useRole();
  const isTeacherMode = role === 'Tim_Quran' || viewAsRole === 'Tim_Quran';
  const viewHeaders = useMemo(() => {
    const h: Record<string, string> = {};
    if (viewAsRole === 'Tim_Quran') {
      h['x-view-mode'] = 'teaching';
      if (viewAsTeacherId) h['x-view-as-teacher-id'] = viewAsTeacherId;
    }
    return h;
  }, [viewAsRole, viewAsTeacherId]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<JurnalFormMode>('both');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [studentList, setStudentList] = useState<StudentOption[]>([]);
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [studentModalOpen, setStudentModalOpen] = useState(false);

  // Edit hafalan state
  const [editHafalanOpen, setEditHafalanOpen] = useState(false);
  const [editingHafalan, setEditingHafalan] = useState<any>(null);
  const [hafalanSubmitting, setHafalanSubmitting] = useState(false);
  const [hafalanError, setHafalanError] = useState<string | null>(null);
  const [hafalanCount, setHafalanCount] = useState(0);

  // Edit tahsin state
  const [editTahsinOpen, setEditTahsinOpen] = useState(false);
  const [editingTahsin, setEditingTahsin] = useState<any>(null);
  const [tahsinSubmitting, setTahsinSubmitting] = useState(false);
  const [tahsinError, setTahsinError] = useState<string | null>(null);

  // Scan QR state
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [scannedList, setScannedList] = useState<{ student_id: string; nama: string; scanned_at: string }[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);

  // ── Class-based view for Tim_Quran
  const [classes, setClasses] = useState<{ id: string; name: string; jumlah_siswa?: number }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedClassName, setSelectedClassName] = useState('');
  const [classesLoading, setClassesLoading] = useState(false);

  useEffect(() => {
    if (!isTeacherMode) return;
    setClassesLoading(true);
    fetch('/api/kelas/list', { headers: viewHeaders })
      .then(r => r.json())
      .then(json => setClasses(json.data ?? []))
      .catch(() => {})
      .finally(() => setClassesLoading(false));
  }, [isTeacherMode, viewHeaders]);

  useEffect(() => {
    if (!scanFeedback) return;
    const t = setTimeout(() => setScanFeedback(null), 3500);
    return () => clearTimeout(t);
  }, [scanFeedback]);

  const fetchTodayList = useCallback(async () => {
    try {
      const res = await fetch('/api/absensi/today');
      const json = await res.json();
      if (json.data) setScannedList(json.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchTodayList(); }, [fetchTodayList]);

  const handleScanSuccess = useCallback((siswa: { nama: string; id: string }) => {
    playSuccessBeep();
    setScanFeedback({ type: 'success', message: `${siswa.nama} — Absen berhasil!` });
    const jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setScannedList(prev => [{ student_id: siswa.id, nama: siswa.nama, scanned_at: jam }, ...prev]);
    fetchTodayList();
    // Auto-select student
    setSelectedStudent({ id: siswa.id, nama: siswa.nama });
  }, [fetchTodayList]);

  const handleScanError = useCallback((pesan: string) => {
    const isWarning = pesan.toLowerCase().includes('sudah absen');
    if (isWarning) playWarningBeep(); else playErrorBeep();
    setScanFeedback({ type: isWarning ? 'warning' : 'error', message: pesan });
  }, []);

  const handleOpenAdd = (mode: JurnalFormMode = 'both') => {
    setFormMode(mode);
    setSubmitError(null);
    setSubmitSuccess(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setModalOpen(false);
    setSubmitError(null);
  };

  // Edit hafalan handlers
  const handleOpenEditHafalan = (hafalan: any) => {
    setEditingHafalan(hafalan);
    setHafalanError(null);
    setEditHafalanOpen(true);
  };

  const handleEditHafalanSubmit = async (formData: HafalanFormData) => {
    setHafalanSubmitting(true);
    setHafalanError(null);
    try {
      const res = await fetch('/api/hafalan/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingHafalan.id,
          tanggal: formData.tanggal,
          surah_juz: formData.surah_juz,
          halaman: formData.ayat,
          catatan: formData.catatan || null,
          makhroj: formData.makhroj || null,
          tajwid: formData.tajwid || null,
          lancar: formData.lancar || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setHafalanError(json.message ?? 'Gagal memperbarui hafalan.');
        return;
      }
      setSubmitSuccess(json.message ?? 'Hafalan berhasil diperbarui.');
      setRefreshKey((k) => k + 1);
      setEditHafalanOpen(false);
      setEditingHafalan(null);
    } catch {
      setHafalanError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setHafalanSubmitting(false);
    }
  };

  // Edit tahsin handlers
  const handleOpenEditTahsin = (tahsin: any) => {
    setEditingTahsin(tahsin);
    setTahsinError(null);
    setEditTahsinOpen(true);
  };

  const handleEditTahsinSubmit = async (formData: TahsinFormData) => {
    setTahsinSubmitting(true);
    setTahsinError(null);
    try {
      const res = await fetch('/api/tahsin/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTahsin.id,
          tanggal: formData.tanggal,
          metode: formData.metode,
          buku: formData.buku,
          halaman: formData.halaman,
          catatan: formData.catatan || null,
          makhroj: formData.makhroj || null,
          kelancaran: formData.kelancaran || null,
          adab: formData.adab || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setTahsinError(json.message ?? 'Gagal memperbarui tahsin.');
        return;
      }
      setSubmitSuccess(json.message ?? 'Tahsin berhasil diperbarui.');
      setRefreshKey((k) => k + 1);
      setEditTahsinOpen(false);
      setEditingTahsin(null);
    } catch {
      setTahsinError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setTahsinSubmitting(false);
    }
  };

  // Delete handlers
  const handleDeleteHafalan = async (hafalan: any) => {
    if (!confirm('Yakin ingin menghapus catatan hafalan ini?')) return;
    try {
      const res = await fetch(`/api/hafalan/delete?id=${hafalan.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        alert(json.message ?? 'Gagal menghapus catatan hafalan.');
        return;
      }
      setRefreshKey((k) => k + 1);
    } catch {
      alert('Terjadi kesalahan. Silakan coba lagi.');
    }
  };

  const handleDeleteTahsin = async (tahsin: any) => {
    if (!confirm('Yakin ingin menghapus catatan tahsin ini?')) return;
    try {
      const res = await fetch(`/api/tahsin/delete?id=${tahsin.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        alert(json.message ?? 'Gagal menghapus catatan tahsin.');
        return;
      }
      setRefreshKey((k) => k + 1);
    } catch {
      alert('Terjadi kesalahan. Silakan coba lagi.');
    }
  };

  const fetchStudents = useCallback(async (query = '', classId = '') => {
    setStudentError(null);
    setStudentLoading(true);

    try {
      const params = new URLSearchParams();
      if (query.trim().length >= 2) params.set('search', query.trim());
      if (classId) params.set('class_id', classId);
      const qs = params.toString();
      const url = qs ? `/api/siswa/list?${qs}` : '/api/siswa/list';
      const res = await fetch(url, { headers: viewHeaders });
      const json = await res.json();

      if (!res.ok) {
        setStudentError(json.message ?? 'Gagal mengambil data siswa.');
        setStudentOptions([]);
        if (!query.trim()) setStudentList([]);
      } else {
        const students = Array.isArray(json.data) ? json.data as StudentOption[] : [];
        if (query.trim().length >= 2) {
          setStudentOptions(students.slice(0, 50));
        } else {
          setStudentList(students.slice(0, 50));
        }
      }
    } catch {
      setStudentError('Terjadi kesalahan saat memuat data siswa.');
      setStudentOptions([]);
      if (!query.trim()) setStudentList([]);
    } finally {
      setStudentLoading(false);
    }
  }, [viewHeaders]);

  const handleSelectClass = (classId: string, className: string) => {
    setSelectedClassId(classId);
    setSelectedClassName(className);
    setSelectedStudent(null);
    fetchStudents('', classId);
  };

  const handleBackToClasses = () => {
    setSelectedClassId('');
    setSelectedClassName('');
    setSelectedStudent(null);
    setStudentList([]);
    setStudentOptions([]);
  };

  const handleSearchStudents = useCallback(async (value: string) => {
    setSearchQuery(value);
    if (value.trim().length >= 2) {
      await fetchStudents(value);
    }
  }, [fetchStudents]);

  const openStudentDetail = (student: StudentOption) => {
    setSelectedStudent(student);
    setStudentModalOpen(true);
  };

  const clearSelectedStudent = () => {
    setSelectedStudent(null);
    setStudentOptions([]);
    setSearchQuery('');
    setStudentError(null);
    setHafalanCount(0);
  };

  React.useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const displayedStudents = searchQuery.trim().length >= 2 ? studentOptions : studentList;

  const isStudentAttended = useCallback((studentId: string) => {
    return scannedList.some(s => s.student_id === studentId);
  }, [scannedList]);

  const selectedStudentAttended = selectedStudent ? isStudentAttended(selectedStudent.id) : false;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BookOpenCheck size={24} className="text-amber-600" />
            Jurnal Hafalan & Tahsin
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Absen dulu lewat QR, lalu isi jurnal hafalan dan tahsin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(!isTeacherMode || selectedClassId) && (
            <>
              <Button
                variant={scannerOpen ? 'secondary' : 'primary'}
                leftIcon={<ScanLine size={16} />}
                onClick={() => setScannerOpen(!scannerOpen)}
              >
                {scannerOpen ? 'Tutup Scanner' : 'Scan QR Absen'}
              </Button>
              <Button
                variant="primary"
                leftIcon={<Plus size={16} />}
                onClick={() => handleOpenAdd('both')}
                disabled={selectedStudent != null && !selectedStudentAttended}
                title={selectedStudent && !selectedStudentAttended ? 'Siswa belum absen hari ini' : undefined}
              >
                Tambah Jurnal
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Scan feedback */}
      {scanFeedback && (
        <div className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 ${
          scanFeedback.type === 'success' ? 'bg-amber-50 border-amber-300 text-amber-800' :
          scanFeedback.type === 'warning' ? 'bg-amber-50 border-amber-300 text-amber-800' :
          'bg-red-50 border-red-300 text-red-800'
        }`}>
          {scanFeedback.type === 'success' ? <CheckCircle size={16} className="shrink-0" /> :
           scanFeedback.type === 'warning' ? <AlertCircle size={16} className="shrink-0" /> :
           <XCircle size={16} className="shrink-0" />}
          <p className="flex-1 text-sm font-medium">{scanFeedback.message}</p>
          <button onClick={() => setScanFeedback(null)} className="opacity-60 hover:opacity-100 text-lg leading-none">×</button>
        </div>
      )}

      {/* QR Scanner Section */}
      {scannerOpen && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <ScanLine size={16} className="text-amber-500" />
              Scan QR ID Card Siswa
            </h2>
            <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={13} />} onClick={fetchTodayList}>
              Refresh
            </Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
            <QRScanner
              onScanSuccess={handleScanSuccess}
              onScanError={handleScanError}
              scannedList={scannedList}
              compact
            />
            <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex flex-col" style={{ maxHeight: '400px' }}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white shrink-0">
                <span className="text-sm font-semibold text-slate-700">Hadir Hari Ini</span>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">{scannedList.length}</span>
              </div>
              {scannedList.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 py-8 text-slate-400 gap-2">
                  <Users size={24} />
                  <p className="text-xs text-center px-4">Belum ada siswa yang scan hari ini</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 overflow-y-auto flex-1">
                  {scannedList.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 px-3 py-2">
                      <CheckCircle size={12} className="text-amber-500 shrink-0" />
                      <span className="flex-1 text-xs font-medium text-slate-700 truncate">{item.nama}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">{item.scanned_at}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {submitSuccess && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 flex justify-between items-center">
          <span>{submitSuccess}</span>
          <button onClick={() => setSubmitSuccess(null)} className="ml-4 text-amber-500 hover:text-amber-700 font-medium">
            x
          </button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(280px,360px)_1fr]">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5">
          {/* ── Class-first view for Tim_Quran ── */}
          {isTeacherMode && !selectedClassId && (
            <>
              <div>
                <h2 className="text-base font-semibold text-slate-800">Pilih Kelas</h2>
                <p className="text-slate-500 text-sm">Pilih kelas untuk melihat daftar siswa.</p>
              </div>
              {classesLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
                  ))}
                </div>
              ) : classes.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                  <Users size={32} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Belum ada kelas yang ditugaskan.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {classes.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleSelectClass(c.id, c.name)}
                      className="w-full text-left rounded-xl border border-slate-200 p-3 hover:border-amber-400 hover:bg-amber-50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shrink-0">
                            <BookOpen size={14} className="text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                            <p className="text-[11px] text-slate-400">{c.jumlah_siswa ?? 0} siswa</p>
                          </div>
                        </div>
                        <span className="text-xs text-amber-600 font-medium">Buka →</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Student list when a class is selected (Tim_Quran) or flat view (Kabid) ── */}
          {(!isTeacherMode || selectedClassId) && (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  {isTeacherMode && selectedClassId && (
                    <button onClick={handleBackToClasses} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 mb-1.5 font-medium">
                      <ArrowLeft size={12} /> Semua Kelas
                    </button>
                  )}
                  <h2 className="text-base font-semibold text-slate-800">
                    {selectedClassName ? `Siswa — ${selectedClassName}` : 'Cari Nama Siswa'}
                  </h2>
                  <p className="text-slate-500 text-sm">Pilih siswa untuk melihat riwayat detail.</p>
                </div>
                {selectedStudent && (
                  <button
                    type="button"
                    onClick={clearSelectedStudent}
                    className="inline-flex items-center gap-2 text-slate-500 hover:text-amber-600"
                  >
                    <XCircle size={16} />
                    Reset
                  </button>
                )}
              </div>

              <SearchInput
                defaultValue={searchQuery}
                onSearch={handleSearchStudents}
                placeholder="Cari nama siswa..."
                disabled={studentLoading}
              />

              {studentError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                  {studentError}
                </div>
              )}

              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  {selectedClassName
                    ? `Siswa di kelas ${selectedClassName}. Klik nama untuk melihat detail.`
                    : 'Cari siswa dengan mengetik nama, atau pilih langsung dari daftar di bawah.'
                  }
                </div>

                {studentLoading ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    Memuat daftar siswa...
                  </div>
                ) : displayedStudents.length > 0 ? (
                  <div className="space-y-2">
                    {displayedStudents.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => openStudentDetail(student)}
                        className={[
                          'w-full text-left rounded-2xl border px-4 py-3 text-slate-800 transition',
                          selectedStudent?.id === student.id
                            ? 'border-amber-400 bg-amber-50'
                            : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50',
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span>{student.nama}</span>
                          <span className="text-xs text-slate-500">{student.nisn ?? ''}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : searchQuery.trim().length >= 2 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    Tidak ditemukan siswa dengan nama tersebut.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    {isTeacherMode && !selectedClassId ? 'Pilih kelas terlebih dahulu.' : 'Belum ada siswa yang tersedia.'}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="space-y-6">
          {selectedStudent ? (
            <>
              {!selectedStudentAttended && (
                <div className="flex items-center gap-2.5 rounded-xl border px-4 py-2.5 bg-amber-50 border-amber-300 text-amber-800">
                  <AlertCircle size={16} className="shrink-0" />
                  <p className="flex-1 text-sm font-medium">
                    Siswa ini belum absen hari ini. Scan QR absen terlebih dahulu untuk mengisi jurnal.
                  </p>
                </div>
              )}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <BookText size={16} className="text-indigo-500" />
                    Riwayat Hafalan
                  </h2>
                  {hafalanCount === 0 && (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Plus size={14} />}
                      onClick={() => handleOpenAdd('hafalan')}
                      disabled={!selectedStudentAttended}
                      title={!selectedStudentAttended ? 'Siswa belum absen hari ini' : undefined}
                    >
                      Tambah Jurnal
                    </Button>
                  )}
                </div>
                <HafalanHistory
                  studentId={selectedStudent.id}
                  refreshKey={refreshKey}
                  onSelectStudent={setSelectedStudent}
                  onEdit={handleOpenEditHafalan}
                  onDelete={handleDeleteHafalan}
                  onDataLoaded={setHafalanCount}
                />
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <BookOpen size={16} className="text-emerald-500" />
                    Riwayat Tahsin
                  </h2>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus size={14} />}
                    onClick={() => handleOpenAdd('tahsin')}
                    disabled={!selectedStudentAttended}
                    title={!selectedStudentAttended ? 'Siswa belum absen hari ini' : undefined}
                  >
                    Tambah Jurnal
                  </Button>
                </div>
                <TahsinHistory
                  studentId={selectedStudent.id}
                  refreshKey={refreshKey}
                  onSelectStudent={setSelectedStudent}
                  onEdit={handleOpenEditTahsin}
                  onDelete={handleDeleteTahsin}
                />
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
              <Users size={36} className="mx-auto mb-4 text-slate-400" />
              <p className="text-base font-semibold">Pilih siswa untuk melihat riwayat detail.</p>
              <p className="text-sm mt-2">Riwayat hafalan dan tahsin akan tampil setelah nama siswa diklik.</p>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={studentModalOpen}
        onClose={() => setStudentModalOpen(false)}
        title={selectedStudent ? `Detail Siswa: ${selectedStudent.nama}` : 'Detail Siswa'}
        size="md"
        closeOnBackdrop
      >
        {selectedStudent ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {selectedStudent.photo_url ? (
                <img src={toImageUrl(selectedStudent.photo_url, 'timquran-profile-photos') || ''} alt={selectedStudent.nama} className="h-20 w-20 rounded-2xl object-cover" />
              ) : (
                <div className="h-20 w-20 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                  Siswa
                </div>
              )}
              <div>
                <p className="text-lg font-semibold text-slate-900">{selectedStudent.nama}</p>
                <p className="text-sm text-slate-500">NIS/NISN: {selectedStudent.nisn ?? '-'}</p>
                <p className="text-sm text-slate-500">Kelas: {selectedStudent.classes?.name ?? '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
              <div>
                <p className="font-medium text-slate-800">Jenis Kelamin</p>
                <p>{selectedStudent.gender ?? '-'}</p>
              </div>
              <div>
                <p className="font-medium text-slate-800">Tanggal Lahir</p>
                <p>{selectedStudent.tanggal_lahir ?? '-'}</p>
              </div>
              <div>
                <p className="font-medium text-slate-800">Status</p>
                <p>{selectedStudent.status ?? '-'}</p>
              </div>
              <div>
                <p className="font-medium text-slate-800">Juz Terakhir</p>
                <p>{selectedStudent.juz_terakhir ?? '-'}</p>
              </div>
            </div>

            <div className="text-right">
              <Button variant="secondary" onClick={() => setStudentModalOpen(false)}>
                Tutup
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Pilih siswa terlebih dahulu untuk melihat detail.</p>
        )}
      </Modal>

      {/* Modal Tambah Jurnal */}
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        title={formMode === 'hafalan' ? 'Tambah Jurnal Hafalan' : formMode === 'tahsin' ? 'Tambah Jurnal Tahsin' : 'Tambah Jurnal Hafalan & Tahsin'}
        size="xl"
        closeOnBackdrop={!submitting}
      >
        {submitError && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {submitError}
          </div>
        )}

        <JurnalHafalanTahsinForm
          loading={submitting}
          mode={formMode}
          selectedStudentId={selectedStudent?.id}
          onSubmit={async (data) => {
            setSubmitting(true);
            setSubmitError(null);
            setSubmitSuccess(null);
            try {
              const res = await fetch('/api/jurnal-hafalan-tahsin/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
              });
              const json = await res.json();
              if (!res.ok) {
                setSubmitError(json.error ? `${json.message} (${json.error})` : json.message ?? 'Gagal menyimpan jurnal.');
                return;
              }
              setSubmitSuccess(json.message ?? 'Jurnal berhasil disimpan.');
              setRefreshKey((prev) => prev + 1);
              setModalOpen(false);
            } catch {
              setSubmitError('Terjadi kesalahan. Silakan coba lagi.');
            } finally {
              setSubmitting(false);
            }
          }}
          onCancel={handleCloseModal}
        />
      </Modal>

      {/* Modal Edit Hafalan */}
      <Modal
        open={editHafalanOpen}
        onClose={() => { if (!hafalanSubmitting) { setEditHafalanOpen(false); setEditingHafalan(null); } }}
        title="Edit Catatan Hafalan"
        size="md"
        closeOnBackdrop={!hafalanSubmitting}
      >
        {hafalanError && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {hafalanError}
          </div>
        )}
        <HafalanForm
          initialData={editingHafalan ? {
            id: editingHafalan.id,
            student_id: editingHafalan.student_id,
            teacher_id: editingHafalan.teacher_id,
            tanggal: editingHafalan.tanggal,
            surah_juz: editingHafalan.surah_juz,
            halaman: editingHafalan.halaman,
            catatan: editingHafalan.catatan ?? undefined,
            created_at: editingHafalan.created_at,
          } : null}
          loading={hafalanSubmitting}
          onSubmit={handleEditHafalanSubmit}
          onCancel={() => { if (!hafalanSubmitting) { setEditHafalanOpen(false); setEditingHafalan(null); } }}
        />
      </Modal>

      {/* Modal Edit Tahsin */}
      <Modal
        open={editTahsinOpen}
        onClose={() => { if (!tahsinSubmitting) { setEditTahsinOpen(false); setEditingTahsin(null); } }}
        title="Edit Catatan Tahsin"
        size="md"
        closeOnBackdrop={!tahsinSubmitting}
      >
        {tahsinError && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {tahsinError}
          </div>
        )}
        <TahsinForm
          initialData={editingTahsin ? {
            id: editingTahsin.id,
            student_id: editingTahsin.student_id,
            teacher_id: editingTahsin.teacher_id,
            tanggal: editingTahsin.tanggal,
            metode: editingTahsin.metode,
            buku: editingTahsin.buku ?? undefined,
            halaman: editingTahsin.halaman ?? undefined,
            catatan: editingTahsin.catatan ?? undefined,
            makhroj: editingTahsin.makhroj ?? undefined,
            kelancaran: editingTahsin.kelancaran ?? undefined,
            adab: editingTahsin.adab ?? undefined,
            created_at: editingTahsin.created_at,
          } : null}
          loading={tahsinSubmitting}
          onSubmit={handleEditTahsinSubmit}
          onCancel={() => { if (!tahsinSubmitting) { setEditTahsinOpen(false); setEditingTahsin(null); } }}
        />
      </Modal>
    </div>
  );
}
