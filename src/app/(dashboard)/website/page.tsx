'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { Globe, BookOpen, Calendar, Images, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Save, Menu as MenuIcon, GripVertical } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import ImageUpload from '@/components/shared/ImageUpload';
import { useToast } from '@/lib/toast';

// ── Types ────────────────────────────────────────────────────────────────────
interface Profil {
  id?: string; nama_lembaga: string; deskripsi: string; visi: string;
  misi: string[]; logo_url: string; logo_sekolah_url: string; nama_sekolah: string;
  alamat: string; email: string;
  telepon: string; instagram: string; facebook: string; youtube: string;
}
interface Program { id: string; nama: string; deskripsi: string; icon: string; urutan: number; is_active: boolean; }
interface Agenda { id: string; judul: string; deskripsi: string; tanggal: string; waktu_mulai: string; waktu_selesai: string; lokasi: string; is_published: boolean; }
interface GaleriItem { id: string; judul: string; deskripsi?: string; foto_url: string; urutan: number; is_published: boolean; }
interface NavigationItem { id: string; label: string; href: string; urutan: number; is_active: boolean; }

const EMPTY_PROFIL: Profil = { nama_lembaga: '', deskripsi: '', visi: '', misi: [], logo_url: '', logo_sekolah_url: '', nama_sekolah: '', alamat: '', email: '', telepon: '', instagram: '', facebook: '', youtube: '' };
const EMPTY_PROGRAM: Omit<Program, 'id'> = { nama: '', deskripsi: '', icon: 'BookOpen', urutan: 0, is_active: true };
const EMPTY_AGENDA: Omit<Agenda, 'id'> = { judul: '', deskripsi: '', tanggal: '', waktu_mulai: '', waktu_selesai: '', lokasi: '', is_published: true };

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WebsitePage() {
  const [tab, setTab] = useState<'profil' | 'program' | 'agenda' | 'galeri' | 'menu'>('profil');
  const { toast } = useToast();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="rounded-3xl bg-white/90 shadow-sm ring-1 ring-slate-200/80 p-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Globe size={22} className="text-emerald-600" /> Kelola Website
          </h1>
          <p className="text-slate-500 text-sm mt-1">Atur semua konten yang tampil di halaman publik website.</p>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-0 overflow-x-auto sm:overflow-visible">
          {([
            { id: 'profil', label: 'Profil & Visi Misi', icon: Globe },
            { id: 'program', label: 'Program', icon: BookOpen },
            { id: 'agenda', label: 'Agenda', icon: Calendar },
            { id: 'galeri', label: 'Galeri', icon: Images },
            { id: 'menu', label: 'Navigasi Menu', icon: MenuIcon },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                tab === id
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {tab === 'profil' && <ProfilTab toast={toast} />}
        {tab === 'program' && <ProgramTab toast={toast} />}
        {tab === 'agenda' && <AgendaTab toast={toast} />}
        {tab === 'galeri' && <GaleriTab toast={toast} />}
        {tab === 'menu' && <MenuTab toast={toast} />}
      </div>
    </div>
  );
}

// ── Tab Profil ────────────────────────────────────────────────────────────────
function ProfilTab({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const [profil, setProfil] = useState<Profil>(EMPTY_PROFIL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoSaving, setLogoSaving] = useState<'logo_url' | 'logo_sekolah_url' | null>(null);
  const [newMisi, setNewMisi] = useState('');
  // Ref untuk akses profil terbaru tanpa stale closure
  const profilRef = React.useRef(profil);
  profilRef.current = profil;

  const fetchProfil = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/website/profil?t=${Date.now()}`, { cache: 'no-store' });
      const j = await res.json();
      if (j.data) {
        setProfil({ ...EMPTY_PROFIL, ...j.data, misi: j.data.misi ?? [] });
      }
    } catch (err) {
      console.error('[fetchProfil]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfil(); }, [fetchProfil]);

  const set = (k: keyof Profil, v: string) => setProfil(p => ({ ...p, [k]: v }));

  const addMisi = () => {
    if (!newMisi.trim()) return;
    setProfil(p => ({ ...p, misi: [...p.misi, newMisi.trim()] }));
    setNewMisi('');
  };
  const removeMisi = (i: number) => setProfil(p => ({ ...p, misi: p.misi.filter((_, idx) => idx !== i) }));

  // Auto-save logo segera setelah upload berhasil
  const handleLogoUpload = async (field: 'logo_url' | 'logo_sekolah_url', url: string) => {
    // Update state lokal dulu
    setProfil(p => ({ ...p, [field]: url }));
    setLogoSaving(field);
    try {
      // Kirim HANYA field logo yang berubah — tidak bergantung pada profilRef
      const res = await fetch('/api/website/profil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: url }),
      });
      const j = await res.json();
      if (res.ok) {
        toast.success(field === 'logo_url' ? 'Logo Tim berhasil disimpan ✓' : 'Logo Sekolah berhasil disimpan ✓');
        // Refresh data dari server untuk sinkronisasi
        const r2 = await fetch(`/api/website/profil?t=${Date.now()}`, { cache: 'no-store' });
        const j2 = await r2.json();
        if (j2.data) setProfil({ ...EMPTY_PROFIL, ...j2.data, misi: j2.data.misi ?? [] });
      } else {
        toast.error(j.message || 'Gagal menyimpan logo.');
      }
    } catch (err) {
      console.error('[handleLogoUpload]', err);
      toast.error('Gagal menyimpan logo. Klik "Simpan Perubahan" untuk mencoba lagi.');
    } finally {
      setLogoSaving(null);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/website/profil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profil),
      });
      const j = await res.json();
      if (res.ok) {
        toast.success('Profil berhasil disimpan! ✓');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        await fetchProfil();
      } else {
        toast.error(j.message || 'Gagal menyimpan profil.');
      }
    } catch (err) {
      console.error('[saveProfil]', err);
      toast.error('Terjadi kesalahan. Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="space-y-6 max-w-3xl">
      {/* Animated skeleton */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-6">
          <div className="aspect-square max-w-[160px] bg-slate-200 rounded-xl animate-pulse" />
          <div className="space-y-3">
            <div className="aspect-square max-w-[160px] bg-slate-200 rounded-xl animate-pulse" />
            <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="h-5 w-24 bg-slate-200 rounded animate-pulse mb-4" />
        <div className="h-24 bg-slate-100 rounded-lg animate-pulse" />
      </div>
      <div className="flex justify-end">
        <div className="h-10 w-36 bg-slate-200 rounded-lg animate-pulse" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">

      {/* ── Preview Logo ── */}
      {(profil.logo_url || profil.logo_sekolah_url) && (
        <div className="bg-emerald-950 rounded-xl p-5">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-4">Preview Navbar</p>
          <div className="flex items-center gap-3">
            {profil.logo_url ? (
              <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-emerald-400/30 shrink-0">
                <Image src={profil.logo_url} alt="Logo Tim" fill className="object-cover" sizes="40px" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                <BookOpen size={18} className="text-emerald-400" />
              </div>
            )}
            <span className="font-bold text-white text-base">{profil.nama_lembaga || "Tim Qur'an"}</span>
          </div>
          {profil.logo_sekolah_url && (
            <>
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mt-5 mb-3">Preview ID Card (Header)</p>
              <div className="flex items-center gap-3 bg-emerald-800/40 rounded-lg px-4 py-3">
                <div className="relative w-8 h-8 rounded-md overflow-hidden bg-white/90 p-0.5 shrink-0">
                  <Image src={profil.logo_sekolah_url} alt="Logo Sekolah" fill className="object-contain" sizes="32px" />
                </div>
                <div className="flex-1 text-center">
                  <p className="text-white text-[10px] font-bold uppercase tracking-wide">{profil.nama_sekolah || 'Nama Sekolah'}</p>
                  <p className="text-emerald-300/70 text-[9px]">{profil.nama_lembaga || "Tim Qur'an"}</p>
                </div>
                <div className="relative w-8 h-8 rounded-md overflow-hidden bg-white/90 p-0.5 shrink-0">
                  {profil.logo_url
                    ? <Image src={profil.logo_url} alt="Logo Tim" fill className="object-contain" sizes="32px" />
                    : <div className="w-full h-full flex items-center justify-center"><BookOpen size={14} className="text-emerald-600" /></div>
                  }
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Informasi Dasar</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
          {/* Upload logo Tim Qur'an */}
          <div className="space-y-1">
            <ImageUpload
              label="Logo Tim Qur'an"
              value={profil.logo_url || null}
              onUpload={(url) => handleLogoUpload('logo_url', url)}
              bucket="assets" folder="logo" shape="square"
              helperText={logoSaving === 'logo_url' ? '⏳ Menyimpan...' : 'Tersimpan otomatis setelah upload'}
            />
          </div>
          {/* Upload logo sekolah */}
          <div className="space-y-1">
            <ImageUpload
              label="Logo Sekolah / Yayasan"
              value={profil.logo_sekolah_url || null}
              onUpload={(url) => handleLogoUpload('logo_sekolah_url', url)}
              bucket="assets" folder="logo" shape="square"
              helperText={logoSaving === 'logo_sekolah_url' ? '⏳ Menyimpan...' : 'Tersimpan otomatis setelah upload'}
            />
            <Input
              label="Nama Sekolah / Yayasan"
              value={profil.nama_sekolah}
              onChange={e => set('nama_sekolah', e.target.value)}
              placeholder="Contoh: SD Islam Al-Hikmah"
              helperText="Tampil di footer ID Card"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nama Lembaga / Tim" value={profil.nama_lembaga} onChange={e => set('nama_lembaga', e.target.value)} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Deskripsi</label>
            <textarea rows={3} value={profil.deskripsi} onChange={e => set('deskripsi', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Visi</h2>
        <textarea rows={3} value={profil.visi} onChange={e => set('visi', e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          placeholder="Tuliskan visi lembaga..." />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Misi</h2>
        <div className="space-y-2">
          {profil.misi.map((m, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
              <p className="flex-1 text-sm text-slate-700">{m}</p>
              <button onClick={() => removeMisi(i)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newMisi} onChange={e => setNewMisi(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addMisi()}
            placeholder="Tambah poin misi baru..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <Button variant="secondary" size="sm" onClick={addMisi}><Plus size={15} /></Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Kontak & Media Sosial</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Alamat" value={profil.alamat} onChange={e => set('alamat', e.target.value)} />
          <Input label="Email" type="email" value={profil.email} onChange={e => set('email', e.target.value)} />
          <Input label="Telepon" value={profil.telepon} onChange={e => set('telepon', e.target.value)} />
          <Input label="Facebook" value={profil.facebook} onChange={e => set('facebook', e.target.value)} placeholder="Link halaman atau username" />
          <Input label="Instagram" value={profil.instagram} onChange={e => set('instagram', e.target.value)} placeholder="@username" />
          <Input label="YouTube" value={profil.youtube} onChange={e => set('youtube', e.target.value)} placeholder="Link channel" />
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="primary" loading={saving} leftIcon={<Save size={16} />} onClick={save}>Simpan Perubahan</Button>
      </div>
    </div>
  );
}

// ── Tab Program ───────────────────────────────────────────────────────────────
function ProgramTab({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Program | null>(null);
  const [form, setForm] = useState<typeof EMPTY_PROGRAM>(EMPTY_PROGRAM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/website/program?all=true');
    const j = await r.json();
    setPrograms(j.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);

  const openAdd = () => { setEditItem(null); setForm(EMPTY_PROGRAM); setModalOpen(true); };
  const openEdit = (p: Program) => { setEditItem(p); setForm({ nama: p.nama, deskripsi: p.deskripsi, icon: p.icon, urutan: p.urutan, is_active: p.is_active }); setModalOpen(true); };

  const save = async () => {
    if (!form.nama.trim()) { toast.error('Nama program wajib diisi.'); return; }
    setSaving(true);
    try {
      const body = editItem ? { id: editItem.id, ...form } : form;
      const res = await fetch('/api/website/program', { method: editItem ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await res.json();
      if (res.ok) { toast.success(j.message); setModalOpen(false); fetchPrograms(); }
      else toast.error(j.message);
    } catch { toast.error('Terjadi kesalahan.'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const res = await fetch('/api/website/program', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget.id }) });
    const j = await res.json();
    if (res.ok) { toast.success(j.message); setDeleteTarget(null); fetchPrograms(); }
    else toast.error(j.message);
    setDeleteLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" leftIcon={<Plus size={15} />} onClick={openAdd}>Tambah Program</Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-slate-50 border-b border-slate-200 text-left">
            <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Urutan</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Nama</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase hidden md:table-cell">Deskripsi</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase text-right">Aksi</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? [...Array(3)].map((_, i) => <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-5 bg-slate-200 rounded animate-pulse" /></td></tr>)
            : programs.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">Belum ada program.</td></tr>
            : programs.map(p => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-500">{p.urutan}</td>
                <td className="px-4 py-3 font-medium text-slate-800 text-sm">{p.nama}</td>
                <td className="px-4 py-3 text-sm text-slate-500 hidden md:table-cell max-w-xs truncate">{p.deskripsi}</td>
                <td className="px-4 py-3"><Badge variant={p.is_active ? 'green' : 'red'}>{p.is_active ? 'Aktif' : 'Nonaktif'}</Badge></td>
                <td className="px-4 py-3"><div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" leftIcon={<Pencil size={13} />} onClick={() => openEdit(p)}>Edit</Button>
                  <Button variant="ghost" size="sm" leftIcon={<Trash2 size={13} />} onClick={() => setDeleteTarget(p)} className="text-red-600 hover:bg-red-50">Hapus</Button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => !saving && setModalOpen(false)} title={editItem ? 'Edit Program' : 'Tambah Program'} size="md">
        <div className="space-y-4">
          <Input label="Nama Program" value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} required />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Deskripsi</label>
            <textarea rows={3} value={form.deskripsi} onChange={e => setForm(f => ({ ...f, deskripsi: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Icon" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} helperText="BookOpen, Star, Users, Mic" />
            <Input label="Urutan" type="number" value={String(form.urutan)} onChange={e => setForm(f => ({ ...f, urutan: parseInt(e.target.value) || 0 }))} />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}>
              {form.is_active ? <ToggleRight size={28} className="text-emerald-600" /> : <ToggleLeft size={28} className="text-slate-400" />}
            </button>
            <span className="text-sm text-slate-700">Program aktif (tampil di website)</span>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Batal</Button>
            <Button variant="primary" loading={saving} onClick={save}>Simpan</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => !deleteLoading && setDeleteTarget(null)} onConfirm={confirmDelete}
        title="Hapus Program" message={`Hapus program "${deleteTarget?.nama}"?`} confirmLabel="Hapus" loading={deleteLoading} />
    </div>
  );
}

// ── Tab Agenda ────────────────────────────────────────────────────────────────
function AgendaTab({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Agenda | null>(null);
  const [form, setForm] = useState<typeof EMPTY_AGENDA>(EMPTY_AGENDA);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Agenda | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchAgendas = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/website/agenda?all=true');
    const j = await r.json();
    setAgendas(j.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAgendas(); }, [fetchAgendas]);

  const openAdd = () => { setEditItem(null); setForm(EMPTY_AGENDA); setModalOpen(true); };
  const openEdit = (a: Agenda) => { setEditItem(a); setForm({ judul: a.judul, deskripsi: a.deskripsi, tanggal: a.tanggal, waktu_mulai: a.waktu_mulai || '', waktu_selesai: a.waktu_selesai || '', lokasi: a.lokasi || '', is_published: a.is_published }); setModalOpen(true); };

  const save = async () => {
    if (!form.judul.trim()) { toast.error('Judul wajib diisi.'); return; }
    if (!form.tanggal) { toast.error('Tanggal wajib diisi.'); return; }
    setSaving(true);
    try {
      const body = editItem ? { id: editItem.id, ...form } : form;
      const res = await fetch('/api/website/agenda', { method: editItem ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await res.json();
      if (res.ok) { toast.success(j.message); setModalOpen(false); fetchAgendas(); }
      else toast.error(j.message);
    } catch { toast.error('Terjadi kesalahan.'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const res = await fetch('/api/website/agenda', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget.id }) });
    const j = await res.json();
    if (res.ok) { toast.success(j.message); setDeleteTarget(null); fetchAgendas(); }
    else toast.error(j.message);
    setDeleteLoading(false);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" leftIcon={<Plus size={15} />} onClick={openAdd}>Tambah Agenda</Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-slate-50 border-b border-slate-200 text-left">
            <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Tanggal</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Judul</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase hidden md:table-cell">Lokasi</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
            <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase text-right">Aksi</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? [...Array(3)].map((_, i) => <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-5 bg-slate-200 rounded animate-pulse" /></td></tr>)
            : agendas.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">Belum ada agenda.</td></tr>
            : agendas.map(a => {
              const isPast = a.tanggal < today;
              return (
                <tr key={a.id} className={`hover:bg-slate-50 ${isPast ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 text-sm text-slate-700 font-medium whitespace-nowrap">
                    {new Date(a.tanggal).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })}
                    {isPast && <span className="ml-2 text-xs text-slate-400">(lewat)</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-800 font-medium">{a.judul}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 hidden md:table-cell">{a.lokasi || '—'}</td>
                  <td className="px-4 py-3"><Badge variant={a.is_published ? 'green' : 'red'}>{a.is_published ? 'Publik' : 'Draft'}</Badge></td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" leftIcon={<Pencil size={13} />} onClick={() => openEdit(a)}>Edit</Button>
                    <Button variant="ghost" size="sm" leftIcon={<Trash2 size={13} />} onClick={() => setDeleteTarget(a)} className="text-red-600 hover:bg-red-50">Hapus</Button>
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => !saving && setModalOpen(false)} title={editItem ? 'Edit Agenda' : 'Tambah Agenda'} size="md">
        <div className="space-y-4">
          <Input label="Judul Agenda" value={form.judul} onChange={e => setForm(f => ({ ...f, judul: e.target.value }))} required />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Deskripsi</label>
            <textarea rows={2} value={form.deskripsi} onChange={e => setForm(f => ({ ...f, deskripsi: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Tanggal" type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} required />
            <Input label="Waktu Mulai" type="time" value={form.waktu_mulai} onChange={e => setForm(f => ({ ...f, waktu_mulai: e.target.value }))} />
            <Input label="Waktu Selesai" type="time" value={form.waktu_selesai} onChange={e => setForm(f => ({ ...f, waktu_selesai: e.target.value }))} />
          </div>
          <Input label="Lokasi" value={form.lokasi} onChange={e => setForm(f => ({ ...f, lokasi: e.target.value }))} placeholder="Nama tempat / link online" />
          <div className="flex items-center gap-3">
            <button onClick={() => setForm(f => ({ ...f, is_published: !f.is_published }))}>
              {form.is_published ? <ToggleRight size={28} className="text-emerald-600" /> : <ToggleLeft size={28} className="text-slate-400" />}
            </button>
            <span className="text-sm text-slate-700">Tampilkan di website publik</span>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Batal</Button>
            <Button variant="primary" loading={saving} onClick={save}>Simpan</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => !deleteLoading && setDeleteTarget(null)} onConfirm={confirmDelete}
        title="Hapus Agenda" message={`Hapus agenda "${deleteTarget?.judul}"?`} confirmLabel="Hapus" loading={deleteLoading} />
    </div>
  );
}

// ── Tab Galeri ────────────────────────────────────────────────────────────────
function GaleriTab({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const [items, setItems] = useState<GaleriItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<GaleriItem | null>(null);
  const [form, setForm] = useState({ judul: '', deskripsi: '', foto_url: '', urutan: 0, is_published: true });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GaleriItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchGaleri = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/website/galeri?all=true');
    const j = await r.json();
    setItems(j.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchGaleri(); }, [fetchGaleri]);

  const openAdd = () => { setEditItem(null); setForm({ judul: '', deskripsi: '', foto_url: '', urutan: 0, is_published: true }); setModalOpen(true); };
  const openEdit = (item: GaleriItem) => { setEditItem(item); setForm({ judul: item.judul, deskripsi: item.deskripsi ?? '', foto_url: item.foto_url, urutan: item.urutan, is_published: item.is_published }); setModalOpen(true); };

  const save = async () => {
    if (!form.judul.trim()) { toast.error('Judul wajib diisi.'); return; }
    if (!form.foto_url) { toast.error('Foto wajib diupload.'); return; }
    setSaving(true);
    try {
      const body = editItem ? { id: editItem.id, ...form } : form;
      const res = await fetch('/api/website/galeri', { method: editItem ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await res.json();
      if (res.ok) { toast.success(j.message); setModalOpen(false); fetchGaleri(); }
      else toast.error(j.message);
    } catch { toast.error('Terjadi kesalahan.'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const res = await fetch('/api/website/galeri', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget.id }) });
    const j = await res.json();
    if (res.ok) { toast.success(j.message); setDeleteTarget(null); fetchGaleri(); }
    else toast.error(j.message);
    setDeleteLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" leftIcon={<Plus size={15} />} onClick={openAdd}>Tambah Foto</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="aspect-square bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm">Belum ada foto galeri.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.id} className="group relative rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
              <div className="aspect-square relative">
                <Image src={item.foto_url} alt={item.judul} fill className="object-cover" sizes="(max-width:640px) 50vw, 33vw" />
                {!item.is_published && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white text-xs font-medium bg-black/60 px-2 py-1 rounded">Draft</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-slate-800 truncate">{item.judul}</p>
                {item.deskripsi && <p className="text-xs text-slate-500 truncate mt-0.5">{item.deskripsi}</p>}
              </div>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(item)} className="p-1.5 bg-white rounded-lg shadow text-slate-600 hover:text-blue-600"><Pencil size={13} /></button>
                <button onClick={() => setDeleteTarget(item)} className="p-1.5 bg-white rounded-lg shadow text-slate-600 hover:text-red-600"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => !saving && setModalOpen(false)} title={editItem ? 'Edit Foto' : 'Tambah Foto Galeri'} size="md">
        <div className="space-y-4">
          <ImageUpload
            label="Foto Kegiatan"
            value={form.foto_url || null}
            onUpload={(url) => setForm(f => ({ ...f, foto_url: url }))}
            bucket="assets" folder="galeri" shape="wide"
          />
          <Input label="Judul" value={form.judul} onChange={e => setForm(f => ({ ...f, judul: e.target.value }))} required />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Deskripsi (opsional)</label>
            <textarea rows={2} value={form.deskripsi} onChange={e => setForm(f => ({ ...f, deskripsi: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
          </div>
          <Input label="Urutan" type="number" value={String(form.urutan)} onChange={e => setForm(f => ({ ...f, urutan: parseInt(e.target.value) || 0 }))} />
          <div className="flex items-center gap-3">
            <button onClick={() => setForm(f => ({ ...f, is_published: !f.is_published }))}>
              {form.is_published ? <ToggleRight size={28} className="text-emerald-600" /> : <ToggleLeft size={28} className="text-slate-400" />}
            </button>
            <span className="text-sm text-slate-700">Tampilkan di website publik</span>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Batal</Button>
            <Button variant="primary" loading={saving} onClick={save}>Simpan</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => !deleteLoading && setDeleteTarget(null)} onConfirm={confirmDelete}
        title="Hapus Foto" message={`Hapus foto "${deleteTarget?.judul}"?`} confirmLabel="Hapus" loading={deleteLoading} />
    </div>
  );
}

// ── Tab Menu Navigasi ─────────────────────────────────────────────────────────
function MenuTab({ toast }: { toast: ReturnType<typeof useToast>['toast'] }) {
  const [items, setItems] = useState<NavigationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ label: '', href: '' });
  const [addOpen, setAddOpen] = useState(false);

  const fetchMenu = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/website/navigation');
      const json = await res.json();
      if (json.data) {
        setItems(json.data);
      }
    } catch (err) {
      console.error('[MenuTab] Failed to fetch:', err);
      toast.error('Gagal memuat menu.');
    }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { fetchMenu(); }, [fetchMenu]);

  const handleAddMenu = async () => {
    if (!form.label.trim() || !form.href.trim()) {
      toast.error('Label dan URL wajib diisi.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/website/navigation/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: form.label.trim(),
          href: form.href.trim(),
          urutan: Math.max(...items.map(i => i.urutan), 0) + 1,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success('Menu berhasil ditambahkan.');
        setForm({ label: '', href: '' });
        setAddOpen(false);
        fetchMenu();
      } else {
        toast.error(json.error || 'Gagal menambahkan menu.');
      }
    } catch (err) {
      console.error('[handleAddMenu]', err);
      toast.error('Terjadi kesalahan.');
    }
    finally { setSaving(false); }
  };

  const handleToggle = async (item: NavigationItem) => {
    setSaving(true);
    try {
      const res = await fetch('/api/website/navigation/manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ ...item, is_active: !item.is_active }],
        }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(item.is_active ? 'Menu disembunyikan.' : 'Menu ditampilkan.');
        fetchMenu();
      } else {
        toast.error(json.error || 'Gagal mengupdate.');
      }
    } catch (err) {
      console.error('[handleToggle]', err);
      toast.error('Terjadi kesalahan.');
    }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus menu item ini?')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/website/navigation/manage', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success('Menu berhasil dihapus.');
        fetchMenu();
      } else {
        toast.error(json.error || 'Gagal menghapus.');
      }
    } catch (err) {
      console.error('[handleDelete]', err);
      toast.error('Terjadi kesalahan.');
    }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" leftIcon={<Plus size={15} />} onClick={() => setAddOpen(true)}>Tambah Menu</Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-slate-200 rounded-lg animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-sm">Belum ada menu.</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y">
          {items.map((item) => (
            <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3 flex-1">
                <GripVertical size={18} className="text-slate-300 cursor-grab" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-500 font-mono">{item.href}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(item)}
                  disabled={saving}
                  className="p-1.5"
                >
                  {item.is_active ? (
                    <ToggleRight size={20} className="text-emerald-600" />
                  ) : (
                    <ToggleLeft size={20} className="text-slate-400" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={saving}
                  className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Tambah Menu" size="sm">
        <div className="space-y-4">
          <Input
            label="Label Menu"
            value={form.label}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            placeholder="Contoh: Berita"
            required
          />
          <Input
            label="URL"
            value={form.href}
            onChange={e => setForm(f => ({ ...f, href: e.target.value }))}
            placeholder="Contoh: /berita"
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setAddOpen(false)} disabled={saving}>Batal</Button>
            <Button variant="primary" loading={saving} onClick={handleAddMenu}>Tambah</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
