'use client';

// src/app/(dashboard)/hafalan/page.tsx
// Halaman pencatatan hafalan harian
// - Form input setoran hafalan (modal)
// - Riwayat hafalan dengan filter tanggal
// - Daftar siswa sesuai role (Tim_Quran hanya lihat siswa tanggung jawabnya)
// - Tim_Quran: class-first view (pilih kelas dulu)

import React, { useEffect, useState } from 'react';
import { Plus, BookOpen, Download, ArrowLeft } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import HafalanForm, { type HafalanFormData } from '@/components/features/hafalan/HafalanForm';
import HafalanHistory from '@/components/features/hafalan/HafalanHistory';
import type { Hafalan } from '@/types';

interface ClassOption {
  id: string;
  name: string;
  jumlah_siswa: number;
}

export default function HafalanPage() {
  const { data: session } = useSession();
  const isTeacherMode = session?.user?.role === 'Tim_Quran';

  // Class-first view state
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedClassName, setSelectedClassName] = useState<string | null>(null);

  // State modal tambah/edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHafalan, setEditingHafalan] = useState<Hafalan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Trigger refresh history setelah add/edit
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch classes for Tim_Quran
  useEffect(() => {
    if (!isTeacherMode) return;
    let cancelled = false;
    (async () => {
      setClassesLoading(true);
      try {
        const res = await fetch('/api/kelas/list');
        const json = await res.json();
        if (!cancelled && res.ok) {
          setClasses(json.data ?? []);
        }
      } catch { /* silent */ }
      if (!cancelled) setClassesLoading(false);
    })();
    return () => { cancelled = true; };
  }, [isTeacherMode]);

  const handleSelectClass = (classId: string, className: string) => {
    setSelectedClassId(classId);
    setSelectedClassName(className);
  };

  const handleBackToClasses = () => {
    setSelectedClassId(null);
    setSelectedClassName(null);
  };

  // ── Buka modal tambah
  const handleOpenAdd = () => {
    setEditingHafalan(null);
    setSubmitError(null);
    setSubmitSuccess(null);
    setModalOpen(true);
  };

  // ── Buka modal edit dari HafalanHistory
  const handleOpenEdit = (hafalan: any) => {
    // Adaptasi data dari API response ke tipe Hafalan
    const mapped: Hafalan = {
      id: hafalan.id,
      student_id: hafalan.student_id,
      teacher_id: hafalan.teacher_id,
      tanggal: hafalan.tanggal,
      surah_juz: hafalan.surah_juz,
      halaman: hafalan.halaman,
      catatan: hafalan.catatan ?? undefined,
      created_at: hafalan.created_at,
    };
    setEditingHafalan(mapped);
    setSubmitError(null);
    setSubmitSuccess(null);
    setModalOpen(true);
  };

  // ── Tutup modal
  const handleCloseModal = () => {
    if (submitting) return;
    setModalOpen(false);
    setEditingHafalan(null);
    setSubmitError(null);
  };

  // ── Hapus catatan hafalan
  const handleDelete = async (hafalan: any) => {
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

  // ── Submit form (add atau edit)
  const handleSubmit = async (formData: HafalanFormData) => {
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      if (editingHafalan) {
        // Mode edit — panggil API update
        const res = await fetch('/api/hafalan/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingHafalan.id,
            tanggal: formData.tanggal,
            surah_juz: formData.surah_juz,
            halaman: formData.ayat,
            catatan: formData.catatan || null,
            update_juz_terakhir: formData.update_juz_terakhir,
            juz_baru: formData.update_juz_terakhir ? formData.juz_baru : undefined,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          setSubmitError(json.message ?? 'Gagal memperbarui hafalan.');
          return;
        }

        setSubmitSuccess(json.message ?? 'Hafalan berhasil diperbarui.');
        setRefreshKey((k) => k + 1);
        setModalOpen(false);
        setEditingHafalan(null);
      } else {
        // Mode tambah — panggil API add
        const res = await fetch('/api/hafalan/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: formData.student_id,
            tanggal: formData.tanggal,
            surah_juz: formData.surah_juz,
            halaman: formData.ayat,
            catatan: formData.catatan || null,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          setSubmitError(json.message ?? 'Gagal menyimpan hafalan.');
          return;
        }

        // Jika diminta update juz_terakhir, panggil update endpoint
        if (formData.update_juz_terakhir && json.data?.id) {
          await fetch('/api/hafalan/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: json.data.id,
              update_juz_terakhir: true,
              juz_baru: formData.juz_baru,
            }),
          });
        }

        setSubmitSuccess(json.message ?? 'Hafalan berhasil disimpan.');
        setRefreshKey((k) => k + 1);
        setModalOpen(false);
      }
    } catch {
      setSubmitError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header halaman */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BookOpen size={24} className="text-amber-600" />
            Setoran Hafalan
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isTeacherMode && !selectedClassId
              ? 'Pilih kelas untuk melihat riwayat hafalan.'
              : selectedClassName
                ? `Riwayat hafalan — ${selectedClassName}`
                : 'Pencatatan progres hafalan harian santri.'
            }
          </p>
        </div>
        {(!isTeacherMode || selectedClassId) && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              leftIcon={<Download size={16} />}
              onClick={() => {
                const a = document.createElement('a');
                a.href = '/api/hafalan/export';
                a.download = 'hafalan.xlsx';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
            >
              Export Excel
            </Button>
            <Button
              variant="primary"
              leftIcon={<Plus size={16} />}
              onClick={handleOpenAdd}
            >
              Tambah Setoran
            </Button>
          </div>
        )}
      </div>

      {/* Notifikasi sukses */}
      {submitSuccess && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 flex justify-between items-center">
          <span>{submitSuccess}</span>
          <button
            onClick={() => setSubmitSuccess(null)}
            className="ml-4 text-amber-500 hover:text-amber-700 font-medium"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Class-first view for Tim_Quran ── */}
      {isTeacherMode && !selectedClassId && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Pilih Kelas</h2>
            <p className="text-slate-500 text-sm">Pilih kelas untuk melihat riwayat hafalan siswa.</p>
          </div>
          {classesLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : classes.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
              <BookOpen size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Belum ada kelas yang ditugaskan.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {classes.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleSelectClass(c.id, c.name)}
                  className="text-left rounded-xl border border-slate-200 p-4 hover:border-amber-400 hover:bg-amber-50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shrink-0">
                      <BookOpen size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                      <p className="text-[11px] text-slate-400">{c.jumlah_siswa ?? 0} siswa</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Riwayat hafalan */}
      {(!isTeacherMode || selectedClassId) && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">
              Riwayat Hafalan{selectedClassName ? ` — ${selectedClassName}` : ''}
            </h2>
            {isTeacherMode && selectedClassId && (
              <button onClick={handleBackToClasses} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium">
                <ArrowLeft size={12} /> Semua Kelas
              </button>
            )}
          </div>
          <HafalanHistory
            classId={selectedClassId ?? undefined}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
            refreshKey={refreshKey}
          />
        </div>
      )}

      {/* Modal tambah/edit hafalan */}
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        title={editingHafalan ? 'Edit Catatan Hafalan' : 'Tambah Setoran Hafalan'}
        size="md"
        closeOnBackdrop={!submitting}
      >
        {/* Error di dalam modal */}
        {submitError && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {submitError}
          </div>
        )}

        <HafalanForm
          initialData={editingHafalan}
          loading={submitting}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
}
