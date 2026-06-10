'use client';

// src/app/(dashboard)/tim/page.tsx
// Halaman Manajemen Tim Qur'an (Kabid Only)

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { cacheBust } from '@/lib/image';
import { toImageUrl } from '@/lib/storage/urls';
import { Plus, UserX, UserCheck, KeyRound, Camera, Shield, Trash2 } from 'lucide-react';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import ImageUpload from '@/components/shared/ImageUpload';
import { useToast } from '@/lib/toast';

// ─── Types ──────────────────────────────────────────────────────────────────

type TimRole = 'Tim_Quran' | 'Sekretaris' | 'Bendahara';

interface TimMember {
  id: string;
  name: string;
  email: string;
  role: TimRole;
  status: 'Aktif' | 'Nonaktif';
  created_at: string;
  photo_url?: string | null;
}

const ROLE_OPTIONS: { value: TimRole; label: string }[] = [
  { value: 'Tim_Quran',   label: "Tim Qur'an" },
  { value: 'Sekretaris',  label: 'Sekretaris' },
  { value: 'Bendahara',   label: 'Bendahara'  },
];

function getRoleVariant(role: TimRole): 'blue' | 'purple' | 'amber' {
  if (role === 'Sekretaris') return 'purple';
  if (role === 'Bendahara')  return 'amber';
  return 'blue';
}

function getRoleLabel(role: TimRole): string {
  if (role === 'Sekretaris') return 'Sekretaris';
  if (role === 'Bendahara')  return 'Bendahara';
  return "Tim Qur'an";
}

const getInitials = (name: string) =>
  name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

// ─── MemberAvatar ────────────────────────────────────────────────────────────

