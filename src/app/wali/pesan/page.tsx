"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Send, MessageCircle, ArrowLeft, Clock, CheckCheck, Trash2 } from "lucide-react";
import Link from "next/link";

interface Message {
  id: string;
  santri_id: string;
  sender_type: "wali" | "kabid";
  sender_id: string;
  sender_name: string;
  message: string;
  is_read: boolean;
  reply: string | null;
  replied_by: string | null;
  replied_at: string | null;
  created_at: string;
  santri?: { nama: string; nisn: string; classes?: { name: string } | null };
}

export default function WaliPesanPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/list");
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch {
      console.error("Gagal memuat pesan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    const santriId = (session?.user as any)?.santri_id;
    if (!santriId) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ santri_id: santriId, message: newMessage.trim() }),
      });

      if (res.ok) {
        setNewMessage("");
        setToast({ type: "success", text: "Pesan berhasil dikirim!" });
        fetchMessages();
      } else {
        setToast({ type: "error", text: "Gagal mengirim pesan" });
      }
    } catch {
      setToast({ type: "error", text: "Terjadi kesalahan" });
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (msgId: string) => {
    if (!confirm("Hapus pesan ini?")) return;
    try {
      const res = await fetch("/api/messages/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_id: msgId }),
      });
      if (res.ok) {
        setToast({ type: "success", text: "Pesan berhasil dihapus" });
        fetchMessages();
      } else {
        setToast({ type: "error", text: "Gagal menghapus pesan" });
      }
    } catch {
      setToast({ type: "error", text: "Terjadi kesalahan" });
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #f0faf5 0%, #e6f2ec 100%)" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0d3b2e, #1a6b4f)" }} className="px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/wali/dashboard" className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.15)" }}>
            <ArrowLeft size={18} className="text-white" />
          </Link>
          <div>
            <h1 className="text-white font-bold text-lg" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}>
              Pesan ke Admin
            </h1>
            <p className="text-emerald-200 text-xs">Hubungi Kabid terkait anak Anda</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Toast */}
        {toast && (
          <div className={`mb-3 px-4 py-2.5 rounded-xl text-sm font-medium text-white ${
            toast.type === "success" ? "bg-emerald-600" : "bg-red-500"
          }`} style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
            {toast.text}
          </div>
        )}

        {/* Messages List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
            <p className="text-emerald-700 text-sm mt-3">Memuat pesan...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-emerald-100">
            <MessageCircle size={48} className="text-emerald-200 mx-auto mb-3" />
            <p className="text-emerald-700 font-medium">Belum ada pesan</p>
            <p className="text-emerald-500 text-sm mt-1">Kirim pesan pertama Anda ke admin</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="bg-white rounded-2xl border border-emerald-100 overflow-hidden relative"
                style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                {/* Delete button */}
                <button
                  onClick={() => deleteMessage(msg.id)}
                  className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center opacity-40 hover:opacity-100 hover:bg-red-50 transition-all"
                  title="Hapus pesan"
                >
                  <Trash2 size={13} className="text-red-400" />
                </button>

                {/* Message from wali */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "linear-gradient(135deg, #d4a843, #b8922f)" }}>
                      <span className="text-white text-xs font-bold">W</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-emerald-800">Anda</span>
                        <span className="text-xs text-emerald-400">•</span>
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <Clock size={10} /> {formatDate(msg.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{msg.message}</p>
                    </div>
                  </div>
                </div>

                {/* Reply from kabid */}
                {msg.reply && (
                  <div className="px-4 py-3 border-t border-emerald-50" style={{ background: "#f8faf8" }}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: "linear-gradient(135deg, #0d3b2e, #1a6b4f)" }}>
                        <span className="text-white text-xs font-bold">A</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-emerald-800">Admin (Kabid)</span>
                          <span className="text-xs text-emerald-400">•</span>
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <CheckCheck size={10} /> {msg.replied_at ? formatDate(msg.replied_at) : ""}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">{msg.reply}</p>
                      </div>
                    </div>
                  </div>
                )}

                {!msg.reply && (
                  <div className="px-4 py-2 border-t border-emerald-50" style={{ background: "#f8faf8" }}>
                    <p className="text-xs text-emerald-400 italic flex items-center gap-1">
                      <Clock size={10} /> Menunggu balasan admin...
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 p-4" style={{ background: "rgba(255,255,255,0.95)", borderTop: "1px solid #e6f2ec", backdropFilter: "blur(8px)" }}>
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Ketik pesan Anda..."
            className="flex-1 text-sm px-4 py-3 rounded-xl outline-none"
            style={{ background: "#f4faf7", border: "1px solid #d0e8dd", color: "#1e293b" }}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-opacity disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #0d3b2e, #1a6b4f)" }}
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={16} className="text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
