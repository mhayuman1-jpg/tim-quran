"use client";
import { signIn, getSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, LogIn, AlertCircle, ArrowLeft, User } from "lucide-react";

export default function WaliLoginPage() {
  const [nis, setNis] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!nis.trim()) { setError("NIS wajib diisi."); return; }
    setLoading(true);
    const res = await signIn("wali-credentials", { nis: nis.trim(), redirect: false });
    setLoading(false);
    if (res?.error) { setError("NIS tidak ditemukan. Pastikan NIS yang Anda masukkan benar."); }
    else {
      setRedirecting(true);
      const session = await getSession();
      router.push("/wali/dashboard"); router.refresh();
    }
  };

  return (
    <>
      {redirecting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fff7ed 100%)' }}>
          <div className="relative w-20 h-20 mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-900/50" />
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            <div className="absolute inset-[6px] rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 24px rgba(99,102,241,0.6)' }}>
              <BookOpen size={22} className="text-white" />
            </div>
          </div>
          <p className="text-slate-900 text-base font-semibold mb-1">Memuat Data...</p>
          <p className="text-slate-500 text-sm">Menyiapkan progres putra/putri Anda</p>
          <div className="flex gap-1.5 mt-4">
            {[0,1,2].map(i => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400/60 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}

      <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fff7ed 100%)'}}>

      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-48 -left-48 w-96 h-96 rounded-full blur-3xl opacity-30 animate-blob"
          style={{background: 'radial-gradient(circle, #fbbf24, transparent)'}} />
        <div className="absolute -bottom-48 -right-48 w-96 h-96 rounded-full blur-3xl opacity-25 animate-blob animation-delay-2000"
          style={{background: 'radial-gradient(circle, #f59e0b, transparent)'}} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-10 animate-blob animation-delay-4000"
          style={{background: 'radial-gradient(circle, #fcd34d, transparent)'}} />
        <div className="absolute inset-0 opacity-[0.06]"
          style={{backgroundImage: 'radial-gradient(rgba(0,0,0,0.08) 1px, transparent 1px)', backgroundSize: '36px 36px'}} />
        <div className="absolute top-8 right-8 text-amber-400/[0.06] font-serif select-none" style={{fontSize: '18rem', lineHeight: 1}}>&#1575;&#1604;&#1604;&#1607;</div>
      </div>

      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm transition-colors z-10">
        <ArrowLeft size={16} /> Beranda
      </Link>

      <div className="relative z-10 w-full max-w-md mx-auto px-6">
        <div className="rounded-3xl p-8 sm:p-10"
          style={{background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(24px)', border: '1px solid rgba(251,191,36,0.3)', boxShadow: '0 32px 80px rgba(0,0,0,0.4)'}}>

          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs uppercase tracking-[0.28em] text-amber-600 ring-1 ring-amber-400/40 mb-4">
              <User size={14} /> Portal Wali Murid
            </span>
            <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4"
              style={{background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 10px 40px rgba(16,185,129,0.35)'}}>
              <User size={28} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-1">Pantau Progres</h1>
            <p className="text-slate-600 text-sm">Lihat perkembangan hafalan dan tahsin putra/putri Anda.</p>
          </div>

          <div className="rounded-xl p-3 mb-6 text-center"
            style={{background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)'}}>
            <p className="text-slate-900 text-base leading-loose" dir="rtl">&#1582;&#1610;&#1618;&#1585;&#1615;&#1603;&#1615;&#1605;&#32;&#1605;&#1614;&#1606;&#32;&#1578;&#1614;&#1593;&#1614;&#1604;&#1614;&#1617;&#1605;&#1614;&#32;&#1575;&#1604;&#1618;&#1602;&#1615;&#1585;&#1618;&#1570;&#1606;&#1614;&#32;&#1608;&#1614;&#1593;&#1614;&#1604;&#1614;&#1617;&#1605;&#1614;&#1607;&#1615;</p>
            <p className="text-slate-500 text-xs mt-1">HR. Bukhari no. 5027</p>
          </div>

          {error && (
            <div role="alert" className="mb-5 flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
              style={{background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5'}}>
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="nis" className="block text-sm font-medium text-slate-600">NIS Siswa</label>
              <input id="nis" type="text" placeholder="Masukkan NIS putra/putri Anda"
                value={nis} onChange={e => setNis(e.target.value)}
                disabled={loading} autoComplete="off"
                className="w-full rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                style={{background: 'white', border: '1px solid rgba(16,185,129,0.3)'}} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-100 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 8px 40px rgba(16,185,129,0.4)'}}>
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Memproses...</>
              ) : (
                <><LogIn size={16} /> Lihat Progres</>
              )}
            </button>
          </form>

          <div className="mt-6 p-4 rounded-2xl border border-emerald-200 bg-white">
            <p className="text-xs text-slate-500 text-center">
              Masukkan NIS putra/putri Anda untuk melihat progres hafalan, tahsin, dan raport.
              Hubungi Tim Qur'an jika NIS tidak dikenal.
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link href="/auth/login"
              className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors">
              Login untuk Staff Tim Qur'an
            </Link>
          </div>
        </div>

        <p className="text-center text-slate-400 text-xs mt-6">
          &copy; {new Date().getFullYear()} Tim Qur&apos;an. Sistem Manajemen Tahfidz &amp; Tahsin.
        </p>
      </div>
      </div>
    </>
  );
}
