"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { MessageCircle, Send, Search, User, Trash2 } from "lucide-react";
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

interface Conversation {
  santri_id: string;
  santri?: { nama: string; nisn: string; classes?: { name: string } | null } | null;
  last_message: string | null;
  last_at: string | null;
  unread_count: number;
}

export default function PesanPage() {
  useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedSantriId, setSelectedSantriId] = useState<string | null>(null);
  const [selectedSantri, setSelectedSantri] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/conversations", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch {
      console.error("Gagal memuat percakapan");
    } finally {
      setLoadingConv(false);
    }
  }, []);

  const markRead = useCallback(async (santriId: string) => {
    try {
      await fetch("/api/messages/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ santri_id: santriId }),
      });
    } catch {}
  }, []);

  const fetchMessages = useCallback(async (santriId: string) => {
    setLoadingMsg(true);
    try {
      const res = await fetch(`/api/messages/list?santri_id=${santriId}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch {
      console.error("Gagal memuat pesan");
    } finally {
      setLoadingMsg(false);
    }
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    fetchConversations();
    const es = new EventSource("/api/messages/stream");
    es.onmessage = () => {
      fetchConversations();
      if (selectedSantriId) {
        fetchMessages(selectedSantriId);
        markRead(selectedSantriId);
      }
    };
    es.onerror = (e) => console.warn("SSE kabid error", e);

    const fallback = setInterval(fetchConversations, 30000);
    return () => {
      es.close();
      clearInterval(fallback);
    };
  }, [fetchConversations, fetchMessages, markRead, selectedSantriId]);

  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    const container = el.parentElement;
    if (!container) return;
    const nearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (nearBottom) el.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectConversation = (c: Conversation) => {
    setSelectedSantriId(c.santri_id);
    setSelectedSantri(c.santri);
    fetchMessages(c.santri_id);
    markRead(c.santri_id);
  };

  const sendMessage = async () => {
    if (!selectedSantriId || !input.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ santri_id: selectedSantriId, message: input.trim() }),
      });
      if (res.ok) {
        setInput("");
        setToast({ type: "success", text: "Pesan berhasil dikirim!" });
        fetchMessages(selectedSantriId);
        fetchConversations();
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
    if (!selectedSantriId) return;
    try {
      const res = await fetch("/api/messages/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_id: msgId }),
      });
      if (res.ok) {
        setToast({ type: "success", text: "Pesan berhasil dihapus" });
        fetchMessages(selectedSantriId);
        fetchConversations();
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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredConversations = conversations.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.santri?.nama?.toLowerCase().includes(q) ||
      c.santri?.nisn?.includes(q) ||
      c.last_message?.toLowerCase().includes(q)
    );
  });

  const unreadTotal = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium text-white ${
          toast.type === "success" ? "bg-emerald-600" : "bg-red-500"
        }`} style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
          {toast.text}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #0d3b2e, #1a6b4f)" }}>
            <MessageCircle size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Pesan Masuk</h1>
            <p className="text-sm text-slate-500">
              {unreadTotal > 0 ? `${unreadTotal} pesan belum dibaca` : "Semua pesan sudah dibaca"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4" style={{ minHeight: "520px" }}>
        {/* Left: conversation list */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col"
          style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          <div className="p-3 border-b border-slate-100">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <Search size={14} className="text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari santri..."
                className="flex-1 text-sm bg-transparent outline-none text-slate-700"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1" style={{ maxHeight: "480px" }}>
            {loadingConv ? (
              <div className="text-center py-12">
                <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageCircle size={36} className="text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Tidak ada percakapan</p>
              </div>
            ) : (
              filteredConversations.map((c) => (
                <button
                  key={c.santri_id}
                  onClick={() => selectConversation(c)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 border-b border-slate-50 transition-colors ${
                    selectedSantriId === c.santri_id ? "bg-emerald-50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold"
                    style={{ background: "linear-gradient(135deg, #d4a843, #b8922f)" }}>
                    {c.santri?.nama?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {c.santri?.nama ?? "Santri"}
                      </span>
                      {c.last_at && (
                        <span className="text-[10px] text-slate-400 shrink-0">{formatDate(c.last_at)}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-400 truncate">{c.last_message || "—"}</p>
                      {c.unread_count > 0 && (
                        <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                          style={{ boxShadow: "0 0 6px rgba(239,68,68,0.5)" }}>
                          {c.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: thread */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col"
          style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          {selectedSantri ? (
            <>
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #d4a843, #b8922f)" }}>
                  <User size={16} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 text-sm">{selectedSantri?.nama}</p>
                  <p className="text-xs text-slate-400">
                    NIS/NISN: {selectedSantri?.nisn} · Kelas: {selectedSantri?.classes?.name?.replace(/^\d+\s*/i, '') || "—"}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3" style={{ maxHeight: "420px" }}>
                {loadingMsg ? (
                  <div className="text-center py-8">
                    <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-8">Belum ada pesan</p>
                ) : (
                  messages.map((msg) => {
                    const isWali = msg.sender_type === "wali";
                    return (
                      <div key={msg.id} className={`flex items-end gap-2 ${isWali ? "" : "flex-row-reverse"} group`}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold"
                          style={{ background: isWali ? "linear-gradient(135deg, #d4a843, #b8922f)" : "linear-gradient(135deg, #0d3b2e, #1a6b4f)" }}>
                          {isWali ? "W" : "A"}
                        </div>
                        <div className={`relative max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed text-white`} style={{
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
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Hapus pesan"
                          >
                            <Trash2 size={11} className="text-red-400" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <div className="p-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <EmojiPicker onSelect={(e) => setInput((v) => v + e)} />
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    placeholder="Ketik balasan..."
                    className="flex-1 text-sm px-4 py-2.5 rounded-xl outline-none"
                    style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#1e293b" }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || sending}
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-opacity disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg, #0d3b2e, #1a6b4f)" }}
                  >
                    {sending ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send size={15} className="text-white" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle size={48} className="text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">Pilih percakapan</p>
                <p className="text-slate-300 text-sm mt-1">Klik santri dari daftar di sebelah kiri</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
