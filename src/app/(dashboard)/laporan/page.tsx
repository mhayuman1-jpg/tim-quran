'use client';

// src/app/(dashboard)/laporan/page.tsx
// Halaman Laporan Progres Siswa per Tim (Kabid Only)
// - Dropdown pilih anggota Tim_Quran
// - Tabel siswa dengan ringkasan progres
// - Klik siswa untuk lihat detail riwayat hafalan/tahsin/absensi

import React, { useCallback, useEffect, useState } from 'react';
import { Eye } from 'lucide-react';

import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';

// ─── Types ──────────────────────────────────────────────────────────────────

interface TimMember {
  id: string;
  name: string;
  email: string;
  status: 'Aktif' | 'Nonaktif';
}

interface StudentProgress {
  id: string;
  nisn: string;
  nama: string;
  gender: string;
  juz_terakhir: number;
  kelas: string | null;
  total_hafalan: number;
  total_tahsin: number;
  persentase_kehadiran: number;
  days_present: number;
  total_days: number;
}

interface LaporanResponse {
  teacher_id: string;
  students: StudentProgress[];
  summary: {
    total_students: number;
    students_with_hafalan: number;
    students_with_tahsin: number;
    students_with_attendance: number;
  };
}

interface HafalanRecord {
  id: string;
  tanggal: string;
  surah_juz: string;
  halaman: number | null;
  catatan: string | null;
  users: { name: string } | null;
}

