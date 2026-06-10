"use client";
import { signIn, getSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, Eye, EyeOff, LogIn, AlertCircle, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();

  // Check unlock status and load remembered email on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check if user has unlocked access
    const isUnlocked = sessionStorage.getItem('auth_unlocked');
    if (!isUnlocked) {
      router.push('/auth/unlock');
      return;
    }

    // Load remembered email
    const saved = localStorage.getItem('tq_remembered_email');
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) { setError("Email dan kata sandi wajib diisi."); return; }
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) { setError("Email atau kata sandi tidak valid."); }
    else {
      // Save or remove remembered email based on rememberMe state
      if (rememberMe) {
        localStorage.setItem('tq_remembered_email', email.trim());
      } else {
        localStorage.removeItem('tq_remembered_email');
      }
      // Defensive cleanup — ensure password is never persisted
      localStorage.removeItem('tq_password');
      sessionStorage.removeItem('tq_password');
      // Show full-screen loading overlay before redirect
      setRedirecting(true);
      // Fetch session to check user role
      const session = await getSession();
      const role = session?.user?.role;
      if (role === "Kabid" || role === "Sekretaris") {
        router.push("/role-select"); router.refresh();
      } else {
        router.push("/dashboard"); router.refresh();
      }
    }
  };

  return (
    <>
      {/* ── Full-screen redirect overlay ─────────────────────────────────── */}
      {redirecting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fff7ed 100%)' }}>
          {/* Spinning ring */}
          <div className="relative w-20 h-20 mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-900/50" />
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            <div className="absolute inset-[6px] rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 24px rgba(99,102,241,0.6)' }}>
              <BookOpen size={22} className="text-white" />
            </div>
          </div>
          <p className="text-slate-900 text-base font-semibold mb-1">Masuk ke Dashboard...</p>
          <p className="text-slate-500 text-sm">Menyiapkan halaman untuk Anda</p>
          {/* Animated dots */}
          <div className="flex gap-1.5 mt-4">
            {[0,1,2].map(i => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400/60 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}

      {/* Background blobs */}
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fff7ed 100%)'}}>

      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-48 -left-48 w-96 h-96 rounded-full blur-3xl opacity-30 animate-blob"
          style={{background: 'radial-gradient(circle, #fbbf24, transparent)'}} />
        <div className="absolute -bottom-48 -right-48 w-96 h-96 rounded-full blur-3xl opacity-25 animate-blob animation-delay-2000"
          style={{background: 'radial-gradient(circle, #f59e0b, transparent)'}} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-10 animate-blob animation-delay-4000"
          style={{background: 'radial-gradient(circle, #fcd34d, transparent)'}} />
        {/* Grid dots */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{backgroundImage: 'radial-gradient(rgba(0,0,0,0.08) 1px, transparent 1px)', backgroundSize: '36px 36px'}} />
        {/* Arabic calligraphy */}
        <div className="absolute top-8 right-8 text-amber-400/[0.06] font-serif select-none" style={{fontSize: '18rem', lineHeight: 1}}>&#1575;&#1604;&#1604;&#1607;</div>
      </div>

      {/* Back to home */}
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm transition-colors z-10">
        <ArrowLeft size={16} /> Beranda
      </Link>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md mx-auto px-6">
        {/* Glass card */}
        <div className="rounded-3xl p-8 sm:p-10"
          style={{background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(24px)', border: '1px solid rgba(251,191,36,0.3)', boxShadow: '0 32px 80px rgba(0,0,0,0.4)'}}>

          {/* Logo & title */}
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs uppercase tracking-[0.28em] text-amber-600 ring-1 ring-amber-400/40 mb-4">
              <BookOpen size={14} /> Panel Tim Qur&apos;an
            </span>
            <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4"
              style={{background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 10px 40px rgba(99,102,241,0.35)'}}>
              <BookOpen size={28} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-1">Selamat Datang</h1>
            <p className="text-slate-600 text-sm">Akses laporan, jadwal, dan progress santri dengan cepat.</p>
          </div>

          {/* Hadits mini */}
          <div className="rounded-xl p-3 mb-6 text-center"
            style={{background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)'}}>
            <p className="text-slate-900 text-base leading-loose" dir="rtl">&#1582;&#1610;&#1618;&#1585;&#1615;&#1603;&#1615;&#1605;&#32;&#1605;&#1614;&#1606;&#32;&#1578;&#1614;&#1593;&#1614;&#1604;&#1614;&#1617;&#1605;&#1614;&#32;&#1575;&#1604;&#1618;&#1602;&#1615;&#1585;&#1618;&#1570;&#1606;&#1614;&#32;&#1608;&#1614;&#1593;&#1614;&#1604;&#1614;&#1617;&#1605;&#1614;&#1607;&#1615;</p>
            <p className="text-slate-500 text-xs mt-1">HR. Bukhari no. 5027</p>
          </div>

          {/* Error */}
          {error && (
            <div role="alert" className="mb-5 flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
              style={{background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5'}}>
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-slate-600">Email</label>
              <input id="email" type="email" placeholder="nama@timquran.id"
                value={email} onChange={e => setEmail(e.target.value)}
                disabled={loading} autoComplete="email"
                className="w-full rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                style={{background: 'white', border: '1px solid rgba(251,191,36,0.3)'}} />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-slate-600">Kata Sandi</label>
              <div className="relative">
                <input id="password" type={showPassword ? "text" : "password"}
                  placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading} autoComplete="current-password"
                  className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-slate-900 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  style={{background: 'white', border: '1px solid rgba(251,191,36,0.3)'}} />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" tabIndex={-1}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-3 py-1">
              <label className="flex items-center gap-2.5 cursor-pointer min-h-[44px] min-w-[44px] select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                  className="w-4 h-4 rounded border-amber-200 bg-white text-indigo-500 focus:ring-amber-500/50 focus:ring-2 cursor-pointer"
                />
                <span className="text-sm text-slate-600">Ingat Saya</span>
              </label>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-100 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 40px rgba(99,102,241,0.4)'}}>
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Memproses...</>
              ) : (
                <><LogIn size={16} /> Masuk ke Dashboard</>
              )}
            </button>
          </form>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 text-sm text-slate-600">
            <div className="rounded-2xl border border-amber-200 bg-white p-3">
              <p className="font-semibold text-slate-900">Akses Cepat</p>
              <p className="text-slate-500 mt-1">Lihat laporan dan jadwal tanpa repot.</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-white p-3">
              <p className="font-semibold text-slate-900">Keamanan Prioritas</p>
              <p className="text-slate-500 mt-1">Sesi aman dan proteksi data terjaga.</p>
            </div>
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
