"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, Eye, EyeOff, LogIn, AlertCircle, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) { setError("Email dan kata sandi wajib diisi."); return; }
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) { setError("Email atau kata sandi tidak valid."); }
    else { router.push("/dashboard"); router.refresh(); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)'}}>

      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-48 -left-48 w-96 h-96 rounded-full blur-3xl opacity-30"
          style={{background: 'radial-gradient(circle, #6366f1, transparent)'}} />
        <div className="absolute -bottom-48 -right-48 w-96 h-96 rounded-full blur-3xl opacity-25"
          style={{background: 'radial-gradient(circle, #8b5cf6, transparent)'}} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-10"
          style={{background: 'radial-gradient(circle, #06b6d4, transparent)'}} />
        {/* Grid dots */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '36px 36px'}} />
        {/* Arabic calligraphy */}
        <div className="absolute top-8 right-8 text-white/[0.04] font-serif select-none" style={{fontSize: '18rem', lineHeight: 1}}>&#1575;&#1604;&#1604;&#1607;</div>
      </div>

      {/* Back to home */}
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-white/50 hover:text-white/80 text-sm transition-colors z-10">
        <ArrowLeft size={16} /> Beranda
      </Link>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md mx-auto px-6">
        {/* Glass card */}
        <div className="rounded-3xl p-8 sm:p-10"
          style={{background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 32px 80px rgba(0,0,0,0.4)'}}>

          {/* Logo & title */}
          <div className="text-center mb-8">
            <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4"
              style={{background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 32px rgba(99,102,241,0.5)'}}>
              <BookOpen size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Selamat Datang</h1>
            <p className="text-indigo-200/60 text-sm">Masuk ke dashboard Tim Qur&apos;an</p>
          </div>

          {/* Hadits mini */}
          <div className="rounded-xl p-3 mb-6 text-center"
            style={{background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)'}}>
            <p className="text-white/80 text-base leading-loose" dir="rtl">&#1582;&#1610;&#1618;&#1585;&#1615;&#1603;&#1615;&#1605;&#32;&#1605;&#1614;&#1606;&#32;&#1578;&#1614;&#1593;&#1614;&#1604;&#1614;&#1617;&#1605;&#1614;&#32;&#1575;&#1604;&#1618;&#1602;&#1615;&#1585;&#1618;&#1570;&#1606;&#1614;&#32;&#1608;&#1614;&#1593;&#1614;&#1604;&#1614;&#1617;&#1605;&#1614;&#1607;&#1615;</p>
            <p className="text-indigo-300/60 text-xs mt-1">HR. Bukhari no. 5027</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
              style={{background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5'}}>
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-indigo-100/80">Email</label>
              <input id="email" type="email" placeholder="nama@timquran.id"
                value={email} onChange={e => setEmail(e.target.value)}
                disabled={loading} autoComplete="email"
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                style={{background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)'}} />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-indigo-100/80">Kata Sandi</label>
              <div className="relative">
                <input id="password" type={showPassword ? "text" : "password"}
                  placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading} autoComplete="current-password"
                  className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-white/25 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  style={{background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)'}} />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors" tabIndex={-1}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-100 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 32px rgba(99,102,241,0.4)'}}>
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Memproses...</>
              ) : (
                <><LogIn size={16} /> Masuk ke Dashboard</>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-white/25 text-xs mt-6">
          &copy; {new Date().getFullYear()} Tim Qur&apos;an. Sistem Manajemen Tahfidz &amp; Tahsin.
        </p>
      </div>
    </div>
  );
}
