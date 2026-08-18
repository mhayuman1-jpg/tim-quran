// src/components/shared/SearchInput.tsx
// SearchInput komponen untuk pencarian di halaman siswa dan tahsin.
import React from 'react';

interface SearchInputProps {
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  onSearch: (value: string) => void;
}

export default function SearchInput({ defaultValue, placeholder, disabled, onSearch }: SearchInputProps) {
  const [value, setValue] = React.useState(defaultValue ?? '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    onSearch(v);
  };

  const handleClear = () => {
    setValue('');
    onSearch('');
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder ?? 'Cari...'}
        disabled={disabled}
        className="pl-8 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent w-full disabled:bg-slate-100 disabled:cursor-not-allowed"
      />
      <svg
        className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          aria-label="Hapus"
        >
          x
        </button>
      )}
    </div>
  );
}
