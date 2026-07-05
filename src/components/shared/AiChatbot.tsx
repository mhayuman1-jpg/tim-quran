"use client";

import { useState, useRef, useEffect } from "react";
import { BookOpen, Send, MessageCircle } from "lucide-react";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const QUICK_REPLIES = [
  "Apa itu Tim Qur'an?",
  "Cara login Wali Murid",
  "Program Tahfidz",
  "Program Tahsin",
  "Sistem penilaian",
  "Kontak admin",
];

export default function AiChatbot({ variant = 'floating' }: { variant?: 'floating' | 'inline' }) {
  const [isOpen, setIsOpen] = useState(variant === "inline");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "Assalamu'alaikum! Saya Asisten AI Tim Qur'an. Ada yang bisa saya bantu mengenai program tahfidz, tahsin, atau website ini?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendToAI = async (text: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const history = [...messages, userMsg].map((m) => ({
        text: m.text,
        isUser: m.isUser,
      }));

      const res = await fetch("/api/ai/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: data.reply || "Maaf, saya tidak bisa memproses pertanyaan Anda saat ini.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: "Maaf, terjadi kesalahan koneksi. Silakan coba lagi atau hubungi admin sekolah.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessage = () => {
    const text = input.trim();
    if (!text || isTyping) return;
    sendToAI(text);
  };

  // ─── INLINE VARIANT ─────────────────────────────────────────────────────
  if (variant === "inline") {
    return (
      <div className="flex flex-col overflow-hidden w-full h-full border border-emerald-100 bg-white"
        style={{ borderRadius: "16px", boxShadow: "0 4px 24px rgba(13,59,46,0.08)", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ background: "linear-gradient(135deg, #0d3b2e, #1a6b4f)" }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/15">
            <BookOpen size={18} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">Tanya Asisten AI</p>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-emerald-200 text-xs">Online • Siap membantu</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0" style={{ background: "#f8faf8" }}>
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed"
                style={{
                  borderRadius: msg.isUser ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                  background: msg.isUser
                    ? "linear-gradient(135deg, #0d3b2e, #1a6b4f)"
                    : "#ffffff",
                  color: msg.isUser ? "#ffffff" : "#1e293b",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  border: msg.isUser ? "none" : "1px solid #e6f2ec",
                }}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="px-3.5 py-2.5 rounded-xl text-sm bg-white border border-emerald-100">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies */}
        <div className="px-3 py-2 flex gap-1.5 overflow-x-auto border-t border-emerald-100" style={{ background: "#f8faf8" }}>
          {QUICK_REPLIES.map((q) => (
            <button
              key={q}
              onClick={() => { if (!isTyping) sendToAI(q); }}
              disabled={isTyping}
              className="shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap disabled:opacity-40 hover:shadow-sm"
              style={{ background: "#e6f2ec", color: "#1a6b4f", border: "1px solid #d0e8dd" }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 px-4 py-3 bg-white border-t border-emerald-100">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ketik pertanyaan Anda..."
            disabled={isTyping}
            className="flex-1 text-sm px-3 py-2.5 rounded-xl outline-none transition-colors focus:border-emerald-300 disabled:opacity-50 bg-emerald-50/50 border border-emerald-200 text-slate-800"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isTyping}
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all hover:shadow-lg disabled:opacity-40 disabled:hover:shadow-none"
            style={{ background: "linear-gradient(135deg, #0d3b2e, #1a6b4f)" }}
          >
            {isTyping ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={16} className="text-white" />
            )}
          </button>
        </div>
      </div>
    );
  }

  // ─── FLOATING VARIANT ────────────────────────────────────────────────────
  return (
    <>
      {/* Floating Bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110"
        style={{
          background: "linear-gradient(135deg, #0d3b2e, #1a6b4f)",
          boxShadow: "0 4px 20px rgba(13,59,46,0.35)",
        }}
        aria-label={isOpen ? "Tutup chat" : "Buka chat"}
      >
        {isOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <MessageCircle size={24} className="text-white" />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 flex flex-col overflow-hidden"
          style={{
            width: "380px",
            height: "520px",
            borderRadius: "16px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.1)",
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3" style={{ background: "linear-gradient(135deg, #0d3b2e, #1a6b4f)" }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-white/15">
              <BookOpen size={18} className="text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">Asisten AI Tim Qur'an</p>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-emerald-200 text-xs">Online</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ background: "#f8faf8" }}>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed"
                  style={{
                    borderRadius: msg.isUser ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                    background: msg.isUser
                      ? "linear-gradient(135deg, #0d3b2e, #1a6b4f)"
                      : "#ffffff",
                    color: msg.isUser ? "#ffffff" : "#1e293b",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    border: msg.isUser ? "none" : "1px solid #e6f2ec",
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="px-3.5 py-2.5 rounded-xl text-sm bg-white border border-emerald-100">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies */}
          <div className="px-4 py-2 flex gap-1.5 overflow-x-auto border-t border-emerald-100" style={{ background: "#f8faf8" }}>
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                onClick={() => { if (!isTyping) sendToAI(q); }}
                disabled={isTyping}
                className="shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap disabled:opacity-40 hover:shadow-sm"
                style={{ background: "#e6f2ec", color: "#1a6b4f", border: "1px solid #d0e8dd" }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-4 py-3 bg-white border-t border-emerald-100">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ketik pertanyaan Anda..."
              disabled={isTyping}
              className="flex-1 text-sm px-3 py-2.5 rounded-xl outline-none transition-colors focus:border-emerald-300 disabled:opacity-50 bg-emerald-50/50 border border-emerald-200 text-slate-800"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isTyping}
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all hover:shadow-lg disabled:opacity-40 disabled:hover:shadow-none"
              style={{ background: "linear-gradient(135deg, #0d3b2e, #1a6b4f)" }}
            >
              {isTyping ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send size={16} className="text-white" />
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
