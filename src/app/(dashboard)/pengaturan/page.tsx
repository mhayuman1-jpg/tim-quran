'use client';

// src/app/(dashboard)/pengaturan/page.tsx
// Halaman pengaturan akun: update profil dan ganti kata sandi
// Both Kabid and Tim_Quran can access this page

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { useSession as useNextAuthSession } from 'next-auth/react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import ImageUpload from '@/components/shared/ImageUpload';
import { User, Lock, AlertCircle, CheckCircle, Camera } from 'lucide-react';

export default function PengaturanPage() {
  const { session, isLoading: sessionLoading, userName, userEmail } = useSession();
  const { update: updateSession } = useNextAuthSession();
  const router = useRouter();

  // ── State untuk foto profil ──
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoSaving, setPhotoSaving] = useState(false);

  // ── State untuk form profil ──
  const [profileName, setProfileName] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // ── State untuk form password ──
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // ── Client-side validation errors ──
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // Set nama awal dari session
  useEffect(() => {
    if (userName) {
      setProfileName(userName);
    }
  }, [userName]);

  // Load photo_url dari session saat mount
  useEffect(() => {
    if (session?.user?.photo_url) {
      setPhotoUrl(session.user.photo_url);
    }
  }, [session]);

  // ── Handler: Update Profil ──
  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    // Client-side validation
    if (!profileName.trim()) {
      setProfileError('Nama wajib diisi');
      return;
    }

    setProfileLoading(true);

    try {
      const res = await fetch('/api/pengaturan/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setProfileError(data.message || 'Gagal memperbarui profil');
        return;
      }

      setProfileSuccess('Profil berhasil diperbarui');

      // Update local state langsung agar UI langsung berubah tanpa reload
      setProfileName(data.data.name);

      // Trigger session refresh untuk update nama di seluruh UI
      await updateSession({ name: data.data.name });

      // Force re-render navbar/layout yang menampilkan nama
      router.refresh();

      // Clear success message setelah 3 detik
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setProfileError('Terjadi kesalahan saat memperbarui profil');
    } finally {
      setProfileLoading(false);
    }
  };

  // ── Handler: Ganti Kata Sandi ──
  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    setNewPasswordError('');
    setConfirmPasswordError('');

    // Client-side validation
    let hasError = false;

    if (!oldPassword.trim()) {
      setPasswordError('Kata sandi lama wajib diisi');
      hasError = true;
    }

    if (!newPassword.trim()) {
      setNewPasswordError('Kata sandi baru wajib diisi');
      hasError = true;
    } else if (newPassword.length < 6) {
      setNewPasswordError('Kata sandi baru minimal 6 karakter');
      hasError = true;
    }

    if (!confirmPassword.trim()) {
      setConfirmPasswordError('Konfirmasi kata sandi wajib diisi');
      hasError = true;
    } else if (newPassword !== confirmPassword) {
      setConfirmPasswordError('Konfirmasi kata sandi tidak sesuai');
      hasError = true;
    }

    if (hasError) return;

    setPasswordLoading(true);

    try {
      const res = await fetch('/api/pengaturan/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.message || 'Gagal memperbarui kata sandi');
        return;
      }

      setPasswordSuccess('Kata sandi berhasil diperbarui');

      // Clear form
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Clear success message setelah 3 detik
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating password:', err);
      setPasswordError('Terjadi kesalahan saat memperbarui kata sandi');
    } finally {
      setPasswordLoading(false);
    }
  };

  // ── Handler: Upload Foto Profil ──
  const handlePhotoUploaded = async (url: string) => {
    setPhotoSaving(true);
    try {
      const res = await fetch('/api/pengaturan/photo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_url: url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.message ?? 'Gagal menyimpan foto.');
        return;
      }

      setPhotoUrl(url);
      setProfileSuccess('Foto profil berhasil diperbarui.');
      // Refresh session agar photo_url baru tersedia di seluruh app
      try {
        await updateSession({ photo_url: url });
      } catch {
        setProfileError('Foto tersimpan, tapi sesi gagal diperbarui. Silakan refresh halaman.');
      }
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch {
      setProfileError('Terjadi kesalahan saat menyimpan foto.');
    } finally {
      setPhotoSaving(false);
    }
  };

  // ── Loading state ──
  if (sessionLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan Akun</h1>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-6" />
          <div className="space-y-4">
            <div className="h-10 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-200 rounded w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan Akun</h1>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-4 py-3 text-sm">
          Sesi tidak ditemukan. Silakan login kembali.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan Akun</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola informasi profil dan keamanan akun Anda
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SEKSI: Foto Profil
        ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-purple-50">
            <Camera className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Foto Profil</h2>
            <p className="text-xs text-gray-500">Foto akan ditampilkan di ID Card</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="w-24 h-24 shrink-0">
            <ImageUpload
              value={photoUrl}
              onUpload={handlePhotoUploaded}
              bucket="profile-photos"
              folder={`${session?.user?.role?.toLowerCase()}/${session?.user?.id}`}
              shape="circle"
              disabled={photoSaving}
              helperText="Maks 5MB"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">{userName}</p>
            <p className="text-xs text-gray-400 mt-0.5">{userEmail}</p>
            <p className="text-xs text-slate-400 mt-2">JPG, PNG, WebP, GIF · Maks 5MB</p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          FORM 1: Update Profil
        ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-50">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Informasi Profil</h2>
            <p className="text-xs text-gray-500">
              Perbarui nama lengkap Anda
            </p>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          {/* Success message */}
          {profileSuccess && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
              <CheckCircle className="h-5 w-5 shrink-0" />
              {profileSuccess}
            </div>
          )}

          {/* Error message */}
          {profileError && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0" />
              {profileError}
            </div>
          )}

          {/* Email (read-only) */}
          <Input
            label="Email"
            type="email"
            value={userEmail || ''}
            disabled
            helperText="Email tidak dapat diubah"
          />

          {/* Nama Lengkap */}
          <Input
            label="Nama Lengkap"
            type="text"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            required
            placeholder="Masukkan nama lengkap"
          />

          {/* Submit button */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              loading={profileLoading}
              disabled={profileLoading}
            >
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          FORM 2: Ganti Kata Sandi
        ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-amber-50">
            <Lock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Keamanan Akun</h2>
            <p className="text-xs text-gray-500">
              Ubah kata sandi Anda untuk menjaga keamanan akun
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {/* Success message */}
          {passwordSuccess && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
              <CheckCircle className="h-5 w-5 shrink-0" />
              {passwordSuccess}
            </div>
          )}

          {/* General error message */}
          {passwordError && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0" />
              {passwordError}
            </div>
          )}

          {/* Kata Sandi Lama */}
          <Input
            label="Kata Sandi Lama"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
            placeholder="Masukkan kata sandi lama"
          />

          {/* Kata Sandi Baru */}
          <Input
            label="Kata Sandi Baru"
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setNewPasswordError('');
            }}
            required
            placeholder="Minimal 6 karakter"
            error={newPasswordError}
            helperText={!newPasswordError ? 'Kata sandi baru harus minimal 6 karakter' : undefined}
          />

          {/* Konfirmasi Kata Sandi Baru */}
          <Input
            label="Konfirmasi Kata Sandi Baru"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setConfirmPasswordError('');
            }}
            required
            placeholder="Ulangi kata sandi baru"
            error={confirmPasswordError}
          />

          {/* Submit button */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              loading={passwordLoading}
              disabled={passwordLoading}
            >
              Ubah Kata Sandi
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
