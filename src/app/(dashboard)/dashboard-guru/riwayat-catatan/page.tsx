'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { useViewMode } from '@/hooks/useViewMode';
import {
  ArrowLeft, ClipboardList, Users, School, BookOpen,
  Activity, ChevronRight, CalendarDays, FileText, MessageSquareText,
  Trash2, SquareCheck, Square,
} from 'lucide-react';

interface KelasItem {
  id: string;
  name: string;
  jumlah_siswa: number;
}

interface SantriItem {
  id: string;
  nama: string;
  nisn: string;
  juz_terakhir: string;
}

interface CatatanItem {
  id: string;
  tanggal: string;
  type: 'hafalan' | 'tahsin';
  catatan: string;
  surah_juz?: string;
  halaman?: string;
  makhroj?: string;
  tajwid?: string;
  lancar?: string;
  buku?: string;
  metode?: string;
  kelancaran?: string;
  adab?: string;
  created_at?: string;
}

function SkeletonKelas() {
  return (
    <div className="animate-pulse space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-2xl p-5" style={{ background: 'white', border: '1px solid #f1f5f9' }}>
          <div className="h-5 w-40 rounded bg-slate-100 mb-2" />
          <div className="h-3 w-24 rounded bg-slate-50" />
        </div>
      ))}
    </div>
  );
}

function SkeletonSiswa() {
  return (
    <div className="animate-pulse space-y-2">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="rounded-xl p-4" style={{ background: 'white', border: '1px solid #f1f5f9' }}>
          <div className="h-4 w-36 rounded bg-slate-100 mb-1" />
          <div className="h-3 w-20 rounded bg-slate-50" />
        </div>
      ))}
    </div>
  );
}

function SkeletonCatatan() {
  return (
    <div className="animate-pulse space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-2xl p-5" style={{ background: 'white', border: '1px solid #f1f5f9' }}>
          <div className="flex gap-3 mb-3">
            <div className="h-6 w-16 rounded-full bg-slate-100" />
            <div className="h-4 w-32 rounded bg-slate-100" />
          </div>
          <div className="h-3 w-full rounded bg-slate-50 mb-2" />
          <div className="h-3 w-3/4 rounded bg-slate-50" />
        </div>
      ))}
    </div>
  );
}

