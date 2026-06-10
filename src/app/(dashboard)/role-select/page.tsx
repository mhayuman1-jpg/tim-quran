"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, Shield, Loader2 } from "lucide-react";
import { useViewMode } from "@/hooks/useViewMode";

const STORAGE_KEY = "timquran-view-as-role";

export default function RoleSelectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { setViewAsRole } = useViewMode();
  const [selecting, setSelecting] = useState<string | null>(null);

  // Redirect if not Kabid/Sekretaris or if already selected
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/auth/login");
      return;
    }
    const role = session.user.role;
    if (role !== "Kabid" && role !== "Sekretaris") {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  const handleSelect = async (mode: "guru" | "admin") => {
    setSelecting(mode);
    if (mode === "guru") {
      setViewAsRole("Tim_Quran");
    } else {
      setViewAsRole(null);
      localStorage.removeItem(STORAGE_KEY);
    }
    // Small delay for visual feedback
    await new Promise((r) => setTimeout(r, 300));
    router.push("/dashboard");
  };

  if (status === "loading" || !session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fff7ed 100%)" }}>
        <Loader2 size={32} className="text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fff7ed 100%)" }}>

      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-48 -left-48 w-96 h-96 rounded-full blur-3xl opacity-30 animate-blob"
          style={{ background: "radial-gradient(circle, #fbbf24, transparent)" }} />
        <div className="absolute -bottom-48 -right-48 w-96 h-96 rounded-full blur-3xl opacity-25 animate-blob animation-delay-2000"
          style={{ background: "radial-gradient(circle, #f59e0b, transparent)" }} />
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(rgba(0,0,0,0.08) 1px, transparent 1px)", backgroundSize: "36px 36px" }} />
      </div>

      <div className="relative z-10 w-full max-w-lg mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 10px 40px rgba(99,102,241,0.35)" }}>
            <BookOpen size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Pilih Mode Akses</h1>
          <p className="text-slate-600 text-sm">
            Selamat datang, <span className="font-semibold text-slate-900">{session.user.name}</span>
          </p>
          <p className="text-slate-500 text-xs mt-1">Pilih mode yang ingin Anda gunakan</p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Guru Card */}
          <button
            onClick={() => handleSelect("guru")}
            disabled={selecting !== null}
            className="group relative rounded-2xl p-6 text-left transition-all hover:scale-[1.03] active:scale-100 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: selecting === "guru"
                ? "linear-gradient(135deg, #059669, #10b981)"
                : "rgba(255,255,255,0.95)",
              border: selecting === "guru" ? "1px solid #10b981" : "1px solid rgba(251,191,36,0.3)",
              backdropFilter: "blur(24px)",
              boxShadow: selecting === "guru" ? "0 20px 60px rgba(245,158,11,0.3)" : "0 8px 32px rgba(0,0,0,0.2)",
            }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{ background: selecting === "guru" ? "rgba(255,255,255,0.2)" : "rgba(245,158,11,0.15)" }}>
              <BookOpen size={22} style={{ color: selecting === "guru" ? "#fff" : "#10b981" }} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Guru</h3>
            <p className="text-sm" style={{ color: selecting === "guru" ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.5)" }}>
              Lihat data siswa yang Anda ampu, input hafalan, tahsin, dan absensi.
            </p>
            {selecting === "guru" && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl" style={{ background: "rgba(0,0,0,0.3)" }}>
                <Loader2 size={24} className="text-white animate-spin" />
              </div>
            )}
          </button>

          {/* Kabid Card */}
          <button
            onClick={() => handleSelect("admin")}
            disabled={selecting !== null}
            className="group relative rounded-2xl p-6 text-left transition-all hover:scale-[1.03] active:scale-100 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: selecting === "admin"
                ? "linear-gradient(135deg, #4f46e5, #6366f1)"
                : "rgba(255,255,255,0.95)",
              border: selecting === "admin" ? "1px solid #6366f1" : "1px solid rgba(251,191,36,0.3)",
              backdropFilter: "blur(24px)",
              boxShadow: selecting === "admin" ? "0 20px 60px rgba(99,102,241,0.3)" : "0 8px 32px rgba(0,0,0,0.2)",
            }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{ background: selecting === "admin" ? "rgba(255,255,255,0.2)" : "rgba(99,102,241,0.15)" }}>
              <Shield size={22} style={{ color: selecting === "admin" ? "#fff" : "#6366f1" }} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Kabid</h3>
            <p className="text-sm" style={{ color: selecting === "admin" ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.5)" }}>
              Akses penuh ke seluruh data, manajemen kelas, tim, dan pengaturan.
            </p>
            {selecting === "admin" && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl" style={{ background: "rgba(0,0,0,0.3)" }}>
                <Loader2 size={24} className="text-white animate-spin" />
              </div>
            )}
          </button>
        </div>

        <p className="text-center text-slate-400 text-xs mt-8">
          &copy; {new Date().getFullYear()} Tim Qur&apos;an. Sistem Manajemen Tahfidz &amp; Tahsin.
        </p>
      </div>
    </div>
  );
}
