'use client';

// src/components/features/santri/BulkUpdateJuzModal.tsx
// Modal untuk Kabid update juz_terakhir banyak siswa sekaligus.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle, Circle, Search, Loader2, AlertCircle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

interface Student {
  id: string;
  nama: string;
  nisn?: string | null;
  juz_terakhir?: string | null;
  classes?: { id: string; name: string } | null;
}

interface BulkUpdateJuzModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function BulkUpdateJuzModal({ open, onClose, onSuccess }: BulkUpdateJuzModalProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [juzValue, setJuzValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch all students when modal opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setSelectedIds(new Set());
    setJuzValue('');
    setSearchQuery('');
    setSubmitError(null);
    setSubmitSuccess(null);

    fetch('/api/siswa/list')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Gagal memuat data'))))
      .then((json) => setStudents(Array.isArray(json.data) ? json.data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [open]);

  // Focus juz input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const filteredStudents = searchQuery.trim().length >= 2
    ? students.filter((s) => s.nama.toLowerCase().includes(searchQuery.toLowerCase()))
    : students;

  const allVisibleSelected = filteredStudents.length > 0 && filteredStudents.every((s) => selectedIds.has(s.id));

  const toggleSelectAll = useCallback(() => {
    if (allVisibleSelected) {
      // Deselect all visible
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredStudents.forEach((s) => next.delete(s.id));
        return next;
      });
    } else {
      // Select all visible
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredStudents.forEach((s) => next.add(s.id));
        return next;
      });
    }
  }, [allVisibleSelected, filteredStudents]);

  const toggleStudent = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSubmit = async () => {
    if (selectedIds.size === 0) {
      setSubmitError('Pilih minimal satu siswa.');
      return;
    }
    if (!juzValue.trim()) {
      setSubmitError('Isi nilai juz terakhir.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const res = await fetch('/api/siswa/update-juz-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_ids: Array.from(selectedIds),
          juz_terakhir: juzValue.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.message ?? 'Gagal memperbarui juz.');
        return;
      }
      setSubmitSuccess(json.message ?? 'Juz berhasil diperbarui.');
      setSelectedIds(new Set());
      setJuzValue('');
      onSuccess(json.message ?? 'Juz berhasil diperbarui.');
      setTimeout(() => onClose(), 1500);
    } catch {
      setSubmitError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => { if (!submitting) onClose(); }}
      title="Update Juz Massal"
      size="lg"
      closeOnBackdrop={!submitting}
    >
      <div className="space-y-4">
        {/* Juz input */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Juz Terakhir
          </label>
          <input
            ref={inputRef}
            type="text"
            value={juzValue}
            onChange={(e) => setJuzValue(e.target.value)}
            placeholder="Contoh: 1, 2, 3, ..."
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition"
          />
        </div>

        {/* Student list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">
              Pilih Siswa ({selectedIds.size} dipilih)
            </span>
            {students.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs text-amber-600 hover:text-amber-700 font-medium"
              >
                {allVisibleSelected ? 'Batal Pilih Semua' : 'Pilih Semua'}
              </button>
            )}
          </div>

          {/* Search */}
          {students.length > 5 && (
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama siswa..."
                className="w-full rounded-xl border border-slate-300 pl-8 pr-3 py-2 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition"
              />
            </div>
          )}

          {/* Student list */}
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Memuat daftar siswa...</span>
            </div>
          ) : error ? (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600 flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-500 text-center">
              {searchQuery.trim().length >= 2 ? 'Tidak ditemukan siswa.' : 'Belum ada data siswa.'}
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
              {filteredStudents.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => toggleStudent(student.id)}
                  className={[
                    'w-full text-left px-4 py-3 flex items-center gap-3 transition text-sm',
                    selectedIds.has(student.id)
                      ? 'bg-amber-50'
                      : 'hover:bg-slate-50',
                  ].join(' ')}
                >
                  {selectedIds.has(student.id) ? (
                    <CheckCircle size={16} className="text-amber-500 shrink-0" />
                  ) : (
                    <Circle size={16} className="text-slate-300 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-slate-800 block truncate">{student.nama}</span>
                    <span className="text-xs text-slate-400">
                      {student.nisn || '-'}
                      {student.juz_terakhir ? ` · Juz ${student.juz_terakhir}` : ''}
                      {student.classes?.name ? ` · ${student.classes.name}` : ''}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Feedback */}
        {submitError && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            {submitError}
          </div>
        )}
        {submitSuccess && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
            <CheckCircle size={16} className="shrink-0" />
            {submitSuccess}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button
            variant="primary"
            loading={submitting}
            onClick={handleSubmit}
            disabled={selectedIds.size === 0 || !juzValue.trim()}
          >
            Simpan Juz ({selectedIds.size} siswa)
          </Button>
        </div>
      </div>
    </Modal>
  );
}
