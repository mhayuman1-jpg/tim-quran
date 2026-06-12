'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ArrowRight, RotateCcw, PowerOff } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/lib/toast';
import type { Santri, SemesterSetting } from '@/types';

interface KelasOption {
  id: string;
  name: string;
}

export default function SemesterPage() {
  const { toast } = useToast();
  const [semester, setSemester] = useState<SemesterSetting | null>(null);
  const [semesterName, setSemesterName] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [classes, setClasses] = useState<KelasOption[]>([]);
  const [students, setStudents] = useState<Santri[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [targetClassId, setTargetClassId] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [search, setSearch] = useState('');
  const [savingSemester, setSavingSemester] = useState(false);
  const [transferring, setTransferring] = useState(false);

  // ── Reset Semester State ──
  const [openResetModal, setOpenResetModal] = useState(false);
  const [resetSemesterName, setResetSemesterName] = useState('');
  const [resetEndDate, setResetEndDate] = useState('');
  const [resetNotes, setResetNotes] = useState('');
  const [resetJuz, setResetJuz] = useState(true);
  const [resetting, setResetting] = useState(false);

  // ── Deactivate Semester State ──
  const [deactivating, setDeactivating] = useState(false);
  const [openDeactivateModal, setOpenDeactivateModal] = useState(false);

  const isSemesterActive = semester?.is_active === true;

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchClass = filterClassId ? student.class_id === filterClassId : true;
      const matchSearch = search.trim()
        ? `${student.nama} ${student.nisn}`.toLowerCase().includes(search.trim().toLowerCase())
        : true;
      return matchClass && matchSearch;
    });
  }, [students, filterClassId, search]);

  const fetchSemesterConfig = async () => {
    try {
      const res = await fetch('/api/semester/config');
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.message ?? 'Gagal memuat konfigurasi semester.');
        return;
      }
      const json = await res.json();
      const data = json.data as SemesterSetting | null;
      setSemester(data);
      if (data) {
        setSemesterName(data.semester_name);
        setEndDate(data.end_date);
        setNotes(data.notes ?? '');
      }
    } catch {
      toast.error('Terjadi kesalahan saat memuat semester.');
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/kelas/list');
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.message ?? 'Gagal memuat daftar kelas.');
        return;
      }
      const json = await res.json();
      const data = (json.data ?? []) as any[];
      setClasses(data.map((item) => ({ id: item.id, name: item.name })));
    } catch {
      toast.error('Terjadi kesalahan saat memuat kelas.');
    }
  };

  const fetchStudents = async () => {
    try {
      const url = search.trim() ? `/api/siswa/list?search=${encodeURIComponent(search.trim())}` : '/api/siswa/list';
      const res = await fetch(url);
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.message ?? 'Gagal memuat data siswa.');
        return;
      }
      const json = await res.json();
      setStudents((json.data ?? []) as Santri[]);
    } catch {
      toast.error('Terjadi kesalahan saat memuat data siswa.');
    }
  };

  useEffect(() => {
    fetchSemesterConfig();
    fetchClasses();
    fetchStudents();
    // intentional: these fetch helpers are stable and we don't want to re-run on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveSemester = async () => {
    if (!semesterName.trim()) {
      toast.error('Nama semester wajib diisi.');
      return;
    }
    if (!endDate) {
      toast.error('Tanggal akhir semester wajib diisi.');
      return;
    }
    setSavingSemester(true);
    try {
      const res = await fetch('/api/semester/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ semester_name: semesterName.trim(), end_date: endDate, notes: notes.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message ?? 'Gagal menyimpan konfigurasi semester.');
        return;
      }
      toast.success(json.message ?? 'Semester berhasil disimpan.');
      await fetchSemesterConfig();
    } catch {
      toast.error('Terjadi kesalahan saat menyimpan semester.');
    } finally {
      setSavingSemester(false);
    }
  };

  const handleDeactivateSemester = async () => {
    setDeactivating(true);
    try {
      const res = await fetch('/api/semester/deactivate', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message ?? 'Gagal menonaktifkan semester.');
        return;
      }
      toast.success(json.message ?? 'Semester berhasil dinonaktifkan.');
      setOpenDeactivateModal(false);
      await fetchSemesterConfig();
    } catch {
      toast.error('Terjadi kesalahan saat menonaktifkan semester.');
    } finally {
      setDeactivating(false);
    }
  };

  const handleResetSemester = async () => {
    if (!resetSemesterName.trim()) {
      toast.error('Nama semester baru wajib diisi.');
      return;
    }
    if (!resetEndDate) {
      toast.error('Tanggal akhir semester wajib diisi.');
      return;
    }
    setResetting(true);
    try {
      const res = await fetch('/api/semester/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          semester_name: resetSemesterName.trim(),
          end_date: resetEndDate,
          notes: resetNotes.trim() || null,
          reset_juz: resetJuz,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message ?? 'Gagal mereset semester.');
        return;
      }
      toast.success(json.message ?? 'Semester berhasil direset.');
      setOpenResetModal(false);
      setResetSemesterName('');
      setResetEndDate('');
      setResetNotes('');
      setResetJuz(true);
      await fetchSemesterConfig();
      await fetchStudents();
    } catch {
      toast.error('Terjadi kesalahan saat mereset semester.');
    } finally {
      setResetting(false);
    }
  };

  const openResetModalWithDefaults = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    if (month >= 7 && month <= 12) {
      setResetSemesterName(`Ganjil ${year}/${year + 1}`);
      setResetEndDate(`${year + 1}-01-31`);
    } else {
      setResetSemesterName(`Genap ${year - 1}/${year}`);
      setResetEndDate(`${year}-06-30`);
    }
    setResetNotes('');
    setResetJuz(true);
    setOpenResetModal(true);
  };

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleTransferStudents = async () => {
    if (!targetClassId) {
      toast.error('Pilih kelas tujuan terlebih dahulu.');
      return;
    }
    if (selectedStudents.length === 0) {
      toast.error('Pilih minimal satu siswa untuk dipindahkan.');
      return;
    }
    setTransferring(true);
    try {
      const results = await Promise.all(
        selectedStudents.map(async (studentId) => {
          const res = await fetch('/api/siswa/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: studentId, class_id: targetClassId }),
          });
          const json = await res.json();
          return { ok: res.ok, message: json.message ?? 'Gagal memperbarui siswa.' };
        })
      );

      const failed = results.filter((item) => !item.ok);
      if (failed.length > 0) {
        toast.error(`${failed.length} siswa gagal dipindahkan. Coba lagi.`);
      } else {
        toast.success('Siswa berhasil dipindahkan ke kelas baru.');
      }
      setSelectedStudents([]);
      setTargetClassId('');
      await fetchStudents();
    } catch {
      toast.error('Terjadi kesalahan saat memindahkan siswa.');
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Semester & Mutasi Kelas</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola periode semester aktif dan pemindahan siswa antar kelas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="danger"
            leftIcon={<RotateCcw size={16} />}
            onClick={openResetModalWithDefaults}
          >
            Mulai Semester Baru
          </Button>
          <Button variant="secondary" onClick={() => { fetchSemesterConfig(); fetchClasses(); fetchStudents(); }}>
            Muat Ulang Data
          </Button>
        </div>
      </div>

      {/* ── Warning: Tidak ada semester aktif ── */}
      {!semester || !isSemesterActive ? (
        <div className="rounded-2xl border-2 border-dashed border-red-300 bg-red-50 p-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full bg-red-100 p-3">
              <PowerOff size={24} className="text-red-600" />
            </div>
            <div>
              <p className="text-base font-semibold text-red-800">Semester Tidak Aktif</p>
              <p className="text-sm text-red-600 mt-1 max-w-md">
                Saat ini tidak ada semester yang aktif. Semua sistem penilaian <strong>tidak dapat digunakan</strong> termasuk absensi, input jurnal hafalan/tahsin, dan raport.
              </p>
              <p className="text-sm text-red-500 mt-2">
                Aktifkan semester baru untuk mengembalikan fungsi sistem.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Info Semester & Form Semester Baru ── */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Card: Semester Aktif */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className={`rounded-2xl p-3 ${isSemesterActive ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
              <CalendarDays size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">Semester Aktif</p>
              <p className="text-xs text-slate-500">Konfigurasi semester saat ini</p>
            </div>
            {semester && (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                isSemesterActive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isSemesterActive ? 'bg-green-500' : 'bg-red-500'}`} />
                {isSemesterActive ? 'Aktif' : 'Nonaktif'}
              </span>
            )}
          </div>
          {semester ? (
            <div className="space-y-3 text-sm text-slate-700">
              <div>
                <p className="text-slate-500 text-xs">Nama Semester</p>
                <p className="font-medium">{semester.semester_name}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Tanggal Akhir</p>
                <p className="font-medium">{semester.end_date}</p>
              </div>
              {semester.notes && (
                <div>
                  <p className="text-slate-500 text-xs">Catatan</p>
                  <p>{semester.notes}</p>
                </div>
              )}
              <div className="text-slate-400 text-xs">Terakhir diperbarui: {semester.updated_at ?? semester.created_at}</div>
              {isSemesterActive && (
                <div className="pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<PowerOff size={14} />}
                    onClick={() => setOpenDeactivateModal(true)}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    Nonaktifkan Semester
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Belum ada konfigurasi semester tersimpan.</p>
          )}
        </div>

        {/* Card: Atur Semester Baru */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <ArrowRight size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Atur Semester Baru</p>
              <p className="text-xs text-slate-500">Simpan periode semester terbaru sekaligus menonaktifkan yang lama.</p>
            </div>
          </div>

          <div className="space-y-4">
            <Input label="Nama Semester" value={semesterName} onChange={(e) => setSemesterName(e.target.value)} />
            <Input label="Tanggal Akhir" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Catatan</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Contoh: Semester genap 2025/2026"
              />
            </div>
            <Button variant="primary" loading={savingSemester} onClick={handleSaveSemester}>
              Simpan Semester
            </Button>
          </div>
        </div>
      </div>

      {/* ── Pemindahan Siswa ── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Pemindahan Siswa Antar Kelas</p>
            <p className="text-xs text-slate-500">Pilih beberapa siswa, lalu pindahkan ke kelas baru.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">Filter kelas</label>
              <select
                value={filterClassId}
                onChange={(e) => setFilterClassId(e.target.value)}
                className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
              >
                <option value="">Semua kelas</option>
                {classes.map((kelas) => (
                  <option key={kelas.id} value={kelas.id}>{kelas.name}</option>
                ))}
              </select>
            </div>
            <Input
              label="Cari siswa"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nama atau NISN"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-[220px]">
            <label className="text-sm font-medium text-slate-700">Pindahkan ke kelas</label>
            <select
              value={targetClassId}
              onChange={(e) => setTargetClassId(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            >
              <option value="">— Pilih Kelas Tujuan —</option>
              {classes.map((kelas) => (
                <option key={kelas.id} value={kelas.id}>{kelas.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="text-sm text-slate-500">
              Terpilih: <span className="font-semibold text-slate-900">{selectedStudents.length}</span>
            </div>
            <Button variant="primary" loading={transferring} onClick={handleTransferStudents}>
              Pindahkan Siswa
            </Button>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-4 py-3">Pilih</th>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">NISN</th>
                <th className="px-4 py-3">Kelas Saat Ini</th>
                <th className="px-4 py-3">Juz Terakhir</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">Tidak ada siswa yang sesuai filter.</td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => handleToggleStudent(student.id)}
                        className="h-4 w-4 text-amber-600 border-slate-300 rounded"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{student.nama}</td>
                    <td className="px-4 py-3 text-slate-600">{student.nisn}</td>
                    <td className="px-4 py-3 text-slate-600">{student.classes?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{student.juz_terakhir ?? '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Reset Semester ── */}
      <Modal open={openResetModal} onClose={() => setOpenResetModal(false)} title="Mulai Semester Baru" size="md">
        <div className="space-y-4">
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            <p className="font-semibold mb-1">Peringatan</p>
            <p className="text-red-600">
              Tindakan ini akan menonaktifkan semester saat ini dan membuat semester baru.
              {resetJuz && ' Semua juz terakhir siswa aktif akan direset ke 1.'}
            </p>
            <p className="text-red-500 mt-2 text-xs">
              Data jurnal (hafalan, tahsin, absensi) TIDAK akan terhapus — data lama tetap tersimpan.
            </p>
          </div>

          <Input
            label="Nama Semester Baru"
            value={resetSemesterName}
            onChange={(e) => setResetSemesterName(e.target.value)}
            placeholder="Contoh: Ganjil 2026/2027"
          />

          <Input
            label="Tanggal Akhir Semester"
            type="date"
            value={resetEndDate}
            onChange={(e) => setResetEndDate(e.target.value)}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Catatan (opsional)</label>
            <textarea
              value={resetNotes}
              onChange={(e) => setResetNotes(e.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Catatan untuk semester baru"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={resetJuz}
              onChange={(e) => setResetJuz(e.target.checked)}
              className="h-4 w-4 text-amber-600 border-slate-300 rounded"
            />
            <div className="text-sm">
              <span className="font-medium text-slate-700">Reset juz terakhir semua siswa ke 1</span>
              <p className="text-xs text-slate-500">Cocok untuk awal tahun ajaran baru</p>
            </div>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setOpenResetModal(false)}>
              Batal
            </Button>
            <Button variant="danger" loading={resetting} onClick={handleResetSemester}>
              Ya, Mulai Semester Baru
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal Nonaktifkan Semester ── */}
      <Modal open={openDeactivateModal} onClose={() => setOpenDeactivateModal(false)} title="Nonaktifkan Semester" size="sm">
        <div className="space-y-4">
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm">
            <p className="font-semibold text-red-800 mb-1">Konfirmasi Nonaktifkan Semester</p>
            <p className="text-red-600">
              Setelah semester dinonaktifkan, <strong>semua sistem penilaian tidak dapat digunakan</strong>:
            </p>
            <ul className="mt-2 ml-4 text-red-600 text-xs space-y-1 list-disc">
              <li>Absensi scan tidak berfungsi</li>
              <li>Input jurnal hafalan / tahsin terblokir</li>
              <li>Input raport tidak bisa dilakukan</li>
              <li>Upload rekap terblokir</li>
            </ul>
            <p className="text-red-500 mt-3 text-xs">
              Anda harus membuat semester baru untuk mengaktifkan kembali sistem.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setOpenDeactivateModal(false)}>
              Batal
            </Button>
            <Button variant="danger" loading={deactivating} onClick={handleDeactivateSemester}>
              Ya, Nonaktifkan Semester
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
