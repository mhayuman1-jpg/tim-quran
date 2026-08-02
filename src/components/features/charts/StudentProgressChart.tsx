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
  tahfidzCompletion?: number;
  tahsinCompletion?: number;
  tahsinSessions?: string;
  value?: number;
}

interface StudentProgressChartProps {
  data: ProgressPoint[];
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; payload: ProgressPoint }[]; label?: string }) {
  if (!active || !payload || !payload.length || !label) return null;

  const point = payload[0]?.payload;

  return (
    <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '14px 18px', fontSize: '13px', minWidth: 180 }}>
      <p style={{ fontWeight: 700, color: '#1e293b', marginBottom: '8px', fontSize: '14px' }}>{label}</p>
      {payload.map((entry, index) => {
        const isTahfidz = entry.name.includes('Tahfidz');
        const isScore = entry.name.includes('Nilai');
        return (
          <div key={index} style={{ marginBottom: '4px' }}>
            <p style={{ fontSize: '13px', color: isTahfidz ? '#d97706' : '#059669' }}>
              {entry.name}: <span style={{ fontWeight: 600 }}>{entry.value}{isScore ? '%' : ''}</span>
            </p>
          </div>
        );
      })}
      {point?.tahsinSessions && (
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>
          <p>Kehadiran Tahfidz: {point.tahfidzCompletion ?? 0}%</p>
          <p>Kehadiran Tahsin: {point.tahsinCompletion ?? 0}% ({point.tahsinSessions} minggu)</p>
        </div>
      )}
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

  const tahsinCompletionAvg = chartData.length > 0
    ? Math.round(chartData.reduce((sum, item) => sum + (item.tahsinCompletion ?? 0), 0) / chartData.length)
    : 0;

  const tahfidzCompletionAvg = chartData.length > 0
    ? Math.round(chartData.reduce((sum, item) => sum + (item.tahfidzCompletion ?? 0), 0) / chartData.length)
    : 0;

  const cardStyle = {
    borderRadius: '20px',
    border: '1px solid #fde68a',
    background: '#ffffff',
    padding: '20px',
    textAlign: 'center' as const,
    boxShadow: '0 2px 8px rgba(245,158,11,0.06)',
  };

  const labelStyle = {
    fontSize: '10px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.12em',
    color: '#94a3b8',
    fontWeight: 600 as const,
  };

  const valueStyle = {
    fontSize: '28px',
    fontWeight: 700 as const,
    marginTop: '8px',
  };

  const subStyle = {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '4px',
  };

  return (
    <div className="w-full">
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div style={cardStyle}>
          <p style={labelStyle}>Nilai Tahfidz</p>
          <p style={{ ...valueStyle, color: '#d97706' }}>{tahfidzAvg}%</p>
          <p style={subStyle}>Fleksibel · Makhroj, Tajwid, Lancar</p>
        </div>
        <div style={cardStyle}>
          <p style={labelStyle}>Nilai Tahsin</p>
          <p style={{ ...valueStyle, color: '#059669' }}>{tahsinAvg}%</p>
          <p style={subStyle}>Sen–Rab · Makhroj, Kelancaran, Adab</p>
        </div>
        <div style={cardStyle}>
          <p style={labelStyle}>Kehadiran Tahfidz</p>
          <p style={{ ...valueStyle, color: '#d97706' }}>{tahfidzCompletionAvg}%</p>
          <p style={subStyle}>Fleksibel · Semua hari</p>
        </div>
        <div style={cardStyle}>
          <p style={labelStyle}>Kehadiran Tahsin</p>
          <p style={{ ...valueStyle, color: '#059669' }}>{tahsinCompletionAvg}%</p>
          <p style={subStyle}>Target: 3× per minggu</p>
        </div>
      </div>

      <div style={{ borderRadius: '24px', border: '1px solid #fde68a', background: '#ffffff', padding: '24px', boxShadow: '0 4px 20px rgba(245,158,11,0.06)', minHeight: 380 }}>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={chartData} margin={{ top: 16, right: 16, left: -12, bottom: 8 }}>
              <defs>
                <linearGradient id="tahfidzGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d97706" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="tahsinGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={32}
                label={{ value: '%', angle: -90, position: 'insideLeft', offset: 8, fill: '#6b7280' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '16px' }}
                iconType="line"
              />
              <Line
                type="monotone"
                dataKey="tahfidz"
                stroke="#d97706"
                strokeWidth={3}
                dot={{ r: 4, fill: '#d97706' }}
                activeDot={{ r: 6, fill: '#d97706', fillOpacity: 1 }}
                name="Nilai Tahfidz"
              />
              <Line
                type="monotone"
                dataKey="tahsin"
                stroke="#059669"
                strokeWidth={3}
                dot={{ r: 4, fill: '#059669' }}
                activeDot={{ r: 6, fill: '#059669', fillOpacity: 1 }}
                name="Nilai Tahsin"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[340px] flex-col items-center justify-center text-center">
            <p style={{ color: '#94a3b8' }}>Data progres bulanan belum tersedia.</p>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '8px' }}>Tambahkan penilaian harian tahfidz dan tahsin untuk melihat tren progres.</p>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div style={{ borderRadius: '16px', border: '1px solid #fde68a', background: '#fffbeb', padding: '16px' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-3 w-3 rounded-full bg-amber-500"></div>
            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '13px' }}>Tahfidz — Fleksibel</p>
          </div>
          <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' }}>
            Jadwal fleksibel — santri boleh menyetor hafalan kapan saja selama minggu berjalan. Penilaian mencakup makhroj (pengucapan huruf), tajwid (aturan bacaan), dan kelancaran membaca Al-Qur&apos;an. Semua sesi terekam tanpa batasan hari.
          </p>
        </div>
        <div style={{ borderRadius: '16px', border: '1px solid #fde68a', background: '#fffbeb', padding: '16px' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '13px' }}>Tahsin — Senin, Selasa, Rabu</p>
          </div>
          <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' }}>
            Jadwal 3× per minggu (Sen–Rab). Penilaian mencakup makhroj, kelancaran, dan adab dalam membaca Al-Qur&apos;an. Kehadiran dihitung terhadap 3 sesi yang diharapkan setiap minggu.
          </p>
        </div>
      </div>
    </div>
  );
}
