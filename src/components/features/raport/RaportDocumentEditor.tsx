'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import {
  Bold, Italic, Underline as UIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Undo, Redo, Type, Highlighter, Minus,
  Table as TableIcon, Rows, Columns, Trash2,
} from 'lucide-react';
import { FontSize } from '@/lib/tiptap/font-size';

const FONT_SIZES = ['8px', '9px', '10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px'];

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
        active ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300' : 'text-slate-600 hover:bg-slate-200',
        disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}>
      {children}
    </button>
  );
}

interface Props {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
}

export default function RaportDocumentEditor({ value, onChange, disabled = false }: Props) {
  const prevRef = useRef(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ bulletList: { keepMarks: true }, orderedList: { keepMarks: true } }),
      Underline,
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true, HTMLAttributes: { style: 'border-collapse:collapse;width:100%;' } }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
    editorProps: {
      attributes: {
        class: 'raport-doc-editor prose max-w-none outline-none min-h-[800px] px-6 py-4',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value !== prevRef.current && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', false);
      prevRef.current = value;
    }
  }, [editor, value]);

  const setFontSize = useCallback((size: string) => {
    editor?.chain().focus().setFontSize(size).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={`rounded-xl border-2 border-amber-200 overflow-hidden bg-white shadow-sm ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-2 border-b border-amber-100 bg-amber-50/80 sticky top-0 z-20">
        <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Urungkan">
          <Undo size={14} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Ulangi">
          <Redo size={14} />
        </Btn>
        <Sep />

        <select
          className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white max-w-[88px]"
          defaultValue=""
          onChange={(e) => { if (e.target.value) setFontSize(e.target.value); e.target.value = ''; }}
          title="Ukuran huruf"
        >
          <option value="" disabled>Ukuran</option>
          {FONT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <Sep />

        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Tebal">
          <Bold size={13} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Miring">
          <Italic size={13} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Garis bawah">
          <UIcon size={13} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Coret">
          <Strikethrough size={13} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Sorot">
          <Highlighter size={13} />
        </Btn>
        <Sep />

        <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Rata kiri">
          <AlignLeft size={13} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Rata tengah">
          <AlignCenter size={13} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Rata kanan">
          <AlignRight size={13} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Rata kanan-kiri">
          <AlignJustify size={13} />
        </Btn>
        <Sep />

        <input
          type="color"
          title="Warna teks"
          className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
        />
        <Btn onClick={() => editor.chain().focus().unsetColor().run()} title="Reset warna">
          <Type size={13} />
        </Btn>
        <Sep />

        <Btn
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="Sisip tabel"
        >
          <TableIcon size={13} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().addRowAfter().run()} title="Tambah baris">
          <Rows size={13} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().addColumnAfter().run()} title="Tambah kolom">
          <Columns size={13} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().deleteTable().run()} title="Hapus tabel">
          <Trash2 size={13} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Garis pemisah">
          <Minus size={13} />
        </Btn>
      </div>

      <div className="bg-slate-100 p-4 overflow-x-auto">
        <div className="bg-white mx-auto shadow-md" style={{ width: '210mm', minHeight: '297mm' }}>
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
