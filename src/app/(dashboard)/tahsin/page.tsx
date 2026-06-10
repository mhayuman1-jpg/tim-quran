'use client';

// src/app/(dashboard)/tahsin/page.tsx
// Halaman jurnal hafalan & tahsin gabungan dengan ringkasan riwayat.

import React, { useState, useCallback, useMemo } from 'react';
import { Plus, BookOpenCheck, Users, XCircle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import SearchInput from '@/components/shared/SearchInput';
import { toImageUrl } from '@/lib/storage/urls';
import JurnalHafalanTahsinForm from '@/components/features/tahsin/JurnalHafalanTahsinForm';
import TahsinHistory from '@/components/features/tahsin/TahsinHistory';
import HafalanHistory from '@/components/features/hafalan/HafalanHistory';
import HafalanForm, { type HafalanFormData } from '@/components/features/hafalan/HafalanForm';
import TahsinForm, { type TahsinFormData } from '@/components/features/tahsin/TahsinForm';
import { useViewMode } from '@/hooks/useViewMode';
import type { Hafalan, Tahsin } from '@/types';

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
  const viewHeaders = useMemo(() => {
    const h: Record<string, string> = {};
    if (viewAsRole === 'Tim_Quran') {
      h['x-view-mode'] = 'teaching';
      if (viewAsTeacherId) h['x-view-as-teacher-id'] = viewAsTeacherId;
    }
    return h;
  }, [viewAsRole, viewAsTeacherId]);
  const [modalOpen, setModalOpen] = useState(false);
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

  // Edit tahsin state
  const [editTahsinOpen, setEditTahsinOpen] = useState(false);
  const [editingTahsin, setEditingTahsin] = useState<any>(null);
  const [tahsinSubmitting, setTahsinSubmitting] = useState(false);
  const [tahsinError, setTahsinError] = useState<string | null>(null);

  const handleOpenAdd = () => {
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
          makhroj: (formData as any).makhroj || null,
          tajwid: (formData as any).tajwid || null,
          lancar: (formData as any).lancar || null,
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

  const fetchStudents = useCallback(async (query = '') => {
    setStudentError(null);
    setStudentLoading(true);

    try {
      const url = query.trim().length >= 2
        ? `/api/siswa/list?search=${encodeURIComponent(query.trim())}`
        : '/api/siswa/list';
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
  };

  React.useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const displayedStudents = searchQuery.trim().length >= 2 ? studentOptions : studentList;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BookOpenCheck size={24} className="text-amber-600" />
            Jurnal Hafalan & Tahsin
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Pilih satu siswa untuk melihat detail hafalan dan tahsin secara terfokus.
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={handleOpenAdd}>
          Tambah Jurnal
        </Button>
      </div>

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
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Cari Nama Siswa</h2>
              <p className="text-slate-500 text-sm">Cari nama siswa untuk melihat riwayat detail.</p>
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
              Cari siswa dengan mengetik nama, atau pilih langsung dari daftar di bawah.
              Klik nama siswa untuk membuka detail popup.
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
                Belum ada siswa yang tersedia.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {selectedStudent ? (
            <>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h2 className="text-base font-semibold text-slate-800 mb-4">Riwayat Hafalan</h2>
                <HafalanHistory
                  studentId={selectedStudent.id}
                  refreshKey={refreshKey}
                  onSelectStudent={setSelectedStudent}
                  onEdit={handleOpenEditHafalan}
                />
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h2 className="text-base font-semibold text-slate-800 mb-4">Riwayat Tahsin</h2>
                <TahsinHistory
                  studentId={selectedStudent.id}
                  refreshKey={refreshKey}
                  onSelectStudent={setSelectedStudent}
                  onEdit={handleOpenEditTahsin}
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
                <p className="text-sm text-slate-500">NISN: {selectedStudent.nisn ?? '-'}</p>
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
        title="Tambah Jurnal Hafalan & Tahsin"
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
