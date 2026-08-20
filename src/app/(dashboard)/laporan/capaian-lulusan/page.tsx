'use client';
export const dynamic = 'force-dynamic';

// src/app/(dashboard)/laporan/capaian-lulusan/page.tsx
// Halaman Grafik Capaian Lulusan untuk Kabid
// Standar:
//   Kelas 4: minimal Juz 30
//   Kelas 6: minimal Juz 29-30

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Award, Users, TrendingUp, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import Button from '@/components/ui/Button';

interface StudentAchievement {
  id: string;
  nama: string;
  juz_terakhir: string | null;
  achieved: boolean;
}

interface ClassStat {
  class_name: string;
  class_number: number;
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

interface ApiResponse {
  classes: ClassStat[];
  summary: Summary;
  standards: Record<number, number>;
}

const CHART_COLORS = {
  achieved: '#22c55e',    // hijau
  notAchieved: '#ef4444', // merah
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

  // Format data untuk chart - tampilkan semua kelas (1-6)
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
          Grafik standar capaian hafalan siswa per kelas.
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

          {/* Standar info */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-amber-800 mb-3">Standar Capaian Lulusan — Kurikulum Hafalan SDIT Al-Hilmi</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-amber-700">
              <div className="bg-white/60 rounded-lg p-3 border border-amber-100">
                <div className="font-semibold text-amber-800 mb-1">Kelas 1-4: Juz 30</div>
                <div className="text-xs space-y-0.5">
                  <p>Lev I (Kelas 1-2): AnNas – At Takatsur</p>
                  <p>Lev II (Kelas 3-4): Al Qoriah – Ad Dhuha</p>
                  <p className="font-medium pt-1">Target Kelas 4: Juz 30 selesai</p>
                </div>
              </div>
              <div className="bg-white/60 rounded-lg p-3 border border-amber-100">
                <div className="font-semibold text-amber-800 mb-1">Kelas 5-6: Juz 29</div>
                <div className="text-xs space-y-0.5">
                  <p>Lev III (Kelas 5): Al Lail – Al A'la</p>
                  <p>Lev IV (Kelas 6): At Thoriq – An Naba</p>
                  <p className="font-medium pt-1">Target Kelas 6: Juz 30 & 29 selesai</p>
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-base font-semibold text-slate-800 mb-4">
                Grafik Capaian per Kelas
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
                    {/* Class header */}
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
                        <span className="text-sm text-slate-500">
                          {cls.total_students} siswa
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Progress bar */}
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

                    {/* Student list (expanded) */}
                    {expandedClass === cls.class_name && (
                      <div className="border-t border-slate-200 divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                        {cls.students.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between px-4 py-2.5 text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span className={s.achieved ? 'text-emerald-500' : 'text-red-500'}>
                                {s.achieved ? '✓' : '✗'}
                              </span>
                              <span className="text-slate-700">{s.nama}</span>
                            </div>
                            <span className="text-slate-500">
                              {s.juz_terakhir ? `Juz ${s.juz_terakhir}` : 'Belum ada'}
                            </span>
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
