'use client';

// src/app/(dashboard)/kelas/page.tsx
// Halaman Kelola Kelas (Kabid Only)
// - Tabel kelas dengan jumlah siswa aktif, guru 1, guru 2
// - Form tambah kelas
// - Edit inline nama kelas
// - Hapus dengan konfirmasi yang menampilkan jumlah siswa terdampak
// - Assign guru per kelas (manual & auto)

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, UserCheck, Wand2, Users } from 'lucide-react';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { useToast } from '@/lib/toast';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Teacher {
  id: string;
  name: string;
  email: string;
}

interface Kelas {
  id: string;
  name: string;
  jumlah_siswa: number;
  created_at: string;
  teacher1_id?: string | null;
  teacher2_id?: string | null;
  teacher1?: Teacher | null;
  teacher2?: Teacher | null;
}

interface Student {
  id: string;
  nama: string;
  nisn: string;
  class_id?: string | null;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function KelasPage() {
  const { toast } = useToast();

  // ── Data state
  const [data, setData] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Tim list for dropdowns
  const [timList, setTimList] = useState<Teacher[]>([]);

  // ── Add form modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newKelasName, setNewKelasName] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // ── Edit inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // ── Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Kelas | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Assign teacher modal
  const [assignTarget, setAssignTarget] = useState<Kelas | null>(null);
  const [assignT1, setAssignT1] = useState('');
  const [assignT2, setAssignT2] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  // ── Auto assign
  const [autoLoading, setAutoLoading] = useState(false);

  // ── Assign student modal
  const [assignStudentTarget, setAssignStudentTarget] = useState<Kelas | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [studentLoading, setStudentLoading] = useState(false);
  const [assignStudentLoading, setAssignStudentLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  // ── Split students loading state (class id)
  const [splitLoadingId, setSplitLoadingId] = useState<string | null>(null);

  // ── Fetch kelas
  const fetchKelas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/kelas/list', { credentials: 'same-origin' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.message ?? (res.status === 403 ? 'Akses kelas hanya untuk Kabid.' : 'Gagal memuat data kelas.'));
        setData([]);
      } else {
        setData(json.data ?? []);
      }
    } catch {
      toast.error('Terjadi kesalahan saat memuat data kelas.');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // ── Fetch tim list
  const fetchTim = useCallback(async () => {
    try {
      const res = await fetch('/api/tim/list');
      const json = await res.json();
      if (res.ok) {
        // Filter only Aktif
        setTimList((json.data ?? []).filter((t: any) => t.status === 'Aktif'));
      }
    } catch {
      // silent fail — not critical
    }
  }, []);

  useEffect(() => {
    fetchKelas();
    fetchTim();
  }, [fetchKelas, fetchTim]);

  // ── Add kelas
  const handleOpenAdd = () => {
    setNewKelasName('');
    setAddError('');
    setAddModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = newKelasName.trim();
    if (!trimmed) {
      setAddError('Nama kelas wajib diisi');
      return;
    }

    setAddLoading(true);
    setAddError('');
    try {
      const res = await fetch('/api/kelas/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const json = await res.json();

      if (!res.ok) {
        setAddError(json.message ?? 'Gagal menambah kelas.');
        return;
      }

      toast.success(json.message ?? 'Kelas berhasil ditambahkan.');
      setAddModalOpen(false);
      setNewKelasName('');
      fetchKelas();
    } catch {
      setAddError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setAddLoading(false);
    }
  };

  // ── Edit inline
  const handleStartEdit = (kelas: Kelas) => {
    setEditingId(kelas.id);
    setEditValue(kelas.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleSaveEdit = async (id: string) => {
    const trimmed = editValue.trim();
    if (!trimmed) {
      toast.error('Nama kelas tidak boleh kosong.');
      return;
    }

    setEditLoading(true);
    try {
      const res = await fetch('/api/kelas/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: trimmed }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.message ?? 'Gagal memperbarui kelas.');
        return;
      }

      toast.success(json.message ?? 'Kelas berhasil diperbarui.');
      setEditingId(null);
      setEditValue('');
      fetchKelas();
    } catch {
      toast.error('Terjadi kesalahan saat memperbarui kelas.');
    } finally {
      setEditLoading(false);
    }
  };

  // ── Delete kelas
  const handleOpenDelete = (kelas: Kelas) => {
    setDeleteTarget(kelas);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/kelas/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.message ?? 'Gagal menghapus kelas.');
        return;
      }

      toast.success(
        `Kelas berhasil dihapus. ${json.jumlah_siswa_terdampak ?? 0} siswa terdampak.`
      );
      setDeleteTarget(null);
      fetchKelas();
    } catch {
      toast.error('Terjadi kesalahan saat menghapus kelas.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Assign teacher modal
  const handleOpenAssign = (kelas: Kelas) => {
    setAssignTarget(kelas);
    setAssignT1(kelas.teacher1_id ?? '');
    setAssignT2(kelas.teacher2_id ?? '');
  };

  const handleSaveAssign = async () => {
    if (!assignTarget) return;
    setAssignLoading(true);
    try {
      const res = await fetch('/api/kelas/assign-teachers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: assignTarget.id,
          teacher1_id: assignT1 || null,
          teacher2_id: assignT2 || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message ?? 'Gagal menetapkan guru.');
        return;
      }
      toast.success(json.message ?? 'Guru berhasil ditetapkan.');
      setAssignTarget(null);
      fetchKelas();
    } catch {
      toast.error('Terjadi kesalahan saat menetapkan guru.');
    } finally {
      setAssignLoading(false);
    }
  };

  // ── Auto assign
  const handleAutoAssign = async () => {
    setAutoLoading(true);
    try {
      const res = await fetch('/api/kelas/auto-assign', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message ?? 'Gagal auto assign guru.');
        return;
      }
      toast.success(json.message ?? 'Auto assign selesai.');
      fetchKelas();
    } catch {
      toast.error('Terjadi kesalahan saat auto assign.');
    } finally {
      setAutoLoading(false);
    }
  };

  // ── Assign students
  const handleOpenAssignStudent = async (kelas: Kelas) => {
    setAssignStudentTarget(kelas);
    setSelectedStudents(new Set());
    setStudentSearch('');
    setStudentLoading(true);

    try {
      const res = await fetch('/api/siswa/list');
      const json = await res.json();
      if (res.ok) {
        setStudents(json.data ?? []);
      } else {
        toast.error('Gagal memuat daftar siswa.');
        setAssignStudentTarget(null);
      }
    } catch {
      toast.error('Gagal memuat daftar siswa.');
      setAssignStudentTarget(null);
    } finally {
      setStudentLoading(false);
    }
  };

  // ── Split students between teacher1 and teacher2 for a class
  const handleSplitStudents = async (kelas: Kelas) => {
    if (!kelas) return;
    if (!kelas.teacher1_id || !kelas.teacher2_id) {
      toast.error('Pastikan Guru 1 dan Guru 2 sudah ditetapkan untuk kelas ini.');
      return;
    }

    const ok = window.confirm(`Bagikan siswa di kelas "${kelas.name}" secara merata ke Guru 1 dan Guru 2?`);
    if (!ok) return;

    setSplitLoadingId(kelas.id);
    try {
      const res = await fetch('/api/kelas/split-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: kelas.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message ?? 'Gagal membagi siswa.');
        return;
      }
      const counts = json.counts ?? {};
      toast.success(json.message ?? `Dibagi: ${counts.teacher1 ?? 0} / ${counts.teacher2 ?? 0}`);
      fetchKelas();
    } catch (err) {
      toast.error('Terjadi kesalahan saat membagi siswa.');
    } finally {
      setSplitLoadingId(null);
    }
  };

  const filteredStudents = students.filter((s) =>
    s.nama.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.nisn.includes(studentSearch)
  );

  const handleToggleStudent = (id: string) => {
    const updated = new Set(selectedStudents);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedStudents(updated);
  };

  const handleSaveAssignStudents = async () => {
    if (!assignStudentTarget || selectedStudents.size === 0) {
      toast.error('Pilih minimal satu siswa untuk diassign.');
      return;
    }

    setAssignStudentLoading(true);
    try {
      const promises = Array.from(selectedStudents).map((studentId) =>
        fetch('/api/siswa/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: studentId, class_id: assignStudentTarget.id }),
        }).then((r) => r.json())
      );

      const results = await Promise.all(promises);
      const errors = results.filter((r) => r.error || !r.message?.includes('berhasil'));

      if (errors.length > 0) {
        toast.error(`${errors.length} siswa gagal diassign.`);
      } else {
        if (assignStudentTarget.teacher1_id || assignStudentTarget.teacher2_id) {
          const splitRes = await fetch('/api/kelas/split-students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ class_id: assignStudentTarget.id }),
          });
          const splitJson = await splitRes.json();
          if (splitRes.ok) {
            toast.success(`${selectedStudents.size} siswa berhasil diassign & dibagi ke guru.`);
          } else {
            toast.success(`${selectedStudents.size} siswa berhasil diassign ke kelas.`);
          }
        } else {
          toast.success(`${selectedStudents.size} siswa berhasil diassign ke kelas.`);
        }
        setAssignStudentTarget(null);
        setSelectedStudents(new Set());
        fetchKelas();
      }
    } catch (err) {
      toast.error('Terjadi kesalahan saat assign siswa.');
    } finally {
      setAssignStudentLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Kelola Kelas</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola daftar kelas dan penetapan guru pengajar.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            leftIcon={<Wand2 size={15} />}
            onClick={handleAutoAssign}
            loading={autoLoading}
            title="Distribusi guru ke semua kelas secara otomatis"
          >
            Auto Assign
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus size={15} />}
            onClick={handleOpenAdd}
          >
            Tambah Kelas
          </Button>
        </div>
      </div>

      {/* ── Kelas table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Nama Kelas
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Jumlah Siswa
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Guru 1
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Guru 2
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                // Loading skeleton
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <div className="h-5 bg-slate-200 rounded animate-pulse w-32"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 bg-slate-200 rounded animate-pulse w-16"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 bg-slate-200 rounded animate-pulse w-24"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 bg-slate-200 rounded animate-pulse w-24"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-8 bg-slate-200 rounded animate-pulse w-32 ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : data.length === 0 ? (
                // Empty state
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                    Belum ada kelas yang terdaftar.
                  </td>
                </tr>
              ) : (
                // Data rows
                data.map((kelas) => (
                  <tr key={kelas.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      {editingId === kelas.id ? (
                        // Edit mode
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            disabled={editLoading}
                            className="py-1.5"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(kelas.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleSaveEdit(kelas.id)}
                            loading={editLoading}
                            title="Simpan"
                          >
                            <Check size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelEdit}
                            disabled={editLoading}
                            title="Batal"
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      ) : (
                        // Display mode
                        <span className="text-sm font-medium text-slate-800">{kelas.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        {kelas.jumlah_siswa} siswa
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {kelas.teacher1 ? (
                        <span className="text-sm text-slate-700">{kelas.teacher1.name}</span>
                      ) : (
                        <span className="text-sm text-slate-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {kelas.teacher2 ? (
                        <span className="text-sm text-slate-700">{kelas.teacher2.name}</span>
                      ) : (
                        <span className="text-sm text-slate-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId !== kelas.id && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Users size={14} />}
                            onClick={() => handleOpenAssignStudent(kelas)}
                            title="Assign siswa ke kelas"
                          >
                            Siswa
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<UserCheck size={14} />}
                            onClick={() => handleOpenAssign(kelas)}
                            title="Atur guru"
                          >
                            Atur Guru
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Users size={14} />}
                            onClick={() => handleSplitStudents(kelas)}
                            loading={splitLoadingId === kelas.id}
                            title="Bagi siswa ke Guru 1 & Guru 2"
                          >
                            Split Siswa
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Pencil size={14} />}
                            onClick={() => handleStartEdit(kelas)}
                            title="Edit kelas"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Trash2 size={14} />}
                            onClick={() => handleOpenDelete(kelas)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Hapus kelas"
                          >
                            Hapus
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Total count */}
      {!loading && data.length > 0 && (
        <p className="text-xs text-slate-400 text-right">
          Total {data.length} kelas terdaftar
        </p>
      )}

      {/* ── Add modal */}
      <Modal
        open={addModalOpen}
        onClose={() => { if (!addLoading) setAddModalOpen(false); }}
        title="Tambah Kelas Baru"
        size="sm"
        closeOnBackdrop={!addLoading}
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <Input
            label="Nama Kelas"
            type="text"
            value={newKelasName}
            onChange={(e) => {
              setNewKelasName(e.target.value);
              setAddError('');
            }}
            placeholder="Contoh: Kelas 1A"
            error={addError}
            disabled={addLoading}
            required
            autoFocus
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAddModalOpen(false)}
              disabled={addLoading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={addLoading}
            >
              Simpan
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Assign teacher modal */}
      <Modal
        open={Boolean(assignTarget)}
        onClose={() => { if (!assignLoading) setAssignTarget(null); }}
        title={`Atur Guru — ${assignTarget?.name ?? ''}`}
        size="sm"
        closeOnBackdrop={!assignLoading}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Guru 1</label>
            <select
              value={assignT1}
              onChange={(e) => {
                setAssignT1(e.target.value);
                // Reset T2 jika sama
                if (e.target.value && e.target.value === assignT2) setAssignT2('');
              }}
              disabled={assignLoading}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            >
              <option value="">— Tidak ada —</option>
              {timList.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Guru 2</label>
            <select
              value={assignT2}
              onChange={(e) => setAssignT2(e.target.value)}
              disabled={assignLoading}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            >
              <option value="">— Tidak ada —</option>
              {timList
                .filter((t) => !assignT1 || t.id !== assignT1)
                .map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAssignTarget(null)}
              disabled={assignLoading}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={assignLoading}
              onClick={handleSaveAssign}
            >
              Simpan
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => { if (!deleteLoading) setDeleteTarget(null); }}
        onConfirm={handleConfirmDelete}
        title="Hapus Kelas"
        message={
          deleteTarget
            ? `Apakah Anda yakin ingin menghapus kelas "${deleteTarget.name}"?\n\n` +
              `${deleteTarget.jumlah_siswa} siswa akan terdampak (class_id akan di-set NULL).\n\n` +
              `Tindakan ini tidak dapat dibatalkan.`
            : ''
        }
        confirmLabel="Hapus"
        loading={deleteLoading}
      />

