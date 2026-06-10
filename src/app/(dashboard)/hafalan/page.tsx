'use client';

// src/app/(dashboard)/hafalan/page.tsx
// Halaman pencatatan hafalan harian
// - Form input setoran hafalan (modal)
// - Riwayat hafalan dengan filter tanggal
// - Daftar siswa sesuai role (Tim_Quran hanya lihat siswa tanggung jawabnya)

import React, { useState } from 'react';
import { Plus, BookOpen, Download } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import HafalanForm, { type HafalanFormData } from '@/components/features/hafalan/HafalanForm';
import HafalanHistory from '@/components/features/hafalan/HafalanHistory';
import type { Hafalan } from '@/types';

export default function HafalanPage() {
  // State modal tambah/edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHafalan, setEditingHafalan] = useState<Hafalan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Trigger refresh history setelah add/edit
  const [refreshKey, setRefreshKey] = useState(0);

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
            Pencatatan progres hafalan harian santri.
          </p>
        </div>
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

      {/* Riwayat hafalan */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">
          Riwayat Hafalan
        </h2>
        <HafalanHistory
          onEdit={handleOpenEdit}
          refreshKey={refreshKey}
        />
      </div>

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
