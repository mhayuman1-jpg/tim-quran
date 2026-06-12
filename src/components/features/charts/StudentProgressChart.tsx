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
    <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '12px 16px', fontSize: '14px' }}>
      <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>{label}</p>
      {payload.map((entry, index) => (
        <p key={index} style={{ fontSize: '14px', color: entry.name === 'Tahfidz' ? '#d97706' : '#059669' }}>
          {entry.name}: <span style={{ fontWeight: 600 }}>{entry.value}%</span>
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

  const cardStyle = {
    borderRadius: '24px',
    border: '1px solid #fde68a',
    background: '#ffffff',
    padding: '20px',
    textAlign: 'center' as const,
    boxShadow: '0 2px 8px rgba(245,158,11,0.06)',
  };

  const labelStyle = {
    fontSize: '11px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    color: '#94a3b8',
  };

  const valueStyle = {
    fontSize: '32px',
    fontWeight: 700 as const,
    marginTop: '12px',
  };

  const subStyle = {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '8px',
  };

  const legendCardStyle = {
    borderRadius: '16px',
    border: '1px solid #fde68a',
    background: '#fffbeb',
    padding: '16px',
  };

  return (
    <div className="w-full">
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div style={cardStyle}>
          <p style={labelStyle}>Rata-rata Tahfidz</p>
          <p style={{ ...valueStyle, color: '#d97706' }}>{tahfidzAvg}%</p>
          <p style={subStyle}>Makhroj, Tajwid, Kelancaran</p>
        </div>
        <div style={cardStyle}>
          <p style={labelStyle}>Rata-rata Tahsin</p>
          <p style={{ ...valueStyle, color: '#b45309' }}>{tahsinAvg}%</p>
          <p style={subStyle}>Makhroj, Kelancaran, Tajwid</p>
        </div>
        <div style={cardStyle}>
          <p style={labelStyle}>Periode</p>
          <p style={{ ...valueStyle, color: '#1e293b' }}>{chartData.length}</p>
          <p style={subStyle}>Bulan terakhir</p>
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
                name="Tahfidz"
              />
              <Line
                type="monotone"
                dataKey="tahsin"
                stroke="#059669"
                strokeWidth={3}
                dot={{ r: 4, fill: '#059669' }}
                activeDot={{ r: 6, fill: '#059669', fillOpacity: 1 }}
                name="Tahsin"
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
        <div style={legendCardStyle}>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-3 w-3 rounded-full bg-amber-500"></div>
            <p style={{ fontWeight: 600, color: '#1e293b' }}>Tahfidz</p>
          </div>
          <p style={{ fontSize: '14px', color: '#94a3b8' }}>Penilaian harian mencakup makhroj (pengucapan huruf), tajwid (aturan bacaan), dan kelancaran membaca Al-Qur&apos;an.</p>
        </div>
        <div style={legendCardStyle}>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
            <p style={{ fontWeight: 600, color: '#1e293b' }}>Tahsin</p>
          </div>
          <p style={{ fontSize: '14px', color: '#94a3b8' }}>Penilaian harian mencakup makhroj, kelancaran, dan tajwid dalam membaca Al-Qur&apos;an.</p>
        </div>
      </div>
    </div>
  );
}

