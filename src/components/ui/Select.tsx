'use client';

import { useEffect, useId, useRef, useState } from 'react';

export type SelectOption = { value: string; label: string };

type Props = {
  label: string;
  value: string | null;
  options: SelectOption[];
  onChange: (value: string | null) => void;
  disabled?: boolean;
  searchable?: boolean;
};

export default function Select({
  label,
  value,
  options,
  onChange,
  disabled = false,
  searchable = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();

  const selected = options.find((option) => option.value === value);
  const visible =
    query.trim().length === 0
      ? options
      : options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open && searchable) listRef.current?.querySelector('input')?.focus();
  }, [open, searchable]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        className={`flex w-full items-center justify-between gap-2 rounded-full border px-3 py-2 text-left text-xs transition-colors ${
          open ? 'border-lime' : 'border-line'
        } ${disabled ? 'cursor-not-allowed opacity-40' : 'hover:border-purple'} ${
          selected ? 'bg-lime text-on-bright' : 'bg-panel-2 text-muted'
        }`}
      >
        <span className="truncate">{selected?.label ?? label}</span>
        <svg
          viewBox="0 0 16 16"
          className={`h-3 w-3 shrink-0 ${selected ? 'text-on-bright' : 'text-muted'}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>

      {value && !disabled && (
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setOpen(false);
          }}
          aria-label={`Clear ${label}`}
          className={`absolute right-7 top-1/2 -translate-y-1/2 text-[13px] leading-none ${
            selected ? 'text-on-bright/70 hover:text-on-bright' : 'text-muted hover:text-ink'
          }`}
        >
          ×
        </button>
      )}

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-line bg-panel">
          {searchable && options.length > 8 && (
            <div className="border-b border-line p-1.5">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter…"
                aria-label={`Filter ${label}`}
                className="w-full rounded-lg bg-panel-2 px-2 py-1 text-xs placeholder:text-muted/70 focus:outline-none"
              />
            </div>
          )}
          <ul id={`${id}-list`} role="listbox" ref={listRef} className="max-h-60 overflow-y-auto p-1">
            {visible.map((option) => (
              <li key={option.value} role="option" aria-selected={option.value === value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`w-full truncate rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                    option.value === value ? 'bg-purple text-on-bright' : 'hover:bg-panel-2'
                  }`}
                >
                  {option.label}
                </button>
              </li>
            ))}
            {visible.length === 0 && (
              <li className="px-2 py-2 text-xs text-muted">Nothing matches.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
