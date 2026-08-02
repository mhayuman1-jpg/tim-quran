"use client";

import { useState, useEffect, useRef } from "react";
import { Star, MessageSquareQuote, X, Send, Heart } from "lucide-react";

interface Testimonial {
  id: string;
  parent_name: string;
  child_name: string;
  batch: string | null;
  rating: number;
  message: string;
  created_at: string;
}

export default function TestimonialBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({
    parent_name: "",
    child_name: "",
    batch: "",
    rating: 5,
    message: "",
  });
  const [hoveredStar, setHoveredStar] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) fetchTestimonials();
  }, [isOpen]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (showForm && contentRef.current) {
      setTimeout(() => {
        contentRef.current?.scrollTo({ top: contentRef.current.scrollHeight, behavior: "smooth" });
      }, 100);
    }
  }, [showForm]);

  const fetchTestimonials = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/testimonials");
      if (res.ok) {
        const data = await res.json();
        setTestimonials(data);
      }
    } catch {
      console.error("Gagal memuat testimoni");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.parent_name.trim() || !form.child_name.trim() || !form.message.trim()) {
      setToast({ type: "error", text: "Lengkapi semua data wajib" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ type: "success", text: data.message });
        setForm({ parent_name: "", child_name: "", batch: "", rating: 5, message: "" });
        setShowForm(false);
        fetchTestimonials();
      } else {
        setToast({ type: "error", text: data.message || "Gagal mengirim" });
      }
    } catch {
      setToast({ type: "error", text: "Terjadi kesalahan" });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number, interactive = false) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={interactive ? 24 : 14}
        className={`${interactive ? "cursor-pointer transition-all" : ""} ${
          i < (interactive ? hoveredStar || form.rating : rating)
            ? "text-amber-400 fill-amber-400"
            : "text-slate-200 fill-slate-200"
        }`}
        onMouseEnter={() => interactive && setHoveredStar(i + 1)}
        onMouseLeave={() => interactive && setHoveredStar(0)}
        onClick={() => interactive && setForm((f) => ({ ...f, rating: i + 1 }))}
      />
    ));
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  return (
    <>
      {/* Floating Bubble — rightmost */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
        {/* Hover Tooltip */}
        <div
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap transition-all duration-300 pointer-events-none ${
            isHovered && !isOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"
          }`}
          style={{
            background: "linear-gradient(135deg, #b8922f, #d4a843)",
            boxShadow: "0 4px 12px rgba(184,146,47,0.3)",
          }}
        >
          ⭐ Testimoni
          <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rotate-45"
            style={{ background: "#b8922f" }} />
        </div>

        {/* Bubble */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
          style={{
            background: isOpen
              ? "linear-gradient(135deg, #4b5563, #374151)"
              : "linear-gradient(135deg, #b8922f, #d4a843)",
            boxShadow: isOpen
              ? "0 4px 20px rgba(75,85,99,0.4)"
              : "0 6px 32px rgba(184,146,47,0.5), 0 0 0 4px rgba(184,146,47,0.12)",
          }}
          title={isOpen ? "Tutup" : "Testimoni Alumni"}
        >
          {/* Pulse ring */}
          {!isOpen && (
            <span className="absolute inset-0 rounded-full animate-ping"
              style={{ background: "rgba(184,146,47,0.25)", animationDuration: "2.5s" }} />
          )}
          <span className="relative z-10 text-white">
            {isOpen ? <X size={22} /> : <Star size={22} />}
          </span>
        </button>
      </div>

      {/* Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden flex flex-col"
          style={{
            boxShadow: "0 25px 60px rgba(0,0,0,0.18), 0 8px 20px rgba(0,0,0,0.1)",
            background: "white",
            height: "min(520px, calc(100vh - 140px))",
          }}
        >
          {/* Header */}
          <div
            className="px-5 py-4 flex items-center gap-3 shrink-0"
            style={{ background: "linear-gradient(135deg, #0d3b2e, #1a6b4f)" }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/15 backdrop-blur-sm">
              <Heart size={18} className="text-amber-300" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-sm">Testimoni Alumni</h3>
              <p className="text-emerald-200 text-xs">Cerita dari Wali Murid</p>
            </div>
            <button onClick={() => setShowForm(false)} className="text-emerald-200 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Toast */}
          {toast && (
            <div className={`px-4 py-2 text-sm font-medium text-white shrink-0 ${toast.type === "success" ? "bg-emerald-600" : "bg-red-500"}`}>
              {toast.text}
            </div>
          )}

          {/* Scrollable Content */}
          <div ref={contentRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-7 h-7 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
                <p className="text-emerald-600 text-xs mt-2">Memuat testimoni...</p>
              </div>
            ) : testimonials.length === 0 && !showForm ? (
              <div className="text-center py-12">
                <MessageSquareQuote size={40} className="text-emerald-100 mx-auto mb-2" />
                <p className="text-emerald-600 text-sm font-medium">Belum ada testimoni</p>
                <p className="text-emerald-400 text-xs mt-1">Jadilah yang pertama!</p>
              </div>
            ) : (
              <>
                {testimonials.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white rounded-xl p-3.5 border border-emerald-50"
                    style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: "linear-gradient(135deg, #0d3b2e, #1a6b4f)" }}
                      >
                        <Heart size={14} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-800">{t.parent_name}</span>
                          <span className="text-[10px] text-slate-400">{formatDate(t.created_at)}</span>
                        </div>
                        <p className="text-[10px] text-emerald-600 mb-1">
                          Orang tua dari {t.child_name}
                          {t.batch && ` · Angkatan ${t.batch}`}
                        </p>
                        <div className="flex items-center gap-0.5 mb-2">{renderStars(t.rating)}</div>
                        <p className="text-xs text-slate-600 leading-relaxed italic">&quot;{t.message}&quot;</p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Form */}
                {showForm && (
                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">Testimoni Baru</span>
                      <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={16} />
                      </button>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Penilaian *</label>
                      <div className="flex items-center gap-1">{renderStars(form.rating, true)}</div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Nama Anda *</label>
                      <input
                        value={form.parent_name}
                        onChange={(e) => setForm((f) => ({ ...f, parent_name: e.target.value }))}
                        placeholder="Contoh: Budi Santoso"
                        className="w-full text-sm px-3 py-2 rounded-lg outline-none border border-slate-200 focus:border-emerald-400 bg-white transition-all focus:shadow-md"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Nama Anak *</label>
                      <input
                        value={form.child_name}
                        onChange={(e) => setForm((f) => ({ ...f, child_name: e.target.value }))}
                        placeholder="Contoh: Muhammad Rizki"
                        className="w-full text-sm px-3 py-2 rounded-lg outline-none border border-slate-200 focus:border-emerald-400 bg-white transition-all focus:shadow-md"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Angkatan</label>
                      <input
                        value={form.batch}
                        onChange={(e) => setForm((f) => ({ ...f, batch: e.target.value }))}
                        placeholder="Contoh: 2024"
                        className="w-full text-sm px-3 py-2 rounded-lg outline-none border border-slate-200 focus:border-emerald-400 bg-white transition-all focus:shadow-md"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Pesan *</label>
                      <textarea
                        value={form.message}
                        onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                        placeholder="Ceritakan pengalaman Anda..."
                        rows={3}
                        className="w-full text-sm px-3 py-2 rounded-lg outline-none border border-slate-200 focus:border-emerald-400 resize-none bg-white transition-all focus:shadow-md"
                      />
                    </div>

                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:shadow-lg disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #0d3b2e, #1a6b4f)" }}
                    >
                      {submitting ? (
                        <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
                        </svg>
                      ) : (
                        <>
                          <Send size={14} />
                          Kirim Testimoni
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {!showForm && (
            <div className="px-4 py-3 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setShowForm(true)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #b8922f, #d4a843)" }}
              >
                ✍️ Kirim Testimoni Anda
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
