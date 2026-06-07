'use client';

// RichTextEditor.tsx — Editor WYSIWYG berbasis Tiptap dengan fitur AI Groq

import React, { useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import {
  Bold, Italic, Underline as UIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Undo, Redo,
  Heading1, Heading2, Heading3, Link as LinkIcon,
  Highlighter, Minus, Sparkles, Loader2, ChevronDown,
  Type,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Props {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
  minHeight?: number;
}

// ─── Toolbar helpers ──────────────────────────────────────────────────────────

function Sep() {
  return <div className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />;
}

function Btn({
  onClick, active = false, disabled = false, title, children,
}: {
  onClick: () => void; active?: boolean; disabled?: boolean;
  title: string; children: React.ReactNode;
}) {
  return (
    <button type="button" title={title} disabled={disabled} onClick={onClick}
      className={[
        'p-1.5 rounded text-sm transition-all flex items-center justify-center min-w-[28px]',
        active  ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900',
        disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}>
      {children}
    </button>
  );
}

// ─── AI Dropdown ─────────────────────────────────────────────────────────────

const AI_ACTIONS = [
  { key: 'structure', icon: '🗂️', label: 'Susun jadi artikel terstruktur', desc: 'Pendahuluan → Isi → Kesimpulan' },
  { key: 'improve',   icon: '✨', label: 'Perbaiki tulisan',               desc: 'Tata bahasa & gaya penulisan' },
  { key: 'expand',    icon: '📝', label: 'Kembangkan & perluas',           desc: 'Tambah detail & contoh' },
  { key: 'shorten',   icon: '✂️', label: 'Persingkat',                     desc: 'Lebih padat & ringkas' },
  { key: 'formal',    icon: '👔', label: 'Buat lebih formal',              desc: 'Cocok untuk publikasi resmi' },
  { key: 'simple',    icon: '💬', label: 'Sederhanakan bahasa',            desc: 'Mudah dipahami semua orang' },
  { key: 'summarize', icon: '📋', label: 'Ringkas menjadi poin',           desc: 'Format bullet points' },
];

function AIMenu({ onSelect, loading }: { onSelect: (a: string) => void; loading: boolean }) {
  const [open, setOpen] = useState(false);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = React.useState({ top: 0, right: 0 });

  const handleOpen = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + window.scrollY + 6,
      right: window.innerWidth - rect.right,
    });
    setOpen(p => !p);
  };

  return (
    <div className="relative ml-1">
      <button ref={btnRef} type="button" disabled={loading} onClick={handleOpen}
        className={[
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all select-none',
          'bg-gradient-to-r from-violet-600 to-indigo-600 text-white',
          'hover:from-violet-700 hover:to-indigo-700 shadow-sm active:scale-95',
          loading ? 'opacity-70 cursor-wait' : 'cursor-pointer',
        ].join(' ')}>
        {loading
          ? <Loader2 size={12} className="animate-spin" />
          : <Sparkles size={12} />}
        <span>AI</span>
        <ChevronDown size={10} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && !loading && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[999]" onClick={() => setOpen(false)} />
          {/* Menu — posisi fixed agar tidak terpotong */}
          <div
            className="fixed z-[1000] bg-white rounded-2xl border border-slate-200 shadow-2xl py-2 w-64"
            style={{ top: menuPos.top, right: menuPos.right }}
          >
            <div className="px-4 py-2 border-b border-slate-100">
              <p className="text-[11px] font-bold text-violet-600 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles size={10} /> Asisten AI
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Pilih tindakan untuk artikel ini</p>
            </div>
            <div className="py-1">
              {AI_ACTIONS.map(a => (
                <button key={a.key} type="button"
                  onClick={() => { onSelect(a.key); setOpen(false); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-violet-50 transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base leading-none">{a.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-slate-800 group-hover:text-violet-700 leading-tight">{a.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{a.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Color Picker ─────────────────────────────────────────────────────────────

const COLORS = [
  '#000000','#1e293b','#dc2626','#ea580c','#ca8a04',
  '#16a34a','#0891b2','#2563eb','#7c3aed','#be185d',
  '#ffffff','#f1f5f9','#fef2f2','#fefce8','#f0fdf4',
];

function ColorPicker({ onColor }: { onColor: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = React.useState({ top: 0, left: 0 });

  const handleOpen = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + window.scrollY + 6, left: rect.left });
    setOpen(p => !p);
  };

  return (
    <div className="relative">
      <button ref={btnRef} type="button" title="Warna Teks" onClick={handleOpen}
        className="p-1.5 rounded text-slate-600 hover:bg-slate-200 flex items-center gap-0.5 cursor-pointer">
        <Type size={14} />
        <ChevronDown size={9} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[999]" onClick={() => setOpen(false)} />
          <div className="fixed z-[1000] bg-white rounded-xl border border-slate-200 shadow-xl p-2.5 w-36"
            style={{ top: menuPos.top, left: menuPos.left }}>
            <p className="text-[10px] text-slate-400 mb-2 font-medium">Warna Teks</p>
            <div className="grid grid-cols-5 gap-1">
              {COLORS.map(c => (
                <button key={c} type="button"
                  onClick={() => { onColor(c); setOpen(false); }}
                  className="w-5 h-5 rounded border border-slate-200 hover:scale-125 transition-transform"
                  style={{ background: c }} title={c} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Editor ─────────────────────────────────────────────────────────────

export default function RichTextEditor({
  value,
  onChange,
  disabled = false,
  placeholder = 'Tulis konten artikel di sini...',
  minHeight = 400,
}: Props) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStatus, setAiStatus]   = useState('');   // info/loading text
  const [aiError, setAiError]     = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ bulletList: { keepMarks: true }, orderedList: { keepMarks: true } }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: { attributes: { class: 'outline-none' } },
  });

  // Sync konten saat value berubah dari luar (fetch async saat edit)
  const prevRef = React.useRef(value);
  React.useEffect(() => {
    if (!editor) return;
    if (value !== prevRef.current && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', false);
      prevRef.current = value;
    }
  }, [editor, value]);

  // Hanya gunakan placeholder agar tidak dianggap unused oleh ESLint
  void placeholder;

  // Link
  const handleLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href ?? '';
    const url  = window.prompt('Masukkan URL:', prev);
    if (url === null) return;
    if (!url) { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  // AI
  const handleAI = useCallback(async (action: string) => {
    if (!editor) return;
    const text = editor.getText().trim();
    if (!text) {
      setAiError('Tulis atau paste konten artikel terlebih dahulu sebelum menggunakan AI.');
      return;
    }

    setAiLoading(true);
    setAiError('');
    const label = AI_ACTIONS.find(a => a.key === action)?.label ?? 'Memproses';
    setAiStatus(`${label}...`);

    try {
      const res = await fetch('/api/ai/artikel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, text }),
      });

      const json = await res.json();

      if (!res.ok) {
        setAiError(json.message ?? 'AI gagal memproses. Coba lagi.');
        return;
      }

      const html: string = json.html ?? '';
      if (!html.trim()) {
        setAiError('AI tidak menghasilkan konten. Coba lagi.');
        return;
      }

      editor.commands.setContent(html, false);
      onChange(editor.getHTML());
      setAiStatus('');
    } catch (e) {
      console.error('[RichTextEditor AI]', e);
      setAiError('Koneksi ke AI gagal. Periksa jaringan dan coba lagi.');
    } finally {
      setAiLoading(false);
    }
  }, [editor, onChange]);

  if (!editor) return null;

  const wordCount = editor.getText().trim().split(/\s+/).filter(Boolean).length;
  const charCount = editor.getText().length;

  return (
    <div className={`rounded-xl border border-slate-200 overflow-visible bg-white shadow-sm ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>

      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-0.5 px-2.5 py-2 border-b border-slate-200 bg-slate-50/80 overflow-x-auto sticky top-0 z-20 rounded-t-xl">

        {/* Heading */}
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })} title="Judul Besar (H1)">
          <Heading1 size={14} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })} title="Sub Judul (H2)">
          <Heading2 size={14} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })} title="Sub-sub Judul (H3)">
          <Heading3 size={14} />
        </Btn>

        <Sep />

        {/* Format */}
        <Btn onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')} title="Tebal (Ctrl+B)">
          <Bold size={13} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')} title="Miring (Ctrl+I)">
          <Italic size={13} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')} title="Garis bawah (Ctrl+U)">
          <UIcon size={13} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')} title="Coret">
          <Strikethrough size={13} />
        </Btn>

        <Sep />

        {/* Warna */}
        <ColorPicker onColor={c => editor.chain().focus().setColor(c).run()} />
        <Btn onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
          active={editor.isActive('highlight')} title="Stabilo">
          <Highlighter size={13} />
        </Btn>

        <Sep />

        {/* Align */}
        <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()}
          active={editor.isActive({ textAlign: 'left' })} title="Rata kiri">
          <AlignLeft size={13} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()}
          active={editor.isActive({ textAlign: 'center' })} title="Tengah">
          <AlignCenter size={13} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()}
          active={editor.isActive({ textAlign: 'right' })} title="Rata kanan">
          <AlignRight size={13} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          active={editor.isActive({ textAlign: 'justify' })} title="Rata kanan-kiri">
          <AlignJustify size={13} />
        </Btn>

        <Sep />

        {/* List */}
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')} title="Daftar butir">
          <List size={13} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')} title="Daftar bernomor">
          <ListOrdered size={13} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')} title="Kutipan">
          <Quote size={13} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Garis pemisah">
          <Minus size={13} />
        </Btn>

        <Sep />

        {/* Link */}
        <Btn onClick={handleLink} active={editor.isActive('link')} title="Tambah/ubah link">
          <LinkIcon size={13} />
        </Btn>

        <Sep />

        {/* Undo / Redo */}
        <Btn onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()} title="Batalkan (Ctrl+Z)">
          <Undo size={13} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()} title="Ulangi (Ctrl+Y)">
          <Redo size={13} />
        </Btn>

        <div className="flex-1" />

        {/* AI */}
        <AIMenu onSelect={handleAI} loading={aiLoading} />
      </div>

      {/* ── Status / error bar ────────────────────────────────────────── */}
      {aiLoading && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-violet-50 border-b border-violet-100">
          <Loader2 size={13} className="animate-spin text-violet-500" />
          <span className="text-xs text-violet-700 font-medium">{aiStatus || 'AI sedang memproses...'}</span>
          <span className="text-xs text-violet-400">Harap tunggu sebentar</span>
        </div>
      )}
      {aiError && !aiLoading && (
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-red-50 border-b border-red-100">
          <span className="text-xs text-red-600">⚠ {aiError}</span>
          <button type="button" onClick={() => setAiError('')}
            className="text-red-400 hover:text-red-600 text-xs px-1">✕</button>
        </div>
      )}

      {/* ── Editor ────────────────────────────────────────────────────── */}
      <div style={{ minHeight }}
        className="relative cursor-text"
        onClick={() => editor.commands.focus()}>
        <style>{`
          /* Placeholder */
          .ProseMirror p.is-empty:first-child::before {
            content: attr(data-placeholder);
            color: #94a3b8;
            pointer-events: none;
            float: left;
            height: 0;
          }
          /* Base */
          .ProseMirror { outline: none; padding: 16px 20px; min-height: ${minHeight}px; font-size: 0.9rem; line-height: 1.8; color: #1e293b; }
          /* Heading */
          .ProseMirror h1 { font-size: 1.6rem; font-weight: 800; margin: 1.2em 0 0.5em; line-height: 1.25; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3em; }
          .ProseMirror h2 { font-size: 1.25rem; font-weight: 700; margin: 1em 0 0.4em; line-height: 1.3; color: #1e293b; }
          .ProseMirror h3 { font-size: 1.05rem; font-weight: 600; margin: 0.8em 0 0.3em; color: #334155; }
          /* Paragraph */
          .ProseMirror p  { margin: 0 0 0.75em; }
          .ProseMirror p:last-child { margin-bottom: 0; }
          /* List */
          .ProseMirror ul { list-style: disc outside; padding-left: 1.5em; margin: 0.5em 0 0.75em; }
          .ProseMirror ol { list-style: decimal outside; padding-left: 1.5em; margin: 0.5em 0 0.75em; }
          .ProseMirror li { margin: 0.25em 0; }
          /* Blockquote */
          .ProseMirror blockquote {
            border-left: 3px solid #10b981; padding: 8px 16px;
            margin: 0.75em 0; color: #475569; background: #f0fdf4;
            border-radius: 0 8px 8px 0; font-style: italic;
          }
          /* Code */
          .ProseMirror code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.85em; font-family: monospace; }
          /* HR */
          .ProseMirror hr { border: none; border-top: 2px solid #e2e8f0; margin: 1.5em 0; }
          /* Link */
          .ProseMirror a { color: #059669; text-decoration: underline; }
          /* Highlight */
          .ProseMirror mark { border-radius: 2px; padding: 1px 3px; }
          /* Selection */
          .ProseMirror ::selection { background: rgba(16,185,129,0.15); }
        `}</style>

        <EditorContent editor={editor} />
      </div>

      {/* ── Footer: word count ───────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50/80 border-t border-slate-100 rounded-b-xl">
        <span className="text-[11px] text-slate-400">
          {charCount.toLocaleString()} karakter · {wordCount.toLocaleString()} kata
        </span>
        <span className="text-[11px] text-violet-400 flex items-center gap-1">
          <Sparkles size={10} />
          Didukung AI Groq
        </span>
      </div>
    </div>
  );
}
