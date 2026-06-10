'use client';

// src/components/features/charts/AttendanceChart.tsx
// BarChart kehadiran harian menggunakan Recharts.
// Komponen ini harus di-render di client only (no SSR) karena Recharts menggunakan
// browser APIs. Gunakan next/dynamic dengan ssr: false saat mengimpor.

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChartDataPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface DateRange {
  from: Date;
  to: Date;
}

interface AttendanceChartProps {
  data: ChartDataPoint[];
  dateRange?: DateRange;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Format tanggal YYYY-MM-DD ke label singkat untuk sumbu X.
 * Menampilkan "DD/MM" untuk tampilan ringkas.
 */
function formatXLabel(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

/**
 * Format tanggal YYYY-MM-DD ke format panjang Indonesia untuk tooltip.
 */
function formatTooltipDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts.map(Number);
  try {
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length || !label) return null;

  const count = payload[0].value;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-medium text-slate-700 mb-1">{formatTooltipDate(label)}</p>
      <p className="text-amber-700">
        <span className="font-bold">{count}</span>{' '}
        <span className="text-slate-500">{count === 1 ? 'siswa hadir' : 'siswa hadir'}</span>
      </p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AttendanceChart({ data, dateRange: _dateRange }: AttendanceChartProps) {
  // Tampilkan grafik kosong dengan nilai nol jika tidak ada data
  const chartData: ChartDataPoint[] = data.length > 0 ? data : [];

  // Hitung nilai maksimal untuk domain Y, minimum 5 agar grafik tidak terlalu flat
  const maxCount = chartData.length > 0 ? Math.max(...chartData.map((d) => d.count)) : 0;
  const yMax = Math.max(maxCount, 5);

  // Tentukan apakah tampilkan semua label atau skip untuk keterbacaan
  // Jika data lebih dari 14 hari, tampilkan setiap 7 hari
  const tickInterval = chartData.length > 60 ? 6 : chartData.length > 30 ? 3 : chartData.length > 14 ? 1 : 0;

  return (
    <div className="w-full">
      {/* Summary stats di atas grafik */}
      {chartData.length > 0 && (
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
            <span className="text-sm font-semibold text-amber-600">Total Hari</span>
            <span className="text-lg font-bold text-amber-800">{chartData.length}</span>
          </div>
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
            <span className="text-sm font-semibold text-amber-600">Maks. Hadir</span>
            <span className="text-lg font-bold text-amber-800">{maxCount}</span>
          </div>
          <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2">
            <span className="text-sm font-semibold text-slate-500">Rata-rata</span>
            <span className="text-lg font-bold text-slate-700">
              {chartData.length > 0
                ? (
                    chartData.reduce((sum, d) => sum + d.count, 0) / chartData.length
                  ).toFixed(1)
                : '0'}
            </span>
          </div>
        </div>
      )}

      {/* Grafik */}
      <div className="w-full" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatXLabel}
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
              interval={tickInterval}
            />
            <YAxis
              allowDecimals={false}
              domain={[0, yMax]}
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.count === 0 ? '#e2e8f0' : '#f59e0b'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Keterangan jika semua nilai nol */}
      {chartData.length > 0 && maxCount === 0 && (
        <p className="text-center text-sm text-slate-400 mt-3">
          Tidak ada siswa yang hadir pada periode ini.
        </p>
      )}

      {/* Keterangan jika tidak ada data sama sekali */}
      {chartData.length === 0 && (
        <p className="text-center text-sm text-slate-400 mt-3">
          Pilih rentang tanggal untuk melihat data kehadiran.
        </p>
      )}
    </div>
  );
}
