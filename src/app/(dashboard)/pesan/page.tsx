"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { MessageCircle, Send, Search, ArrowLeft, CheckCheck, Clock, User, Trash2 } from "lucide-react";
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

export default function PesanPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
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

  const markAsRead = async (msgId: string) => {
    try {
      await fetch("/api/messages/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_id: msgId }),
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, is_read: true } : m))
      );
    } catch {}
  };

  const sendReply = async () => {
    if (!selectedMsg || !replyText.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_id: selectedMsg.id, reply: replyText.trim() }),
      });

      if (res.ok) {
        setReplyText("");
        setToast({ type: "success", text: "Balasan berhasil dikirim!" });
        fetchMessages();
        setSelectedMsg(null);
      } else {
        setToast({ type: "error", text: "Gagal mengirim balasan" });
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
        if (selectedMsg?.id === msgId) setSelectedMsg(null);
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
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const filteredMessages = messages.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.message.toLowerCase().includes(q) ||
      m.sender_name.toLowerCase().includes(q) ||
      m.santri?.nama?.toLowerCase().includes(q) ||
      m.santri?.nisn?.includes(q)
    );
  });

  const unreadFromWali = messages.filter((m) => m.sender_type === "wali" && !m.is_read).length;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium text-white ${
          toast.type === "success" ? "bg-emerald-600" : "bg-red-500"
        }`} style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #0d3b2e, #1a6b4f)" }}>
            <MessageCircle size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Pesan Masuk</h1>
            <p className="text-sm text-slate-500">
              {unreadFromWali > 0 ? `${unreadFromWali} pesan belum dibaca` : "Semua pesan sudah dibaca"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-4" style={{ minHeight: "500px" }}>
        {/* Left: Message list */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
          style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          {/* Search */}
          <div className="p-3 border-b border-slate-100">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <Search size={14} className="text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari pesan..."
                className="flex-1 text-sm bg-transparent outline-none text-slate-700"
              />
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: "460px" }}>
            {loading ? (
              <div className="text-center py-12">
                <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageCircle size={36} className="text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Tidak ada pesan</p>
              </div>
            ) : (
              filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-center border-b border-slate-50 transition-colors ${
                    selectedMsg?.id === msg.id ? "bg-emerald-50" : "hover:bg-slate-50"
                  }`}
                >
                  <button
                    onClick={() => {
                      setSelectedMsg(msg);
                      if (!msg.is_read && msg.sender_type === "wali") markAsRead(msg.id);
                    }}
                    className="flex-1 text-left px-4 py-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: msg.sender_type === "wali" ? "linear-gradient(135deg, #d4a843, #b8922f)" : "linear-gradient(135deg, #0d3b2e, #1a6b4f)" }}>
                        <User size={14} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-sm font-semibold truncate ${!msg.is_read && msg.sender_type === "wali" ? "text-slate-900" : "text-slate-600"}`}>
                            {msg.santri?.nama ?? msg.sender_name}
                          </span>
                          {!msg.is_read && msg.sender_type === "wali" && (
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 ml-2"
                              style={{ boxShadow: "0 0 6px rgba(239,68,68,0.5)" }} />
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate">{msg.message}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {msg.reply ? (
                            <CheckCheck size={10} className="text-emerald-500" />
                          ) : (
                            <Clock size={10} className="text-slate-300" />
                          )}
                          <span className="text-[10px] text-slate-400">{formatDate(msg.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteMessage(msg.id); }}
                    className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mr-2 opacity-30 hover:opacity-100 hover:bg-red-50 transition-all"
                    title="Hapus pesan"
                  >
                    <Trash2 size={12} className="text-red-400" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Message detail */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col"
          style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          {selectedMsg ? (
            <>
              {/* Detail header */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #d4a843, #b8922f)" }}>
                  <User size={16} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 text-sm">{selectedMsg.santri?.nama ?? selectedMsg.sender_name}</p>
                  <p className="text-xs text-slate-400">
                    NIS/NISN: {selectedMsg.santri?.nisn} · Kelas: {selectedMsg.santri?.classes?.name?.replace(/^\d+\s*/i, '') || "—"}
                  </p>
                </div>
                <button
                  onClick={() => deleteMessage(selectedMsg.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center opacity-40 hover:opacity-100 hover:bg-red-50 transition-all"
                  title="Hapus pesan"
                >
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Wali message */}
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, #d4a843, #b8922f)" }}>
                    <span className="text-white text-xs font-bold">W</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-700">{selectedMsg.sender_name}</span>
                      <span className="text-xs text-slate-400">{formatDate(selectedMsg.created_at)}</span>
                    </div>
                    <div className="px-4 py-2.5 rounded-xl text-sm text-slate-700 leading-relaxed"
                      style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                      {selectedMsg.message}
                    </div>
                  </div>
                </div>

                {/* Kabid reply */}
                {selectedMsg.reply && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "linear-gradient(135deg, #0d3b2e, #1a6b4f)" }}>
                      <span className="text-white text-xs font-bold">A</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-700">Admin (Kabid)</span>
                        <span className="text-xs text-slate-400">
                          {selectedMsg.replied_at ? formatDate(selectedMsg.replied_at) : ""}
                        </span>
                      </div>
                      <div className="px-4 py-2.5 rounded-xl text-sm text-white leading-relaxed"
                        style={{ background: "linear-gradient(135deg, #0d3b2e, #1a6b4f)" }}>
                        {selectedMsg.reply}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Reply input */}
              {!selectedMsg.reply && (
                <div className="p-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendReply()}
                      placeholder="Ketik balasan..."
                      className="flex-1 text-sm px-4 py-2.5 rounded-xl outline-none"
                      style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#1e293b" }}
                    />
                    <button
                      onClick={sendReply}
                      disabled={!replyText.trim() || sending}
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
              )}

              {selectedMsg.reply && (
                <div className="p-4 border-t border-slate-100 text-center">
                  <p className="text-xs text-emerald-600 font-medium flex items-center justify-center gap-1">
                    <CheckCheck size={12} /> Balasan sudah dikirim
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle size={48} className="text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">Pilih pesan untuk dibaca</p>
                <p className="text-slate-300 text-sm mt-1">Klik pesan dari daftar di sebelah kiri</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