function MemberAvatar({ member, size = 40 }: { member: TimMember; size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full overflow-hidden ring-2 ring-slate-200 bg-indigo-100 flex items-center justify-center shrink-0"
    >
      {member.photo_url ? (
        <Image src={cacheBust(toImageUrl(member.photo_url)) || member.photo_url || ''} alt={member.name} width={size} height={size} className="object-cover w-full h-full" />
      ) : (
        <span className="text-indigo-700 font-semibold text-xs">{getInitials(member.name)}</span>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TimPage() {
  const { toast } = useToast();

  const [data, setData] = useState<TimMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Add modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'Tim_Quran' as TimRole });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Toggle status
  const [toggleTarget, setToggleTarget] = useState<TimMember | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  // Reset password
  const [resetTarget, setResetTarget] = useState<TimMember | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  // Delete member
  const [deleteTarget, setDeleteTarget] = useState<TimMember | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Remove role
  const [removeRoleTarget, setRemoveRoleTarget] = useState<TimMember | null>(null);
  const [removeRoleLoading, setRemoveRoleLoading] = useState(false);

  // Role change
  const [roleTarget, setRoleTarget] = useState<TimMember | null>(null);
  const [selectedRole, setSelectedRole] = useState<TimRole>('Tim_Quran');
  const [roleLoading, setRoleLoading] = useState(false);

  // Photo upload
  const [photoTarget, setPhotoTarget] = useState<TimMember | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchTimMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tim/list');
      const json = await res.json();
      if (!res.ok) { toast.error(json.message ?? "Gagal memuat data Tim Qur'an."); setData([]); }
      else          { setData(json.data ?? []); }
    } catch {
      toast.error("Terjadi kesalahan saat memuat data Tim Qur'an.");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchTimMembers(); }, [fetchTimMembers]);

  // ── Add member ───────────────────────────────────────────────────────────

  const handleOpenAdd = () => {
    setFormData({ name: '', email: '', password: '', role: 'Tim_Quran' });
    setAddError('');
    setAddModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, email, password, role } = formData;
    if (!name.trim())      { setAddError('Nama wajib diisi'); return; }
    if (!email.trim())     { setAddError('Email wajib diisi'); return; }
    if (!password.trim())  { setAddError('Kata sandi wajib diisi'); return; }
    if (password.length < 6) { setAddError('Kata sandi minimal 6 karakter'); return; }
    if (!role)             { setAddError('Role wajib dipilih'); return; }

    setAddLoading(true); setAddError('');
    try {
      const res = await fetch('/api/tim/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role }),
      });
      const json = await res.json();
      if (!res.ok) { setAddError(json.message ?? 'Gagal menambah anggota.'); return; }
      toast.success(json.message ?? "Anggota berhasil ditambahkan.");
      setAddModalOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'Tim_Quran' });
      fetchTimMembers();
    } catch { setAddError('Terjadi kesalahan. Coba lagi.'); }
    finally  { setAddLoading(false); }
  };

  // ── Toggle status ────────────────────────────────────────────────────────

  const handleConfirmToggle = async () => {
    if (!toggleTarget) return;
    setToggleLoading(true);
    try {
      const res = await fetch('/api/tim/toggle-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: toggleTarget.id }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.message ?? 'Gagal mengubah status.'); return; }
      toast.success(json.message ?? 'Status berhasil diubah.');
      setToggleTarget(null);
      fetchTimMembers();
    } catch { toast.error('Terjadi kesalahan saat mengubah status.'); }
    finally  { setToggleLoading(false); }
  };

  // ── Reset password ───────────────────────────────────────────────────────

  const handleConfirmReset = async () => {
    if (!resetTarget) return;
    setResetLoading(true);
    try {
      const res = await fetch('/api/tim/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: resetTarget.id }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.message ?? 'Gagal mengirim reset password.'); return; }
      toast.success(json.message ?? 'Email reset password berhasil dikirim.');
      setResetTarget(null);
    } catch { toast.error('Terjadi kesalahan saat mengirim reset password.'); }
    finally  { setResetLoading(false); }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/tim/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message ?? 'Gagal menghapus anggota.');
        return;
      }
      toast.success(json.message ?? 'Anggota berhasil dihapus.');
      setDeleteTarget(null);
      fetchTimMembers();
    } catch {
      toast.error('Terjadi kesalahan saat menghapus anggota.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleConfirmRemoveRole = async () => {
    if (!removeRoleTarget) return;
    setRemoveRoleLoading(true);
    try {
      const res = await fetch('/api/tim/update-role', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: removeRoleTarget.id, role: 'Tim_Quran' }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message ?? 'Gagal menghapus role.');
        return;
      }
      toast.success(json.message ?? 'Role berhasil dikembalikan ke Tim Qur\'an.');
      setRemoveRoleTarget(null);
      fetchTimMembers();
    } catch {
      toast.error('Terjadi kesalahan saat menghapus role.');
    } finally {
      setRemoveRoleLoading(false);
    }
  };

  // ── Role change ──────────────────────────────────────────────────────────

  const handleOpenRole = (member: TimMember) => {
    setRoleTarget(member);
    setSelectedRole(member.role);
  };

  const handleConfirmRole = async () => {
    if (!roleTarget) return;
    if (selectedRole === roleTarget.role) { setRoleTarget(null); return; }
    setRoleLoading(true);
    try {
      const res = await fetch('/api/tim/update-role', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: roleTarget.id, role: selectedRole }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.message ?? 'Gagal mengubah role.'); return; }
      toast.success(json.message ?? 'Role berhasil diubah.');
      setRoleTarget(null);
      fetchTimMembers();
    } catch { toast.error('Terjadi kesalahan saat mengubah role.'); }
    finally  { setRoleLoading(false); }
  };

  // ── Photo upload ─────────────────────────────────────────────────────────

  const handlePhotoUploaded = async (url: string) => {
    if (!photoTarget) return;
    setPhotoLoading(true);
    try {
      const res = await fetch('/api/tim/update-photo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: photoTarget.id, photo_url: url }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.message ?? 'Gagal memperbarui foto.'); return; }
      setData(prev => prev.map(m => m.id === photoTarget.id ? { ...m, photo_url: url } : m));
      setPhotoTarget(prev => prev ? { ...prev, photo_url: url } : prev);
      toast.success('Foto profil berhasil diperbarui.');
    } catch { toast.error('Terjadi kesalahan saat memperbarui foto.'); }
    finally  { setPhotoLoading(false); }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manajemen Tim Qur&apos;an</h1>
          <p className="text-sm text-slate-500 mt-0.5">Kelola akun anggota Tim Qur&apos;an yang dapat mengakses sistem.</p>
        </div>
        <Button variant="primary" leftIcon={<Plus size={15} />} onClick={handleOpenAdd}>
          Tambah Anggota
        </Button>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Foto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Nama</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider hidden md:table-cell">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><div className="w-10 h-10 bg-slate-200 rounded-full animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 bg-slate-200 rounded animate-pulse w-32" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><div className="h-5 bg-slate-200 rounded animate-pulse w-40" /></td>
                    <td className="px-4 py-3"><div className="h-6 bg-slate-200 rounded-full animate-pulse w-20" /></td>
                    <td className="px-4 py-3"><div className="h-6 bg-slate-200 rounded-full animate-pulse w-16" /></td>
                    <td className="px-4 py-3"><div className="h-8 bg-slate-200 rounded animate-pulse w-32 ml-auto" /></td>
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    Belum ada anggota Tim Qur&apos;an yang terdaftar.
                  </td>
                </tr>
              ) : (
                data.map(member => (
                  <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => setPhotoTarget(member)} className="group relative">
                        <MemberAvatar member={member} />
                        <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera size={12} className="text-white" />
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-slate-800">{member.name}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-slate-600">{member.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getRoleVariant(member.role)}>{getRoleLabel(member.role)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={member.status === 'Aktif' ? 'green' : 'red'}>{member.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <Button variant="ghost" size="sm" leftIcon={<Shield size={14} />}
                          onClick={() => handleOpenRole(member)}
                          className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                          Atur Role
                        </Button>
                        <Button variant="ghost" size="sm"
                          leftIcon={member.status === 'Aktif' ? <UserX size={14} /> : <UserCheck size={14} />}
                          onClick={() => setToggleTarget(member)}>
                          {member.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                        </Button>
                        {member.role !== 'Tim_Quran' && (
                          <Button variant="ghost" size="sm" leftIcon={<UserX size={14} />}
                            onClick={() => setRemoveRoleTarget(member)}
                            className="text-red-600 hover:bg-red-50">
                            Hapus Role
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" leftIcon={<KeyRound size={14} />}
                          onClick={() => setResetTarget(member)}>
                          Reset PW
                        </Button>
                        <Button variant="danger" size="sm" leftIcon={<Trash2 size={14} />}
                          onClick={() => setDeleteTarget(member)}>
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      {!loading && data.length > 0 && (
        <p className="text-xs text-slate-400 text-right">
          Total {data.length} anggota &bull;{' '}
          {data.filter(m => m.role === 'Sekretaris').length} Sekretaris &bull;{' '}
          {data.filter(m => m.role === 'Bendahara').length} Bendahara &bull;{' '}
          {data.filter(m => m.role === 'Tim_Quran').length} Tim Qur&apos;an
        </p>
      )}

      {/* ── Modal Tambah Anggota ─────────────────────────────────────────── */}
      <Modal open={addModalOpen} onClose={() => { if (!addLoading) setAddModalOpen(false); }}
        title="Tambah Anggota Tim Qur'an" size="md" closeOnBackdrop={!addLoading}>
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <Input label="Nama Lengkap" type="text" value={formData.name}
            onChange={e => { setFormData({ ...formData, name: e.target.value }); setAddError(''); }}
            placeholder="Contoh: Ahmad Fulan" disabled={addLoading} required autoFocus />
          <Input label="Email" type="email" value={formData.email}
            onChange={e => { setFormData({ ...formData, email: e.target.value }); setAddError(''); }}
            placeholder="Contoh: ahmad@example.com" disabled={addLoading} required />
          <Input label="Kata Sandi Awal" type="password" value={formData.password}
            onChange={e => { setFormData({ ...formData, password: e.target.value }); setAddError(''); }}
            placeholder="Minimal 6 karakter"
            helperText="Kata sandi awal untuk akun baru (minimal 6 karakter)"
            disabled={addLoading} required />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Role</label>
            <select
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value as TimRole })}
              disabled={addLoading}
              className="w-full rounded-lg border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {ROLE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          {addError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addError}</div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setAddModalOpen(false)} disabled={addLoading}>Batal</Button>
            <Button type="submit" variant="primary" loading={addLoading}>Simpan</Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal Atur Role ──────────────────────────────────────────────── */}
      <Modal open={Boolean(roleTarget)} onClose={() => { if (!roleLoading) setRoleTarget(null); }}
        title={`Atur Role — ${roleTarget?.name ?? ''}`} size="sm" closeOnBackdrop={!roleLoading}>
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Pilih role untuk <strong>{roleTarget?.name}</strong>. Role menentukan jabatan dalam Tim Qur&apos;an.
          </p>
          <div className="space-y-2">
            {ROLE_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={() => setSelectedRole(opt.value)}
                disabled={roleLoading}
                className={[
                  'w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all text-left',
                  selectedRole === opt.value
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                  roleLoading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
                ].join(' ')}>
                <span className="flex items-center gap-2">
                  <Shield size={16} className={selectedRole === opt.value ? 'text-indigo-600' : 'text-slate-400'} />
                  {opt.label}
                </span>
                {roleTarget?.role === opt.value && (
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Saat ini</span>
                )}
                {selectedRole === opt.value && roleTarget?.role !== opt.value && (
                  <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">Dipilih</span>
                )}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setRoleTarget(null)} disabled={roleLoading}>Batal</Button>
            <Button variant="primary" loading={roleLoading} onClick={handleConfirmRole}
              disabled={selectedRole === roleTarget?.role}>
              Simpan Role
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Konfirmasi Nonaktifkan/Aktifkan ─────────────────────────────── */}
      <ConfirmDialog
        open={Boolean(toggleTarget)}
        onClose={() => { if (!toggleLoading) setToggleTarget(null); }}
        onConfirm={handleConfirmToggle}
        title={toggleTarget?.status === 'Aktif' ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
        message={
          toggleTarget
            ? toggleTarget.status === 'Aktif'
              ? `Nonaktifkan akun "${toggleTarget.name}"? Anggota tidak dapat login hingga diaktifkan kembali.`
              : `Aktifkan akun "${toggleTarget.name}"? Anggota dapat login ke sistem kembali.`
            : ''
        }
        confirmLabel={toggleTarget?.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}
        loading={toggleLoading}
      />

      {/* ── Konfirmasi Reset Password ───────────────────────────────────── */}
      <ConfirmDialog
        open={Boolean(resetTarget)}
        onClose={() => { if (!resetLoading) setResetTarget(null); }}
        onConfirm={handleConfirmReset}
        title="Reset Password"
        message={
          resetTarget
            ? `Kirim email reset password ke "${resetTarget.name}" (${resetTarget.email})?`
            : ''
        }
        confirmLabel="Kirim Email"
        loading={resetLoading}
      />

      {/* ── Konfirmasi Hapus Anggota ─────────────────────────────────────── */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => { if (!deleteLoading) setDeleteTarget(null); }}
        onConfirm={handleConfirmDelete}
        title="Hapus Anggota"
        message={
          deleteTarget
            ? `Hapus anggota "${deleteTarget.name}" dari Tim Qur'an? Aksi ini tidak dapat dibatalkan.`
            : ''
        }
        confirmLabel="Hapus"
        confirmVariant="danger"
        loading={deleteLoading}
      />

      {/* ── Konfirmasi Hapus Role ─────────────────────────────────────────── */}
      <ConfirmDialog
        open={Boolean(removeRoleTarget)}
        onClose={() => { if (!removeRoleLoading) setRemoveRoleTarget(null); }}
        onConfirm={handleConfirmRemoveRole}
        title="Hapus Role"
        message={
          removeRoleTarget
            ? `Hapus role ${removeRoleTarget.role} dari "${removeRoleTarget.name}" dan jadikan Tim Qur'an?`
            : ''
        }
        confirmLabel="Hapus Role"
        confirmVariant="danger"
        loading={removeRoleLoading}
      />

      {/* ── Modal Foto Profil ────────────────────────────────────────────── */}
      <Modal open={Boolean(photoTarget)} onClose={() => { if (!photoLoading) setPhotoTarget(null); }}
        title={`Foto Profil — ${photoTarget?.name ?? ''}`} size="sm">
        <div className="space-y-4">
          <div className="w-32 h-32 mx-auto">
            <ImageUpload
              value={photoTarget?.photo_url}
              onUpload={handlePhotoUploaded}
              bucket="timquran-assets"
              folder={`profile/tim/${photoTarget?.id}`}
              shape="circle"
              helperText="JPG, PNG, WebP · maks 5MB"
              disabled={photoLoading}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