function CatatanCard({ item, formatDate, selected, onToggle }: {
  item: CatatanItem;
  formatDate: (s: string) => string;
  selected?: boolean;
  onToggle?: () => void;
}) {
  const isHafalan = item.type === 'hafalan';
  return (
    <div className={`rounded-2xl p-5 transition-all duration-200 ${
      selected ? 'ring-2 ring-violet-400 bg-violet-50/50' : ''
    }`}
      style={{ background: selected ? undefined : 'white', border: selected ? '1px solid #c4b5fd' : '1px solid #f1f5f9', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
      <div className="flex items-start gap-3 mb-3">
        {onToggle && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="mt-1 shrink-0"
          >
            {selected
              ? <SquareCheck size={18} className="text-violet-500" />
              : <Square size={18} className="text-slate-300 hover:text-slate-400" />
            }
          </button>
        )}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isHafalan ? 'bg-emerald-100' : 'bg-amber-100'
          }`}>
          {isHafalan
            ? <BookOpen size={14} className="text-emerald-600" />
            : <Activity size={14} className="text-amber-600" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isHafalan
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
              }`}>
              {isHafalan ? 'Hafalan' : 'Tahsin'}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <CalendarDays size={10} />
              {formatDate(item.tanggal)}
            </span>
          </div>

          <div className="text-xs text-slate-500 space-y-0.5 mb-2">
            {isHafalan ? (
              <>
                <span className="font-medium text-slate-700">{item.surah_juz}</span>
                {item.halaman && <span> · Hal. {item.halaman}</span>}
                {item.buku && <span> · Buku {item.buku}</span>}
                <div className="flex gap-2 mt-1 flex-wrap">
                  {item.lancar && <span className="text-[10px] bg-slate-50 px-1.5 py-0.5 rounded">Lancar: {item.lancar}</span>}
                  {item.makhroj && <span className="text-[10px] bg-slate-50 px-1.5 py-0.5 rounded">Makhraj: {item.makhroj}</span>}
                  {item.tajwid && <span className="text-[10px] bg-slate-50 px-1.5 py-0.5 rounded">Tajwid: {item.tajwid}</span>}
                </div>
              </>
            ) : (
              <>
                <span className="font-medium text-slate-700">{item.metode || 'Tahsin'}</span>
                {item.buku && <span> · Buku {item.buku}</span>}
                {item.halaman && <span> · Hal. {item.halaman}</span>}
                <div className="flex gap-2 mt-1 flex-wrap">
                  {item.kelancaran && <span className="text-[10px] bg-slate-50 px-1.5 py-0.5 rounded">Kelancaran: {item.kelancaran}</span>}
                  {item.makhroj && <span className="text-[10px] bg-slate-50 px-1.5 py-0.5 rounded">Makhraj: {item.makhroj}</span>}
                  {item.adab && <span className="text-[10px] bg-slate-50 px-1.5 py-0.5 rounded">Adab: {item.adab}</span>}
                </div>
              </>
            )}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-50">
            <p className="text-xs flex items-start gap-1.5">
              <FileText size={11} className="text-slate-400 mt-0.5 shrink-0" />
              <span className="text-slate-600 italic leading-relaxed">{item.catatan}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailCatatan({ siswa, catatanList, loading, formatDate, selectedIds, onToggle, onSelectAll, onDeleteSelected, deleting }: {
  siswa: SantriItem;
  catatanList: CatatanItem[];
  loading: boolean;
  formatDate: (s: string) => string;
  selectedIds: Set<string>;
  onToggle: (key: string) => void;
  onSelectAll: (items: CatatanItem[]) => void;
  onDeleteSelected: () => void;
  deleting: boolean;
}) {
  const hafalanList = catatanList.filter(item => item.type === 'hafalan');
  const tahsinList = catatanList.filter(item => item.type === 'tahsin');

  const hasSelection = selectedIds.size > 0;

  const renderColumn = (title: string, icon: React.ReactNode, accent: string, items: CatatanItem[]) => {
    const allSelected = items.length > 0 && items.every(item => selectedIds.has(`${item.type}::${item.id}`));
    return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-1.5 py-0.5 rounded-full">{items.length} catatan</span>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => onSelectAll(items)}
            className="ml-auto flex items-center gap-1 text-[10px] text-slate-400 hover:text-violet-600 transition-colors"
          >
            {allSelected
              ? <SquareCheck size={12} className="text-violet-500" />
              : <Square size={12} />
            }
            {allSelected ? 'Batal Pilih' : 'Pilih Semua'}
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: 'white', border: `1px solid ${accent}` }}>
          <MessageSquareText size={28} className="text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Belum ada catatan {title.toLowerCase()}</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[calc(100vh-18rem)] overflow-y-auto pr-1">
          {items.map(item => {
            const key = `${item.type}::${item.id}`;
            return (
              <CatatanCard
                key={key}
                item={item}
                formatDate={formatDate}
                selected={selectedIds.has(key)}
                onToggle={() => onToggle(key)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
  };

  return (
    <div className="flex-1 min-w-0">
      <div className="rounded-2xl p-5 mb-4 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 60%, #fdf2f8 100%)', boxShadow: '0 4px 20px rgba(168,85,247,0.12)' }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-200 to-violet-100 flex items-center justify-center shrink-0 border border-violet-300/40">
            <span className="text-lg font-bold text-violet-700">
              {siswa.nama.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-base font-bold text-slate-900">{siswa.nama}</p>
            <p className="text-xs text-slate-500">{siswa.nisn}</p>
          </div>
        </div>
      </div>

      {loading ? <SkeletonCatatan /> : catatanList.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: 'white', border: '1px solid #f1f5f9' }}>
          <MessageSquareText size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Belum ada catatan untuk siswa ini</p>
        </div>
      ) : (
        <>
          {hasSelection && (
            <div className="flex items-center gap-3 rounded-xl bg-violet-50 border border-violet-200 px-4 py-2.5 mb-4">
              <SquareCheck size={16} className="text-violet-500" />
              <span className="text-sm font-medium text-violet-700">{selectedIds.size} catatan dipilih</span>
              <button
                type="button"
                onClick={onDeleteSelected}
                disabled={deleting}
                className="ml-auto flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                <Trash2 size={13} />
                {deleting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {renderColumn(
              'Catatan Hafalan',
              <BookOpen size={15} className="text-emerald-600" />,
              '#d1fae5',
              hafalanList
            )}
            {renderColumn(
              'Catatan Tahsin',
              <Activity size={15} className="text-amber-600" />,
              '#fef3c7',
              tahsinList
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function RiwayatCatatanPage() {
  const { viewAsTeacherId } = useViewMode();
  const viewHeaders = useMemo(() => {
    const h: Record<string, string> = {};
    h['x-view-mode'] = 'teaching';
    if (viewAsTeacherId) h['x-view-as-teacher-id'] = viewAsTeacherId;
    return h;
  }, [viewAsTeacherId]);

  const [kelasList, setKelasList] = useState<KelasItem[]>([]);
  const [siswaList, setSiswaList] = useState<SantriItem[]>([]);
  const [catatanList, setCatatanList] = useState<CatatanItem[]>([]);
  const [selectedKelas, setSelectedKelas] = useState<KelasItem | null>(null);
  const [selectedSiswa, setSelectedSiswa] = useState<SantriItem | null>(null);
  const [loadingKelas, setLoadingKelas] = useState(true);
  const [loadingSiswa, setLoadingSiswa] = useState(false);
  const [loadingCatatan, setLoadingCatatan] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch('/api/riwayat-catatan/classes', { headers: viewHeaders })
      .then(r => r.json())
      .then(d => setKelasList(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingKelas(false));
  }, [viewHeaders]);

  const selectKelas = async (kelas: KelasItem) => {
    setSelectedKelas(kelas);
    setSelectedSiswa(null);
    setCatatanList([]);
    setLoadingSiswa(true);
    try {
      const res = await fetch(`/api/riwayat-catatan/students?class_id=${kelas.id}`, { headers: viewHeaders });
      const json = await res.json();
      setSiswaList(json.data ?? []);
    } catch { /* ignore */ }
    finally { setLoadingSiswa(false); }
  };

  const selectSiswa = async (siswa: SantriItem) => {
    setSelectedSiswa(siswa);
    setCatatanList([]);
    setSelectedIds(new Set());
    setLoadingCatatan(true);
    try {
      const res = await fetch(`/api/riwayat-catatan/notes?student_id=${siswa.id}`, { headers: viewHeaders });
      const json = await res.json();
      setCatatanList(json.data ?? []);
    } catch { /* ignore */ }
    finally { setLoadingCatatan(false); }
  };

  const goBackToKelas = () => {
    setSelectedKelas(null);
    setSelectedSiswa(null);
    setSiswaList([]);
    setCatatanList([]);
    setSelectedIds(new Set());
  };

  const handleToggle = (key: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSelectAll = (items: CatatanItem[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const allSelected = items.every(item => next.has(`${item.type}::${item.id}`));
      if (allSelected) {
        items.forEach(item => next.delete(`${item.type}::${item.id}`));
      } else {
        items.forEach(item => next.add(`${item.type}::${item.id}`));
      }
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Yakin ingin menghapus ${selectedIds.size} catatan yang dipilih? Tindakan ini tidak dapat dibatalkan.`)) return;

    setDeleting(true);
    try {
      const items = Array.from(selectedIds).map(key => {
        const sep = key.indexOf('::');
        const type = key.substring(0, sep);
        const id = key.substring(sep + 2);
        return { type: type as 'hafalan' | 'tahsin', id };
      });

      const res = await fetch('/api/riwayat-catatan/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      const json = await res.json();
      if (!res.ok) {
        alert(json.message ?? 'Gagal menghapus catatan.');
        return;
      }

      setCatatanList(prev => prev.filter(item => !selectedIds.has(`${item.type}::${item.id}`)));
      setSelectedIds(new Set());
    } catch {
      alert('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="rounded-2xl p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 60%, #faf5ff 100%)', boxShadow: '0 8px 32px rgba(139,92,246,0.15)' }}>
        <div className="absolute right-6 top-0 bottom-0 flex items-center select-none pointer-events-none">
          <span className="text-violet-400/[0.06] font-serif leading-none" style={{ fontSize: '8rem' }}>&#1757;</span>
        </div>
        <div className="relative z-10">
          <p className="text-slate-500 text-sm mb-1">Dashboard Guru</p>
          <h1 className="text-2xl font-bold text-slate-900 mb-0.5 flex items-center gap-3">
            <ClipboardList size={24} className="text-violet-500" />
            Riwayat Catatan
          </h1>
          <p className="text-slate-600 text-sm">Lihat catatan hafalan &amp; tahsin siswa yang Anda ampukan</p>
        </div>
      </div>

      {!selectedKelas ? (
        <>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <School size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Pilih Kelas</p>
              <p className="text-xs text-slate-400">Kelas yang Anda ampukan</p>
            </div>
          </div>

          {loadingKelas ? <SkeletonKelas /> : kelasList.length === 0 ? (
            <div className="rounded-2xl p-12 text-center" style={{ background: 'white', border: '1px solid #f1f5f9' }}>
              <School size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Belum ada kelas yang diampu</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {kelasList.map(k => (
                <button
                  key={k.id}
                  onClick={() => selectKelas(k)}
                  className="group rounded-2xl p-5 text-left transition-all duration-200 hover:-translate-y-0.5"
                  style={{ background: 'white', border: '1px solid #f1f5f9', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                        <School size={18} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 group-hover:text-violet-700 transition-colors">
                          {k.name}
                        </p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Users size={11} />
                          {k.jumlah_siswa} siswa
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-violet-400 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="flex gap-5">
          <div className="w-[280px] shrink-0">
            <button
              onClick={goBackToKelas}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors mb-4"
            >
              <ArrowLeft size={14} />
              Kembali ke kelas
            </button>

            <div className="rounded-2xl p-4 mb-4"
              style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 60%, #f5f3ff 100%)', boxShadow: '0 4px 20px rgba(99,102,241,0.12)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  <School size={18} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{selectedKelas.name}</p>
                  <p className="text-[11px] text-slate-500">{siswaList.length} siswa</p>
                </div>
              </div>
            </div>

            {loadingSiswa ? <SkeletonSiswa /> : siswaList.length === 0 ? (
              <div className="rounded-2xl p-8 text-center" style={{ background: 'white', border: '1px solid #f1f5f9' }}>
                <Users size={32} className="text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Tidak ada siswa</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-[calc(100vh-18rem)] overflow-y-auto pr-1">
                {siswaList.map(s => (
                  <button
                    key={s.id}
                    onClick={() => selectSiswa(s)}
                    className={`w-full rounded-xl p-3 text-left transition-all duration-200 ${
                      selectedSiswa?.id === s.id
                        ? 'bg-violet-50 border border-violet-200 shadow-sm'
                        : 'bg-white border border-transparent hover:bg-slate-50 hover:border-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border text-xs font-bold ${
                        selectedSiswa?.id === s.id
                          ? 'bg-violet-200 border-violet-300 text-violet-700'
                          : 'bg-gradient-to-br from-violet-100 to-violet-50 border-violet-200/50 text-violet-600'
                      }`}>
                        {s.nama.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${
                          selectedSiswa?.id === s.id ? 'text-violet-800' : 'text-slate-800'
                        }`}>
                          {s.nama}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{s.nisn}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedSiswa ? (
            <DetailCatatan
              siswa={selectedSiswa}
              catatanList={catatanList}
              loading={loadingCatatan}
              formatDate={formatDate}
              selectedIds={selectedIds}
              onToggle={handleToggle}
              onSelectAll={handleSelectAll}
              onDeleteSelected={handleDeleteSelected}
              deleting={deleting}
            />
          ) : (
            <div className="flex-1 min-w-0 flex items-center justify-center">
              <div className="text-center">
                <MessageSquareText size={48} className="text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Pilih siswa untuk melihat catatan</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
