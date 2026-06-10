'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, LockOpen, AlertCircle } from 'lucide-react';

export default function UnlockPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!code.trim()) {
      setError('Kode akses wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        // Set unlock flag di session storage
        sessionStorage.setItem('auth_unlocked', 'true');
        // Redirect ke login
        router.push('/auth/login');
      } else {
        setError(data.message || 'Kode akses salah.');
      }
    } catch (err) {
      console.error('[unlock]', err);
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-amber-100 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-3xl border border-amber-200 bg-white backdrop-blur-xl p-8 shadow-2xl">
          {/* Logo & Title */}
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-blue-500 flex items-center justify-center shadow-lg">
              <Lock size={28} className="text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
            Akses Terbatas
          </h1>
          <p className="text-slate-500 text-center text-sm mb-8">
            Masukkan kode akses untuk melanjutkan ke halaman login Tim Qur'an.
          </p>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
              <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Kode Akses
              </label>
              <input
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Masukkan kode..."
                className="w-full px-4 py-3 rounded-xl border border-amber-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-blue-500 text-white font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                <>
                  <LockOpen size={18} />
                  Buka Akses
                </>
              )}
            </button>
          </form>

          {/* Footer Info */}
          <p className="text-xs text-slate-400 text-center mt-6">
            Hubungi administrator jika Anda lupa kode akses.
          </p>
        </div>
      </div>
    </div>
  );
}
