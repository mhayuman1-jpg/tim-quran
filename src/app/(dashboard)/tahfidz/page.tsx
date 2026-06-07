'use client';

// src/app/(dashboard)/tahfidz/page.tsx
// Halaman pencatatan tahfidz harian
// - Form input tahfidz (modal): siswa, tanggal, surah/juz, halaman, penilaian, catatan
// - Riwayat tahfidz dengan filter tanggal

import React, { useState } from 'react';
import { Plus, BookOpenCheck } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import TahfidzForm, { type TahfidzFormData } from '@/components/features/tahfidz/TahfidzForm';
import TahfidzHistory from '@/components/features/tahfidz/TahfidzHistory';
import type { Tahfidz } from '@/types';

export default function TahfidzPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTahfidz, setEditingTahfidz] = useState<Tahfidz | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleOpenAdd = () => {
    setEditingTahfidz(null);
    setSubmitError(null);
    setSubmitSuccess(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (tahfidz: Tahfidz) => {
    setEditingTahfidz(tahfidz);
    setSubmitError(null);
    setSubmitSuccess(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setModalOpen(false);
    setEditingTahfidz(null);
    setSubmitError(null);
  };

  const handleSubmit = async (formData: TahfidzFormData) => {
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      if (editingTahfidz) {
        const res = await fetch('/api/tahfidz/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingTahfidz.id,
            tanggal: formData.tanggal,
            surah_juz: formData.surah_juz,
            halaman: formData.halaman,
            makhroj: formData.makhroj,
            tajwid: formData.tajwid,
            lancar: formData.lancar,
            catatan: formData.catatan || null,
          }),
        });
        const json = await res.json();

        if (!res.ok) {
          setSubmitError(json.message ?? 'Gagal memperbarui tahfidz.');
          return;
        }

        setSubmitSuccess(json.message ?? 'Tahfidz berhasil diperbarui.');
      } else {
        const res = await fetch('/api/tahfidz/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: formData.student_id,
            tanggal: formData.tanggal,
            surah_juz: formData.surah_juz,
            halaman: formData.halaman,
            makhroj: formData.makhroj,
            tajwid: formData.tajwid,
            lancar: formData.lancar,
            catatan: formData.catatan || null,
          }),
        });
        const json = await res.json();

        if (!res.ok) {
          setSubmitError(json.message ?? 'Gagal menyimpan tahfidz.');
          return;
        }

        setSubmitSuccess(json.message ?? 'Tahfidz berhasil disimpan.');
      }

      setRefreshKey((prev) => prev + 1);
      setModalOpen(false);
      setEditingTahfidz(null);
    } catch {
      setSubmitError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BookOpenCheck size={24} className="text-emerald-600" />
            Jurnal Tahfidz
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Pencatatan progres hafalan santri dengan penilaian makhroj, tajwid, dan kelancaran.
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={handleOpenAdd}>
          Tambah Tahfidz
        </Button>
      </div>

      {submitSuccess && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex justify-between items-center">
          <span>{submitSuccess}</span>
          <button
            onClick={() => setSubmitSuccess(null)}
            className="ml-4 text-emerald-500 hover:text-emerald-700 font-medium"
          >
            ✕
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Riwayat Tahfidz</h2>
        <TahfidzHistory onEdit={handleOpenEdit} refreshKey={refreshKey} />
      </div>

      <Modal open={modalOpen} onClose={handleCloseModal} title={editingTahfidz ? 'Edit Catatan Tahfidz' : 'Tambah Catatan Tahfidz'} size="md" closeOnBackdrop={!submitting}>
        {submitError && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {submitError}
          </div>
        )}
        <TahfidzForm initialData={editingTahfidz} loading={submitting} onSubmit={handleSubmit} onCancel={handleCloseModal} />
      </Modal>
    </div>
  );
}
