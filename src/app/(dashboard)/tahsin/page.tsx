'use client';

// src/app/(dashboard)/tahsin/page.tsx
// Halaman pencatatan tahsin harian
// - Form input tahsin (modal): siswa, metode, buku, halaman, catatan
// - Riwayat tahsin dengan filter tanggal

import React, { useState } from 'react';
import { Plus, BookOpenCheck } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import TahsinForm, { type TahsinFormData } from '@/components/features/tahsin/TahsinForm';
import TahsinHistory from '@/components/features/tahsin/TahsinHistory';
import type { Tahsin } from '@/types';

export default function TahsinPage() {
  // State modal tambah/edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTahsin, setEditingTahsin] = useState<Tahsin | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Trigger refresh history setelah add/edit
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Buka modal tambah
  const handleOpenAdd = () => {
    setEditingTahsin(null);
    setSubmitError(null);
    setSubmitSuccess(null);
    setModalOpen(true);
  };

  // ── Buka modal edit dari TahsinHistory
  const handleOpenEdit = (tahsin: any) => {
    const mapped: Tahsin = {
      id: tahsin.id,
      student_id: tahsin.student_id,
      teacher_id: tahsin.teacher_id,
      tanggal: tahsin.tanggal,
      metode: tahsin.metode,
      buku: tahsin.buku ?? undefined,
      halaman: tahsin.halaman ?? undefined,
      catatan: tahsin.catatan ?? undefined,
      created_at: tahsin.created_at,
    };
    setEditingTahsin(mapped);
    setSubmitError(null);
    setSubmitSuccess(null);
    setModalOpen(true);
  };

  // ── Tutup modal
  const handleCloseModal = () => {
    if (submitting) return;
    setModalOpen(false);
    setEditingTahsin(null);
    setSubmitError(null);
  };

  // ── Submit form (add atau edit)
  const handleSubmit = async (formData: TahsinFormData) => {
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      if (editingTahsin) {
        // Mode edit — panggil API update
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
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          setSubmitError(json.message ?? 'Gagal memperbarui tahsin.');
          return;
        }

        setSubmitSuccess(json.message ?? 'Tahsin berhasil diperbarui.');
        setRefreshKey((k) => k + 1);
        setModalOpen(false);
        setEditingTahsin(null);
      } else {
        // Mode tambah — panggil API add
        const res = await fetch('/api/tahsin/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: formData.student_id,
            tanggal: formData.tanggal,
            metode: formData.metode,
            buku: formData.buku,
            halaman: formData.halaman,
            catatan: formData.catatan || null,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          setSubmitError(json.message ?? 'Gagal menyimpan tahsin.');
          return;
        }

        setSubmitSuccess(json.message ?? 'Tahsin berhasil disimpan.');
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
            <BookOpenCheck size={24} className="text-emerald-600" />
            Jurnal Tahsin
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Pencatatan progres perbaikan bacaan (Wafa / IWR / Al-Quran) santri.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={16} />}
          onClick={handleOpenAdd}
        >
          Tambah Tahsin
        </Button>
      </div>

      {/* Notifikasi sukses */}
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

      {/* Riwayat tahsin */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">
          Riwayat Tahsin
        </h2>
        <TahsinHistory
          onEdit={handleOpenEdit}
          refreshKey={refreshKey}
        />
      </div>

      {/* Modal tambah/edit tahsin */}
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        title={editingTahsin ? 'Edit Catatan Tahsin' : 'Tambah Catatan Tahsin'}
        size="md"
        closeOnBackdrop={!submitting}
      >
        {/* Error di dalam modal */}
        {submitError && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {submitError}
          </div>
        )}

        <TahsinForm
          initialData={editingTahsin}
          loading={submitting}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
}
