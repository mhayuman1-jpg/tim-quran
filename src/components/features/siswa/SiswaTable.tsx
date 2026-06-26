'use client';

import React from 'react';
import Image from 'next/image';
import { cacheBust } from '@/lib/image';
import { Edit, Trash2, Printer } from 'lucide-react';
import DataTable, { ColumnDef } from '@/components/shared/DataTable';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import type { Santri } from '@/types';

interface SiswaTableProps {
  data: Santri[];
  loading?: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onEdit: (siswa: Santri) => void;
  onDelete: (siswa: Santri) => void;
  onPrintOne?: (siswa: Santri) => void;
}

function formatTanggalLahir(tgl?: string): string {
  if (!tgl) return '—';
  try {
    return new Date(tgl).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return tgl; }
}

function StudentAvatar({ nama, photo_url }: { nama: string; photo_url?: string }) {
  if (photo_url) {
    const src = cacheBust(photo_url) || photo_url;
    return (
      <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-slate-200">
        <Image src={src} alt={nama} fill className="object-cover" sizes="32px" unoptimized />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 border border-amber-200">
      <span className="text-amber-700 font-semibold text-xs">
        {nama.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

export default function SiswaTable({
  data,
  loading = false,
  selectedIds,
  onSelectionChange,
  onEdit,
  onDelete,
  onPrintOne,
}: SiswaTableProps) {
  const allSelected = data.length > 0 && selectedIds.length === data.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(data.map((s) => s.id));
    }
  };

  const toggleOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((x) => x !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const columns: ColumnDef<Santri>[] = [
    {
      key: 'checkbox',
      header: '',
      width: '40px',
      align: 'center',
      headerClassName: 'px-2',
      cellClassName: 'px-2',
      render: (row) => (
        <input
          type="checkbox"
          aria-label={`Pilih ${row.nama}`}
          checked={selectedIds.includes(row.id)}
          onChange={() => toggleOne(row.id)}
          className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
        />
      ),
    },
    {
      key: 'nisn',
      header: 'NIS/NISN',
      width: '130px',
      render: (row) => (
        <span className="font-mono text-xs text-slate-600">{row.nisn}</span>
      ),
    },
    {
      key: 'nama',
      header: 'Nama Lengkap',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <StudentAvatar nama={row.nama} photo_url={row.photo_url} />
          <div>
            <p className="font-medium text-slate-800 text-sm">{row.nama}</p>
            <p className="text-xs text-slate-400 font-mono">{row.nisn}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'gender',
      header: 'Jenis Kelamin',
      align: 'center',
      width: '120px',
      render: (row) => (
        <Badge variant={row.gender === 'Laki-laki' ? 'blue' : 'orange'}>
          {row.gender === 'Laki-laki' ? 'Laki-laki' : 'Perempuan'}
        </Badge>
      ),
    },
    {
      key: 'tanggal_lahir',
      header: 'Tanggal Lahir',
      width: '130px',
      render: (row) => (
        <span className="text-slate-600">{formatTanggalLahir(row.tanggal_lahir)}</span>
      ),
    },
    {
      key: 'kelas',
      header: 'Kelas',
      width: '90px',
      align: 'center',
      render: (row) => (
        <span className="text-slate-700">{row.classes?.name ?? '—'}</span>
      ),
    },
    {
      key: 'juz_terakhir',
      header: 'Juz',
      width: '60px',
      align: 'center',
      render: (row) => (
        <Badge variant="green">Juz {row.juz_terakhir}</Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      width: '160px',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {onPrintOne && (
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<Printer size={13} />}
              onClick={(e) => { e.stopPropagation(); onPrintOne(row); }}
              aria-label={`Cetak ID Card ${row.nama}`}
              title="Cetak ID Card"
              className="text-amber-600 hover:bg-amber-50"
            >
              ID Card
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<Edit size={13} />}
            onClick={(e) => { e.stopPropagation(); onEdit(row); }}
            aria-label={`Edit ${row.nama}`}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<Trash2 size={13} />}
            onClick={(e) => { e.stopPropagation(); onDelete(row); }}
            aria-label={`Hapus ${row.nama}`}
            className="text-red-600 hover:bg-red-50"
          >
            Hapus
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full">
      {/* Select-all header row — shares the same card style as the DataTable wrapper */}
      {data.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border-x border-t border-slate-200 rounded-t-xl">
          <input
            type="checkbox"
            aria-label="Pilih semua siswa"
            checked={allSelected}
            ref={(el) => { if (el) el.indeterminate = someSelected; }}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
          />
          <span className="text-xs text-slate-500">
            {selectedIds.length > 0
              ? `${selectedIds.length} dari ${data.length} siswa dipilih`
              : 'Pilih semua'}
          </span>
          {selectedIds.length > 0 && (
            <button
              className="ml-auto flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-900 font-medium transition-colors"
              onClick={() => onSelectionChange([])}
            >
              Batalkan pilihan
            </button>
          )}
        </div>
      )}

      {/* When the select-all bar is shown, remove the top border+radius from the DataTable wrapper */}
      <div className={data.length > 0 ? '[&>div]:rounded-t-none [&>div]:border-t-0' : ''}>
        <DataTable<Santri>
          columns={columns}
          data={data}
          rowKey={(row) => row.id}
          loading={loading}
          skeletonRows={6}
          emptyMessage="Belum ada data siswa. Tambahkan siswa baru atau import dari Excel."
          rowClassName={(row) =>
            selectedIds.includes(row.id) ? 'bg-amber-50' : ''
          }
        />
      </div>
    </div>
  );
}
