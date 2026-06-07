'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

export interface ProgressPoint {
  month: string;
  tahfidz?: number;
  tahsin?: number;
  value?: number;
}

interface StudentProgressChartProps {
  data: ProgressPoint[];
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload || !payload.length || !label) return null;
  
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-slate-200 mb-2">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm" style={{ color: entry.name === 'Tahfidz' ? '#38bdf8' : '#34d399' }}>
          {entry.name}: <span className="font-semibold">{entry.value}%</span>
        </p>
      ))}
    </div>
  );
}

export default function StudentProgressChart({ data }: StudentProgressChartProps) {
  const chartData = data.length > 0 ? data : [];
  
  const tahfidzAvg = chartData.length > 0
    ? Math.round(chartData.reduce((sum, item) => sum + (item.tahfidz ?? 0), 0) / chartData.length)
    : 0;
  
  const tahsinAvg = chartData.length > 0
    ? Math.round(chartData.reduce((sum, item) => sum + (item.tahsin ?? 0), 0) / chartData.length)
    : 0;

  return (
    <div className="w-full">
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-700 bg-slate-950/80 px-5 py-4 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-widest">Rata-rata Tahfidz</p>
          <p className="mt-3 text-3xl font-bold text-cyan-300">{tahfidzAvg}%</p>
          <p className="mt-2 text-xs text-slate-500">Makhroj, Tajwid, Kelancaran</p>
        </div>
        <div className="rounded-3xl border border-slate-700 bg-slate-950/80 px-5 py-4 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-widest">Rata-rata Tahsin</p>
          <p className="mt-3 text-3xl font-bold text-emerald-400">{tahsinAvg}%</p>
          <p className="mt-2 text-xs text-slate-500">Makhroj, Kelancaran, Adab</p>
        </div>
        <div className="rounded-3xl border border-slate-700 bg-slate-950/80 px-5 py-4 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-widest">Periode</p>
          <p className="mt-3 text-3xl font-bold text-white">{chartData.length}</p>
          <p className="mt-2 text-xs text-slate-500">Bulan terakhir</p>
        </div>
      </div>

      <div className="rounded-[32px] border border-slate-700 bg-slate-900/85 p-6 shadow-lg shadow-slate-950/20" style={{ minHeight: 380 }}>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={chartData} margin={{ top: 16, right: 16, left: -12, bottom: 8 }}>
              <defs>
                <linearGradient id="tahfidzGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
              <YAxis 
                domain={[0, 100]} 
                tick={{ fill: '#94a3b8', fontSize: 12 }} 
                axisLine={false} 
                tickLine={false} 
                width={32}
                label={{ value: '%', angle: -90, position: 'insideLeft', offset: 8, fill: '#94a3b8' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '16px' }}
                iconType="line"
              />
              <Line
                type="monotone"
                dataKey="tahfidz"
                stroke="#38bdf8"
                strokeWidth={3}
                dot={{ r: 4, fill: '#38bdf8' }}
                activeDot={{ r: 6, fill: '#38bdf8', fillOpacity: 1 }}
                name="Tahfidz"
              />
              <Line
                type="monotone"
                dataKey="tahsin"
                stroke="#34d399"
                strokeWidth={3}
                dot={{ r: 4, fill: '#34d399' }}
                activeDot={{ r: 6, fill: '#34d399', fillOpacity: 1 }}
                name="Tahsin"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[340px] flex-col items-center justify-center text-center">
            <p className="text-slate-400">Data progres bulanan belum tersedia.</p>
            <p className="mt-2 text-sm text-slate-500">Tambahkan penilaian harian tahfidz dan tahsin untuk melihat tren progres.</p>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-3 w-3 rounded-full bg-cyan-400"></div>
            <p className="font-semibold text-slate-200">Tahfidz</p>
          </div>
          <p className="text-sm text-slate-400">Penilaian berdasarkan makhroj (pengucapan), tajwid, dan kelancaran bacaan harian.</p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-3 w-3 rounded-full bg-emerald-400"></div>
            <p className="font-semibold text-slate-200">Tahsin</p>
          </div>
          <p className="text-sm text-slate-400">Penilaian berdasarkan makhroj, kelancaran, dan adab (etika) membaca Al-Qur'an.</p>
        </div>
      </div>
    </div>
  );
}

