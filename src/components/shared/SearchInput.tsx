'use client';

// src/components/shared/SearchInput.tsx
// Input pencarian dengan debounce 300ms.

import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  /** Nilai awal (controlled dari luar, opsional) */
  defaultValue?: string;
  /** Delay debounce dalam ms (default: 300) */
  debounceMs?: number;
  /** Callback dipanggil setelah debounce */
  onSearch: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function SearchInput({
  defaultValue = '',
  debounceMs = 300,
  onSearch,
  placeholder = 'Cari...',
  className = '',
  disabled = false,
}: SearchInputProps) {
  const [value, setValue] = useState(defaultValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external defaultValue changes
  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearch(newValue);
    }, debounceMs);
  };

  const handleClear = () => {
    setValue('');
    if (timerRef.current) clearTimeout(timerRef.current);
    onSearch('');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className={['relative flex items-center', className].join(' ')}>
      <Search
        size={16}
        className="absolute left-3 text-slate-400 pointer-events-none"
      />

      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={[
          'w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-slate-300 bg-white',
          'text-slate-800 placeholder-slate-400',
          'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500',
          'disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed',
          'transition-colors',
        ].join(' ')}
      />

      {value && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 p-0.5 rounded text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Hapus pencarian"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