interface TahsinRecord {
  id: string;
  tanggal: string;
  metode: string;
  buku: string | null;
  halaman: number | null;
  catatan: string | null;
  users: { name: string } | null;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  scanned_at: string;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

let toastCounter = 0;

// ─── Toast Component ────────────────────────────────────────────────────────

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={[
            'flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg text-sm',
            t.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800',
          ].join(' ')}
        >
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            className="text-slate-400 hover:text-slate-600 shrink-0"
            aria-label="Tutup notifikasi"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function LaporanPage() {
  // ── Tim members list
  const [timMembers, setTimMembers] = useState<TimMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // ── Selected teacher
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

  // ── Laporan data
  const [laporanData, setLaporanData] = useState<LaporanResponse | null>(null);
  const [loadingLaporan, setLoadingLaporan] = useState(false);

  // ── Detail modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentProgress | null>(null);
  const [detailTab, setDetailTab] = useState<'hafalan' | 'tahsin' | 'absensi'>('hafalan');
  const [hafalanHistory, setHafalanHistory] = useState<HafalanRecord[]>([]);
  const [tahsinHistory, setTahsinHistory] = useState<TahsinRecord[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ── Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: Toast['type'], message: string) => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const dismissToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // ── Fetch tim members
  const fetchTimMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const res = await fetch('/api/tim/list');
      const json = await res.json();
      if (!res.ok) {
        showToast('error', json.message ?? 'Gagal memuat data Tim Qur\'an.');
        setTimMembers([]);
      } else {
        const activeMembers = (json.data ?? []).filter((m: TimMember) => m.status === 'Aktif');
        setTimMembers(activeMembers);
      }
    } catch {
      showToast('error', 'Terjadi kesalahan saat memuat data Tim Qur\'an.');
      setTimMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    fetchTimMembers();
  }, [fetchTimMembers]);

  // Auto-select first member setelah data dimuat
  useEffect(() => {
    if (timMembers.length > 0 && !selectedTeacherId) {
      setSelectedTeacherId(timMembers[0].id);
    }
  }, [timMembers, selectedTeacherId]);

  // ── Fetch laporan when teacher selected
  const fetchLaporan = useCallback(async (teacherId: string) => {
    if (!teacherId) return;

    setLoadingLaporan(true);
    try {
      const res = await fetch(`/api/laporan/tim?teacher_id=${encodeURIComponent(teacherId)}`);
      const json = await res.json();
      if (!res.ok) {
        showToast('error', json.message ?? 'Gagal memuat laporan progres.');
        setLaporanData(null);
      } else {
        setLaporanData(json);
      }
    } catch {
      showToast('error', 'Terjadi kesalahan saat memuat laporan progres.');
      setLaporanData(null);
    } finally {
      setLoadingLaporan(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTeacherId) {
      fetchLaporan(selectedTeacherId);
    }
  }, [selectedTeacherId, fetchLaporan]);

  // ── Open detail modal
  const handleOpenDetail = async (student: StudentProgress) => {
    setSelectedStudent(student);
    setDetailTab('hafalan');
    setDetailModalOpen(true);
    setLoadingDetail(true);

    try {
      // Fetch semua history secara paralel
      const [hafalanRes, tahsinRes, attendanceRes] = await Promise.all([
        fetch(`/api/hafalan/list?student_id=${student.id}`),
        fetch(`/api/tahsin/list?student_id=${student.id}`),
        fetch(`/api/absensi/student?student_id=${student.id}`),
      ]);

      const [hafalanJson, tahsinJson, attendanceJson] = await Promise.all([
        hafalanRes.json(),
        tahsinRes.json(),
        attendanceRes.json(),
      ]);

      setHafalanHistory(hafalanJson.data ?? []);
      setTahsinHistory(tahsinJson.data ?? []);
      setAttendanceHistory(attendanceJson.data ?? []);
    } catch {
      showToast('error', 'Gagal memuat detail riwayat siswa.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const selectedTeacher = timMembers.find((m) => m.id === selectedTeacherId);

  return (
    <div className="space-y-6">
      {/* ── Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Laporan Progres Siswa per Tim</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Pantau progres hafalan, tahsin, dan kehadiran siswa berdasarkan anggota Tim Qur&apos;an yang membina.
        </p>
      </div>

      {/* ── Teacher selector */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <label htmlFor="teacher-select" className="block text-sm font-medium text-slate-700 mb-2">
          Pilih Anggota Tim Qur&apos;an
        </label>
        <select
          id="teacher-select"
          value={selectedTeacherId}
          onChange={(e) => setSelectedTeacherId(e.target.value)}
          disabled={loadingMembers}
          className="w-full md:w-96 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
        >
          {loadingMembers ? (
            <option>Memuat...</option>
          ) : timMembers.length === 0 ? (
            <option>Tidak ada anggota aktif</option>
          ) : (
            timMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} ({member.email})
              </option>
            ))
          )}
        </select>
      </div>

      {/* ── Summary cards */}
      {laporanData && !loadingLaporan && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="text-sm font-medium text-slate-600 mb-1">Total Siswa</div>
            <div className="text-3xl font-bold text-slate-900">{laporanData.summary.total_students}</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="text-sm font-medium text-slate-600 mb-1">Siswa dengan Hafalan</div>
            <div className="text-3xl font-bold text-emerald-600">{laporanData.summary.students_with_hafalan}</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="text-sm font-medium text-slate-600 mb-1">Siswa dengan Tahsin</div>
            <div className="text-3xl font-bold text-blue-600">{laporanData.summary.students_with_tahsin}</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="text-sm font-medium text-slate-600 mb-1">Siswa dengan Kehadiran</div>
            <div className="text-3xl font-bold text-amber-600">{laporanData.summary.students_with_attendance}</div>
          </div>
        </div>
      )}

      {/* ── Students table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Daftar Siswa {selectedTeacher && `- ${selectedTeacher.name}`}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  NISN
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Nama
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Kelas
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Juz
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Hafalan
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Tahsin
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Kehadiran
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingLaporan ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <div className="h-5 bg-slate-200 rounded animate-pulse w-24"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 bg-slate-200 rounded animate-pulse w-40"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 bg-slate-200 rounded animate-pulse w-16"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 bg-slate-200 rounded animate-pulse w-8 mx-auto"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 bg-slate-200 rounded animate-pulse w-8 mx-auto"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 bg-slate-200 rounded animate-pulse w-8 mx-auto"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 bg-slate-200 rounded animate-pulse w-12 mx-auto"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-8 bg-slate-200 rounded animate-pulse w-24 ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : !laporanData || laporanData.students.length === 0 ? (
                // Empty state
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                    {selectedTeacherId
                      ? 'Tidak ada siswa yang dibina oleh anggota Tim Qur\'an ini.'
                      : 'Pilih anggota Tim Qur\'an untuk melihat laporan.'}
                  </td>
                </tr>
              ) : (
                // Data rows
                laporanData.students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">{student.nisn}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-sm font-medium text-slate-800">{student.nama}</span>
                        <span className="text-xs text-slate-500 ml-2">({student.gender})</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">{student.kelas ?? '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="blue">{student.juz_terakhir}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-semibold ${student.total_hafalan > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {student.total_hafalan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-semibold ${student.total_tahsin > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                        {student.total_tahsin}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-semibold ${student.persentase_kehadiran > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {student.persentase_kehadiran}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Eye size={14} />}
                          onClick={() => handleOpenDetail(student)}
                        >
                          Detail
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Total count */}
        {!loadingLaporan && laporanData && laporanData.students.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50">
            <p className="text-xs text-slate-500">
              Menampilkan {laporanData.students.length} siswa • Total kehadiran dihitung dari {laporanData.students[0]?.total_days ?? 0} hari aktif
            </p>
          </div>
        )}
      </div>

      {/* ── Detail modal */}
      <Modal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={`Detail Riwayat - ${selectedStudent?.nama ?? ''}`}
        size="lg"
      >
        {selectedStudent && (
          <div className="space-y-4">
            {/* Student info */}
            <div className="bg-slate-50 rounded-lg p-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-600">NISN:</span>
                <span className="ml-2 font-medium text-slate-800">{selectedStudent.nisn}</span>
              </div>
              <div>
                <span className="text-slate-600">Kelas:</span>
                <span className="ml-2 font-medium text-slate-800">{selectedStudent.kelas ?? '-'}</span>
              </div>
              <div>
                <span className="text-slate-600">Juz Saat Ini:</span>
                <span className="ml-2 font-medium text-slate-800">{selectedStudent.juz_terakhir}</span>
              </div>
              <div>
                <span className="text-slate-600">Gender:</span>
                <span className="ml-2 font-medium text-slate-800">{selectedStudent.gender}</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setDetailTab('hafalan')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  detailTab === 'hafalan'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-slate-600 hover:text-slate-800'
                }`}
              >
                Hafalan ({selectedStudent.total_hafalan})
              </button>
              <button
                onClick={() => setDetailTab('tahsin')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  detailTab === 'tahsin'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-800'
                }`}
              >
                Tahsin ({selectedStudent.total_tahsin})
              </button>
              <button
                onClick={() => setDetailTab('absensi')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  detailTab === 'absensi'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-slate-600 hover:text-slate-800'
                }`}
              >
                Kehadiran ({selectedStudent.days_present}/{selectedStudent.total_days})
              </button>
            </div>

            {/* Tab content */}
            <div className="max-h-96 overflow-y-auto">
              {loadingDetail ? (
                <div className="py-8 text-center text-sm text-slate-500">Memuat data...</div>
              ) : (
                <>
                  {/* Hafalan tab */}
                  {detailTab === 'hafalan' && (
                    <div className="space-y-2">
                      {hafalanHistory.length === 0 ? (
                        <p className="py-8 text-center text-sm text-slate-500">Belum ada catatan hafalan.</p>
                      ) : (
                        hafalanHistory.map((h) => (
                          <div key={h.id} className="bg-white border border-slate-200 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="text-sm font-medium text-slate-800">{h.surah_juz}</div>
                                {h.halaman && (
                                  <div className="text-xs text-slate-600 mt-0.5">Halaman {h.halaman}</div>
                                )}
                                {h.catatan && (
                                  <div className="text-xs text-slate-600 mt-1 italic">&quot;{h.catatan}&quot;</div>
                                )}
                              </div>
                              <div className="text-right shrink-0 ml-3">
                                <div className="text-xs text-slate-500">{h.tanggal}</div>
                                {h.users && (
                                  <div className="text-xs text-slate-400 mt-0.5">{h.users.name}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Tahsin tab */}
                  {detailTab === 'tahsin' && (
                    <div className="space-y-2">
                      {tahsinHistory.length === 0 ? (
                        <p className="py-8 text-center text-sm text-slate-500">Belum ada catatan tahsin.</p>
                      ) : (
                        tahsinHistory.map((t) => (
                          <div key={t.id} className="bg-white border border-slate-200 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="text-sm font-medium text-slate-800">
                                  <Badge variant="blue">{t.metode}</Badge>
                                </div>
                                {t.buku && (
                                  <div className="text-xs text-slate-600 mt-1">Buku: {t.buku}</div>
                                )}
                                {t.halaman && (
                                  <div className="text-xs text-slate-600">Halaman {t.halaman}</div>
                                )}
                                {t.catatan && (
                                  <div className="text-xs text-slate-600 mt-1 italic">&quot;{t.catatan}&quot;</div>
                                )}
                              </div>
                              <div className="text-right shrink-0 ml-3">
                                <div className="text-xs text-slate-500">{t.tanggal}</div>
                                {t.users && (
                                  <div className="text-xs text-slate-400 mt-0.5">{t.users.name}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Absensi tab */}
                  {detailTab === 'absensi' && (
                    <div className="space-y-2">
                      {attendanceHistory.length === 0 ? (
                        <p className="py-8 text-center text-sm text-slate-500">Belum ada catatan kehadiran.</p>
                      ) : (
                        attendanceHistory.map((a) => (
                          <div key={a.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-slate-800">{a.date}</div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {new Date(a.scanned_at).toLocaleString('id-ID')}
                              </div>
                            </div>
                            <Badge variant={a.status === 'Hadir' ? 'green' : 'red'}>
                              {a.status}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Close button */}
            <div className="flex justify-end pt-2">
              <Button variant="ghost" onClick={() => setDetailModalOpen(false)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
