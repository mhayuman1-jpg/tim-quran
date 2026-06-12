"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { MessageSquareQuote, Check, Trash2, Clock, Star, User, Search } from "lucide-react";

interface Testimonial {
  id: string;
  parent_name: string;
  child_name: string;
  batch: string | null;
  rating: number;
  message: string;
  is_approved: boolean;
  created_at: string;
}

export default function KelolaTestimoniPage() {
  const { data: session } = useSession();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchTestimonials = useCallback(async () => {
    try {
      const res = await fetch("/api/testimonials/manage");
      if (res.ok) {
        const data = await res.json();
        setTestimonials(data);
      }
    } catch {
      console.error("Gagal memuat testimoni");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTestimonials();
  }, [fetchTestimonials]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    const label = action === "approve" ? "Setujui" : "Hapus";
    if (!confirm(`${label} testimoni ini?`)) return;

    try {
      const res = await fetch("/api/testimonials/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testimonial_id: id, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ type: "success", text: data.message });
        fetchTestimonials();
      } else {
        setToast({ type: "error", text: data.message || "Gagal" });
      }
    } catch {
      setToast({ type: "error", text: "Terjadi kesalahan" });
    }
  };

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star key={i} size={14} className={i < rating ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"} />
    ));

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const filtered = testimonials.filter((t) => {
    const matchFilter = filter === "all" || (filter === "pending" && !t.is_approved) || (filter === "approved" && t.is_approved);
    const matchSearch = !search || t.parent_name.toLowerCase().includes(search.toLowerCase()) || t.child_name.toLowerCase().includes(search.toLowerCase()) || t.message.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const pendingCount = testimonials.filter((t) => !t.is_approved).length;
  const approvedCount = testimonials.filter((t) => t.is_approved).length;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium text-white ${toast.type === "success" ? "bg-emerald-600" : "bg-red-500"}`}
          style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #d4a843, #b8922f)" }}>
          <MessageSquareQuote size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Kelola Testimoni</h1>
          <p className="text-sm text-slate-500">
            {pendingCount > 0 ? `${pendingCount} menunggu persetujuan` : "Semua testimoni sudah diproses"}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setFilter("all")}
          className={`p-3 rounded-xl border text-left transition-all ${filter === "all" ? "border-emerald-300 bg-emerald-50" : "border-slate-100 bg-white hover:bg-slate-50"}`}
        >
          <p className="text-2xl font-bold text-slate-800">{testimonials.length}</p>
          <p className="text-xs text-slate-500">Semua</p>
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`p-3 rounded-xl border text-left transition-all ${filter === "pending" ? "border-amber-300 bg-amber-50" : "border-slate-100 bg-white hover:bg-slate-50"}`}
        >
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
          <p className="text-xs text-slate-500">Menunggu</p>
        </button>
        <button
          onClick={() => setFilter("approved")}
          className={`p-3 rounded-xl border text-left transition-all ${filter === "approved" ? "border-green-300 bg-green-50" : "border-slate-100 bg-white hover:bg-slate-50"}`}
        >
          <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
          <p className="text-xs text-slate-500">Disetujui</p>
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-100"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
        <Search size={14} className="text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama orang tua, anak, atau pesan..."
          className="flex-1 text-sm bg-transparent outline-none text-slate-700"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
          <p className="text-emerald-700 text-sm mt-3">Memuat testimoni...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
          <MessageSquareQuote size={48} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Tidak ada testimoni</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <div
              key={t.id}
              className={`bg-white rounded-2xl border overflow-hidden ${t.is_approved ? "border-emerald-100" : "border-amber-200"}`}
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
            >
              {/* Status badge */}
              <div className={`px-4 py-1.5 text-xs font-medium flex items-center gap-1.5 ${t.is_approved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {t.is_approved ? <Check size={12} /> : <Clock size={12} />}
                {t.is_approved ? "Disetujui" : "Menunggu Persetujuan"}
              </div>

              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, #d4a843, #b8922f)" }}>
                    <User size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-semibold text-slate-800">{t.parent_name}</span>
                      <span className="text-[10px] text-slate-400">{formatDate(t.created_at)}</span>
                    </div>
                    <p className="text-xs text-emerald-600 mb-1">
                      Orang tua dari {t.child_name}
                      {t.batch && ` · Angkatan ${t.batch}`}
                    </p>
                    <div className="flex items-center gap-0.5 mb-2">{renderStars(t.rating)}</div>
                    <p className="text-sm text-slate-600 leading-relaxed">{t.message}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50">
                  {!t.is_approved && (
                    <button
                      onClick={() => handleAction(t.id, "approve")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      <Check size={12} /> Setujui
                    </button>
                  )}
                  <button
                    onClick={() => handleAction(t.id, "reject")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={12} /> Hapus
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
