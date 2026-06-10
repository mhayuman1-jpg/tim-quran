'use client';

// src/components/ui/Input.tsx
// Input komponen dengan label, error message, dan helper text.

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  /** Ikon di dalam input, sebelah kiri */
  leftAddon?: React.ReactNode;
  /** Ikon di dalam input, sebelah kanan */
  rightAddon?: React.ReactNode;
  /** Wrapper className */
  wrapperClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftAddon,
      rightAddon,
      id,
      className = '',
      wrapperClassName = '',
      required,
      ...props
    },
    ref
  ) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={['flex flex-col gap-1', wrapperClassName].join(' ')}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm md:text-base font-medium text-slate-700"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {leftAddon && (
            <span className="absolute left-3 text-slate-400 pointer-events-none">
              {leftAddon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            required={required}
            className={[
              'w-full rounded-lg border text-sm md:text-base text-slate-800 placeholder-slate-400',
              'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500',
              'transition-colors',
              error
                ? 'border-red-400 bg-red-50 focus:ring-red-400 focus:border-red-400'
                : 'border-slate-300 bg-white',
              'disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed',
              leftAddon ? 'pl-10' : 'pl-3',
              rightAddon ? 'pr-10' : 'pr-3',
              'py-2.5 md:py-2 min-h-[44px] md:min-h-auto',
              className,
            ].join(' ')}
            {...props}
          />

          {rightAddon && (
            <span className="absolute right-3 text-slate-400 pointer-events-none">
              {rightAddon}
            </span>
          )}
        </div>

        {error && (
          <p className="text-xs text-red-600" role="alert">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p className="text-xs text-slate-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
