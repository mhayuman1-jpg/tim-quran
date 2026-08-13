"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Send, MessageCircle, ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import EmojiPicker from "@/components/features/chat/EmojiPicker";

interface Message {
  id: string;
  santri_id: string;
  sender_type: "wali" | "kabid";
  sender_id: string;
  sender_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
  santri?: { nama: string; nisn: string; classes?: { name: string } | null };
}

export default function WaliPesanPage() {
  useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const markingRef = useRef(false);

  const markRead = useCallback(async () => {
    try {
      await fetch("/api/messages/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch {}
  }, []);

  const fetchMessages = useCallback(async (opts?: { loading?: boolean }) => {
    const showLoading = opts?.loading !== false;
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/messages/list", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        // Tandai balasan admin yang belum dibaca sebagai sudah dibaca (maksimal sekali per siklus)
        const hasUnread = data.some((m: Message) => m.sender_type === "kabid" && !m.is_read);
        if (hasUnread && !markingRef.current) {
          markingRef.current = true;
          await markRead();
          markingRef.current = false;
        }
      }
    } catch {
      console.error("Gagal memuat pesan");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [markRead]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    fetchMessages();

    const es = new EventSource("/api/messages/stream");
    es.onmessage = () => {
      fetchMessages({ loading: false });
    };
    es.onerror = (e) => console.warn("SSE wali error", e);

    const fallback = setInterval(() => {
      fetchMessages({ loading: false });
    }, 30000);

    return () => {
      es.close();
      clearInterval(fallback);
    };
  }, [fetchMessages, markRead]);

  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    const nearBottom =
      window.innerHeight + window.scrollY >= document.body.scrollHeight - 120;
    if (nearBottom) el.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input.trim() }),
      });
      if (res.ok) {
        setInput("");
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
    return new Date(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #f0faf5 0%, #e6f2ec 100%)" }}>
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

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-4">
        {toast && (
          <div className={`mb-3 px-4 py-2.5 rounded-xl text-sm font-medium text-white ${
            toast.type === "success" ? "bg-emerald-600" : "bg-red-500"
          }`} style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
            {toast.text}
          </div>
        )}

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
          <div className="space-y-3 pb-4">
            {messages.map((msg) => {
              const isWali = msg.sender_type === "wali";
              return (
                <div key={msg.id} className={`flex items-end gap-2 ${isWali ? "" : "flex-row-reverse"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold ${
                    isWali ? "" : ""
                  }`} style={{ background: isWali ? "linear-gradient(135deg, #d4a843, #b8922f)" : "linear-gradient(135deg, #0d3b2e, #1a6b4f)" }}>
                    {isWali ? "W" : "A"}
                  </div>
                  <div className={`group relative max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isWali ? "text-white" : "text-white"
                  }`} style={{
                    background: isWali ? "linear-gradient(135deg, #d4a843, #b8922f)" : "linear-gradient(135deg, #0d3b2e, #1a6b4f)",
                    borderBottomRightRadius: isWali ? "4px" : "16px",
                    borderBottomLeftRadius: isWali ? "16px" : "4px",
                  }}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-semibold opacity-90">{msg.sender_name}</span>
                      <span className="text-[10px] opacity-70">{formatDate(msg.created_at)}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-white shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Hapus pesan"
                    >
                      <Trash2 size={11} className="text-red-400" />
                    </button>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="sticky bottom-0 left-0 right-0 p-4" style={{ background: "rgba(255,255,255,0.95)", borderTop: "1px solid #e6f2ec", backdropFilter: "blur(8px)" }}>
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <EmojiPicker onSelect={(e) => setInput((v) => v + e)} />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Ketik pesan Anda..."
            className="flex-1 text-sm px-4 py-3 rounded-xl outline-none"
            style={{ background: "#f4faf7", border: "1px solid #d0e8dd", color: "#1e293b" }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
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
