'use client';
export const dynamic = 'force-dynamic';

// src/app/(dashboard)/laporan/capaian-lulusan/page.tsx
// Halaman Grafik Capaian Lulusan untuk Kabid
// Standar per kelas & semester

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Award, Users, TrendingUp, AlertCircle, ChevronDown, ChevronRight, GraduationCap } from 'lucide-react';

interface StudentAchievement {
  id: string;
  nama: string;
  juz_terakhir: string | null;
  achieved: boolean;
  total_hafalan: number;
  latest_hafalan: {
    surah_juz: string;
    tanggal: string;
    lancar?: string | null;
    makhroj?: string | null;
  } | null;
}

interface ClassStat {
  class_name: string;
  class_number: number;
  semester: string;
  semester_standar_label: string;
  total_students: number;
  achieved: number;
  not_achieved: number;
  percentage: number;
  students: StudentAchievement[];
}

interface Summary {
  total_students: number;
  total_achieved: number;
  total_not_achieved: number;
  total_percentage: number;
}

interface Standards {
  [kelas: number]: { smt1: string; smt2: string };
}

interface ApiResponse {
  classes: ClassStat[];
  summary: Summary;
  standards: Standards;
  current_semester: string;
}

const CHART_COLORS = {
  achieved: '#22c55e',
  notAchieved: '#ef4444',
};

export default function CapaianLulusanPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/laporan/capaian-lulusan')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Gagal memuat data'))))
      .then((json) => setData(json.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (className: string) => {
    setExpandedClass((prev) => (prev === className ? null : className));
  };

  const chartData = data?.classes
    .filter((c) => c.class_number >= 1 && c.class_number <= 6)
    .map((c) => ({
      name: c.class_name,
      achieved: c.achieved,
      not_achieved: c.not_achieved,
      percentage: c.percentage,
    })) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Award size={24} className="text-amber-600" />
          Capaian Lulusan
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Standar capaian hafalan siswa per kelas & semester.
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-3">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Memuat data capaian...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Content */}
      {data && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Siswa</p>
                  <p className="text-2xl font-bold text-slate-800">{data.summary.total_students}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <TrendingUp size={18} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Capai Standar</p>
                  <p className="text-2xl font-bold text-emerald-600">{data.summary.total_achieved}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertCircle size={18} className="text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Belum Capai Standar</p>
                  <p className="text-2xl font-bold text-red-600">{data.summary.total_not_achieved}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Standar per kelas & semester */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap size={18} className="text-amber-600" />
              <h2 className="text-base font-semibold text-slate-800">
                Standar Capaian per Kelas & Semester
              </h2>
              <span className="ml-auto text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                Semester Aktif: {data.current_semester}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-medium text-slate-600">Kelas</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">Semester 1 (Ganjil)</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">Semester 2 (Genap)</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5, 6].map((kelas) => (
                    <tr key={kelas} className="border-b border-slate-100 last:border-0">
                      <td className="py-2.5 px-3 font-medium text-slate-800">Kelas {kelas}</td>
                      <td className="py-2.5 px-3 text-slate-600">{data.standards[kelas]?.smt1 ?? '-'}</td>
                      <td className="py-2.5 px-3 text-slate-600">{data.standards[kelas]?.smt2 ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-base font-semibold text-slate-800 mb-4">
                Grafik Capaian per Kelas (Semester {data.current_semester})
              </h2>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                    formatter={(value, name) => [
                      String(value),
                      name === 'achieved' ? 'Capai Standar' : 'Belum Capai',
                    ]}
                  />
                  <Legend
                    formatter={(value) => (value === 'achieved' ? 'Capai Standar' : 'Belum Capai')}
                  />
                  <Bar dataKey="achieved" fill={CHART_COLORS.achieved} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="not_achieved" fill={CHART_COLORS.notAchieved} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Detail per kelas */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-base font-semibold text-slate-800 mb-4">
              Detail per Kelas
            </h2>
            <div className="space-y-3">
              {data.classes
                .filter((c) => c.class_number >= 1 && c.class_number <= 6)
                .map((cls) => (
                  <div key={cls.class_name} className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleExpand(cls.class_name)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        {expandedClass === cls.class_name ? (
                          <ChevronDown size={16} className="text-slate-400" />
                        ) : (
                          <ChevronRight size={16} className="text-slate-400" />
                        )}
                        <span className="font-medium text-slate-800">{cls.class_name}</span>
                        <span className="text-sm text-slate-500">{cls.total_students} siswa</span>
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          Target: {cls.semester_standar_label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${cls.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-slate-700 w-12 text-right">
                          {cls.percentage}%
                        </span>
                        <span className="text-sm text-emerald-600">{cls.achieved} ✓</span>
                        <span className="text-sm text-red-500">{cls.not_achieved} ✗</span>
                      </div>
                    </button>

                    {expandedClass === cls.class_name && (
                      <div className="border-t border-slate-200 divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                        {/* Ringkasan */}
                        <div className="px-4 py-2.5 bg-slate-50 flex items-center gap-4 text-xs font-medium text-slate-500">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            {cls.achieved} capai target
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            {cls.not_achieved} belum capai target
                          </span>
                        </div>
                        {/* Sort: belum capai di atas, sudah capai di bawah */}
                        {[...cls.students]
                          .sort((a, b) => {
                            if (a.achieved === b.achieved) return a.nama.localeCompare(b.nama);
                            return a.achieved ? 1 : -1;
                          })
                          .map((s) => (
                            <div
                              key={s.id}
                              className={`px-4 py-3 text-sm border-b border-slate-100 last:border-0 ${
                                s.achieved ? 'bg-white' : 'bg-red-50/50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={s.achieved ? 'text-emerald-500' : 'text-red-500'}>
                                    {s.achieved ? '✓' : '✗'}
                                  </span>
                                  <span className={s.achieved ? 'text-slate-700' : 'text-slate-800 font-medium'}>
                                    {s.nama}
                                  </span>
                                </div>
                                <span className="text-slate-500">
                                  {s.juz_terakhir ? `Juz ${s.juz_terakhir}` : 'Belum ada'}
                                </span>
                              </div>
                              {/* Detail capaian terkini */}
                              <div className="mt-1.5 ml-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                {s.latest_hafalan ? (
                                  <>
                                    <span className="flex items-center gap-1">
                                      <span className="text-amber-600">Terakhir:</span>
                                      <span className="font-medium text-slate-700">{s.latest_hafalan.surah_juz}</span>
                                      <span className="text-slate-400">·</span>
                                      <span>{new Date(s.latest_hafalan.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    </span>
                                    {(s.latest_hafalan.lancar || s.latest_hafalan.makhroj) && (
                                      <span className="flex items-center gap-1">
                                        {s.latest_hafalan.lancar && (
                                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
                                            {s.latest_hafalan.lancar}
                                          </span>
                                        )}
                                        {s.latest_hafalan.makhroj && (
                                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                                            M: {s.latest_hafalan.makhroj}
                                          </span>
                                        )}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-slate-400 italic">Belum ada catatan hafalan</span>
                                )}
                                <span className="text-slate-400">
                                  {s.total_hafalan} setoran
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