      {/* ── Assign students modal */}
      <Modal
        open={Boolean(assignStudentTarget)}
        onClose={() => { if (!assignStudentLoading) setAssignStudentTarget(null); }}
        title={`Assign Siswa — ${assignStudentTarget?.name ?? ''}`}
        size="md"
        closeOnBackdrop={!assignStudentLoading}
      >
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {/* Search input */}
          <div className="sticky top-0 bg-white pb-2">
            <Input
              placeholder="Cari nama siswa atau NISN..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              disabled={studentLoading}
            />
          </div>

          {/* Student list */}
          {studentLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              Memuat daftar siswa...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              {studentSearch ? 'Tidak ada siswa yang cocok.' : 'Tidak ada siswa.'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map((student) => (
                <label key={student.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStudents.has(student.id)}
                    onChange={() => handleToggleStudent(student.id)}
                    disabled={assignStudentLoading}
                    className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{student.nama}</p>
                    <p className="text-xs text-slate-400">{student.nisn}</p>
                  </div>
                  {student.class_id && (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded shrink-0">
                      Sudah di kelas
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}

          {/* Selected count */}
          {filteredStudents.length > 0 && (
            <div className="sticky bottom-0 bg-white pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                {selectedStudents.size} dari {filteredStudents.length} siswa dipilih
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAssignStudentTarget(null)}
              disabled={assignStudentLoading}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={assignStudentLoading}
              onClick={handleSaveAssignStudents}
              disabled={selectedStudents.size === 0}
            >
              Simpan ({selectedStudents.size})
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
