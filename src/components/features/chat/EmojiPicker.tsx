"use client";

import { useState } from "react";
import { Smile } from "lucide-react";

const EMOJIS = [
  "😀","😁","😂","🤣","😊","😇","🙂","😉","😍","🥰","😘","😋","😜","🤔","🤨","😐","😴","😎","🥳","😢","😭","😡","🤬","👍","👎","👏","🙏","💪","🙌","👌","🤝","❤️","🧡","💛","💚","💙","💜","🔥","✨","⭐","🎉","✅","❌","⚠️","💡","📌","📎","📷","🕒","🌹","🤲","😱","🥺","😏","😬","🤗","🤩","😮","😯","😪","🤤","😷","🤒","🥵","🥶","😕","🙄","😤","😠","💔","💖","💯","✍️","👋","💬","🔔","📝","📚","🕌","☪️","🤲","🌟","💫","🎯","🚀","💰","🎁","👶","🧑","👨","👩","🏠","🌿","🍀","🌸","🌺",
];

export default function EmojiPicker({ onSelect }: { onSelect: (e: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-opacity hover:opacity-80"
        style={{ background: "#f1f5f9" }}
        title="Emoji"
      >
        <Smile size={18} className="text-slate-500" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute bottom-12 left-0 z-20 w-64 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
            style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "2px" }}
          >
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => { onSelect(e); setOpen(false); }}
                className="text-xl leading-none rounded-lg hover:bg-slate-100 p-1"
              >
                {e}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
