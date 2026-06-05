'use client';

// src/app/(dashboard)/tim/page.tsx
// Halaman Manajemen Tim Qur'an (Kabid Only)
// - Tabel anggota dengan status badge
// - Form tambah anggota baru
// - Tombol nonaktifkan/aktifkan
// - Tombol reset password

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { Plus, UserX, UserCheck, KeyRound, Camera } from 'lucide-react';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import ImageUpload from '@/components/shared/ImageUpload';
import { useToast } from '@/lib/toast';

// ─── Types ──────────────────────────────────────────────────────────────────

interface TimMember {
  id: string;
  name: string;
  email: string;
  status: 'Aktif' | 'Nonaktif';
  created_at: string;
  photo_url?: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const getInitials = (name: string) =>
  name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

// ─── Sub-components ─────────────────────────────────────────────────────────

function MemberAvatar({ member, size = 40 }: { member: TimMember; size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full overflow-hidden ring-2 ring-slate-200 bg-indigo-100 flex items-center justify-center shrink-0"
    >
      {member.photo_url ? (
        <Image
          src={member.photo_url}
          alt={member.name}
          width={size}
          height={size}
          className="object-cover w-full h-full"
        />
      ) : (
        <span className="text-indigo-700 font-semibold text-xs">
          {getInitials(member.name)}
        </span>
      )}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function TimPage() {
  const { toast } = useToast();

  // ── Data state
  const [data, setData] = useState<TimMember[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Add form modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // ── Toggle status confirmation
  const [toggleTarget, setToggleTarget] = useState<TimMember | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  // ── Reset password confirmation
  const [resetTarget, setResetTarget] = useState<TimMember | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  // ── Photo upload (task 3.3 will add handler + modal)
  const [photoTarget, setPhotoTarget] = useState<TimMember | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);

  // ── Fetch tim members
  const fetchTimMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tim/list');
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message ?? 'Gagal memuat data Tim Qur\'an.');
        setData([]);
      } else {
        setData(json.data ?? []);
      }
    } catch {
      toast.error('Terjadi kesalahan saat memuat data Tim Qur\'an.');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTimMembers();
  }, [fetchTimMembers]);

  // ── Add member
  const handleOpenAdd = () => {
    setFormData({ name: '', email: '', password: '' });
    setAddError('');
    setAddModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { name, email, password } = formData;
    
    if (!name.trim()) {
      setAddError('Nama wajib diisi');
      return;
    }
    if (!email.trim()) {
      setAddError('Email wajib diisi');
      return;
    }
    if (!password.trim()) {
      setAddError('Kata sandi wajib diisi');
      return;
    }
    if (password.length < 6) {
      setAddError('Kata sandi minimal 6 karakter');
      return;
    }

    setAddLoading(true);
    setAddError('');
    try {
      const res = await fetch('/api/tim/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const json = await res.json();

      if (!res.ok) {
        setAddError(json.message ?? 'Gagal menambah anggota.');
        return;
      }

      toast.success(json.message ?? 'Anggota Tim Qur\'an berhasil ditambahkan.');
      setAddModalOpen(false);
      setFormData({ name: '', email: '', password: '' });
      fetchTimMembers();
    } catch {
      setAddError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setAddLoading(false);
    }
  };

  // ── Toggle status
  const handleOpenToggle = (member: TimMember) => {
    setToggleTarget(member);
  };

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

      if (!res.ok) {
        toast.error(json.message ?? 'Gagal mengubah status.');
        return;
      }

      toast.success(json.message ?? 'Status berhasil diubah.');
      setToggleTarget(null);
      fetchTimMembers();
    } catch {
      toast.error('Terjadi kesalahan saat mengubah status.');
    } finally {
      setToggleLoading(false);
    }
  };

  // ── Reset password
  const handleOpenReset = (member: TimMember) => {
    setResetTarget(member);
  };

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

      if (!res.ok) {
        toast.error(json.message ?? 'Gagal mengirim reset password.');
        return;
      }

      toast.success(json.message ?? 'Email reset password berhasil dikirim.');
      setResetTarget(null);
    } catch {
      toast.error('Terjadi kesalahan saat mengirim reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  // ── Photo upload
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
      if (!res.ok) {
        toast.error(json.message ?? 'Gagal memperbarui foto.');
        return;
      }

      // Update local state tanpa refetch
      setData(prev => prev.map(m =>
        m.id === photoTarget.id ? { ...m, photo_url: url } : m
      ));
      setPhotoTarget(prev => prev ? { ...prev, photo_url: url } : prev);
      toast.success('Foto profil berhasil diperbarui.');
    } catch {
      toast.error('Terjadi kesalahan saat memperbarui foto.');
    } finally {
      setPhotoLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manajemen Tim Qur&apos;an</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola akun anggota Tim Qur&apos;an yang dapat mengakses sistem.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus size={15} />}
          onClick={handleOpenAdd}
        >
          Tambah Anggota
        </Button>
      </div>

      {/* ── Tim members table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Foto
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Nama
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                // Loading skeleton
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 bg-slate-200 rounded-full animate-pulse"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 bg-slate-200 rounded animate-pulse w-32"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 bg-slate-200 rounded animate-pulse w-40"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-6 bg-slate-200 rounded-full animate-pulse w-16"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-8 bg-slate-200 rounded animate-pulse w-32 ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : data.length === 0 ? (
                // Empty state
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                    Belum ada anggota Tim Qur&apos;an yang terdaftar.
                  </td>
                </tr>
              ) : (
                // Data rows
                data.map((member) => (
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
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">{member.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={member.status === 'Aktif' ? 'green' : 'red'}>
                        {member.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={member.status === 'Aktif' ? <UserX size={14} /> : <UserCheck size={14} />}
                          onClick={() => handleOpenToggle(member)}
                          title={member.status === 'Aktif' ? 'Nonaktifkan akun' : 'Aktifkan akun'}
                        >
                          {member.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<KeyRound size={14} />}
                          onClick={() => handleOpenReset(member)}
                          title="Reset password"
                        >
                          Reset Password
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

      {/* ── Total count */}
      {!loading && data.length > 0 && (
        <p className="text-xs text-slate-400 text-right">
          Total {data.length} anggota terdaftar
        </p>
      )}

      {/* ── Add modal */}
      <Modal
        open={addModalOpen}
        onClose={() => { if (!addLoading) setAddModalOpen(false); }}
        title="Tambah Anggota Tim Qur'an"
        size="md"
        closeOnBackdrop={!addLoading}
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <Input
            label="Nama Lengkap"
            type="text"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              setAddError('');
            }}
            placeholder="Contoh: Ahmad Fulan"
            disabled={addLoading}
            required
            autoFocus
          />

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              setAddError('');
            }}
            placeholder="Contoh: ahmad@example.com"
            disabled={addLoading}
            required
          />

          <Input
            label="Kata Sandi Awal"
            type="password"
            value={formData.password}
            onChange={(e) => {
              setFormData({ ...formData, password: e.target.value });
              setAddError('');
            }}
            placeholder="Minimal 6 karakter"
            helperText="Kata sandi awal untuk akun baru (minimal 6 karakter)"
            disabled={addLoading}
            required
          />

          {addError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {addError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAddModalOpen(false)}
              disabled={addLoading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={addLoading}
            >
              Simpan
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Toggle status confirmation */}
      <ConfirmDialog
        open={Boolean(toggleTarget)}
        onClose={() => { if (!toggleLoading) setToggleTarget(null); }}
        onConfirm={handleConfirmToggle}
        title={toggleTarget?.status === 'Aktif' ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
        message={
          toggleTarget
            ? toggleTarget.status === 'Aktif'
              ? `Apakah Anda yakin ingin menonaktifkan akun "${toggleTarget.name}"?\n\n` +
                `Anggota ini tidak akan dapat login hingga akun diaktifkan kembali.`
              : `Apakah Anda yakin ingin mengaktifkan akun "${toggleTarget.name}"?\n\n` +
                `Anggota ini akan dapat login ke sistem kembali.`
            : ''
        }
        confirmLabel={toggleTarget?.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}
        loading={toggleLoading}
      />

      {/* ── Reset password confirmation */}
      <ConfirmDialog
        open={Boolean(resetTarget)}
        onClose={() => { if (!resetLoading) setResetTarget(null); }}
        onConfirm={handleConfirmReset}
        title="Reset Password"
        message={
          resetTarget
            ? `Kirim email reset password ke "${resetTarget.name}" (${resetTarget.email})?\n\n` +
              `Anggota akan menerima tautan untuk mengatur kata sandi baru.`
            : ''
        }
        confirmLabel="Kirim Email"
        loading={resetLoading}
      />

      {/* ── Photo upload modal */}
      <Modal
        open={Boolean(photoTarget)}
        onClose={() => { if (!photoLoading) setPhotoTarget(null); }}
        title={`Foto Profil — ${photoTarget?.name}`}
        size="sm"
      >
        <div className="space-y-4">
          <div className="w-32 h-32 mx-auto">
            <ImageUpload
              value={photoTarget?.photo_url}
              onUpload={handlePhotoUploaded}
              bucket="profile-photos"
              folder={`tim/${photoTarget?.id}`}
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
