'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Semester & Mutasi Kelas</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola periode semester aktif dan pemindahan siswa antar kelas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => { fetchSemesterConfig(); fetchClasses(); fetchStudents(); }}>
            Muat Ulang Data
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
              <CalendarDays size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Semester Aktif</p>
              <p className="text-xs text-slate-500">Konfigurasi semester saat ini</p>
            </div>
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
            </div>
          ) : (
            <p className="text-sm text-slate-500">Belum ada konfigurasi semester tersimpan.</p>
          )}
        </div>

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
    </div>
  );
}
