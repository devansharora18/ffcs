'use client';

import { useState } from 'react';

import type { SavedTimetable } from '@/hooks/usePlanner';

type Props = {
  timetables: SavedTimetable[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
};

export default function TimetableTabs({
  timetables,
  activeId,
  onSelect,
  onCreate,
  onDuplicate,
  onRename,
  onDelete,
}: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  function commitRename() {
    if (editing) onRename(editing, draft);
    setEditing(null);
  }

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
      {timetables.map((timetable) => {
        const active = timetable.id === activeId;
        const count = timetable.state.requirements.length;

        return (
          <div
            key={timetable.id}
            className={`flex shrink-0 items-center gap-1 rounded-full border py-1 pl-3 pr-1.5 ${
              active
                ? 'border-lime bg-lime text-on-bright'
                : 'border-line bg-panel-2 text-muted hover:border-purple'
            }`}
          >
            {editing === timetable.id ? (
              <input
                autoFocus
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commitRename}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitRename();
                  if (event.key === 'Escape') setEditing(null);
                }}
                aria-label="Timetable name"
                className="w-24 bg-transparent text-[11px] font-bold text-on-bright outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => onSelect(timetable.id)}
                onDoubleClick={() => {
                  setEditing(timetable.id);
                  setDraft(timetable.name);
                }}
                title="Double-click to rename"
                aria-current={active}
                className="max-w-[140px] truncate text-[11px] font-bold"
              >
                {timetable.name}
              </button>
            )}

            {count > 0 && (
              <span
                className={`font-mono text-[9px] tabular-nums ${
                  active ? 'text-on-bright/60' : 'text-muted/70'
                }`}
              >
                {count}
              </span>
            )}

            {active && (
              <button
                type="button"
                onClick={() => onDuplicate(timetable.id)}
                aria-label={`Duplicate ${timetable.name}`}
                title="Duplicate this timetable"
                className="rounded-full p-1 hover:bg-on-bright/15"
              >
                <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
                  <path d="M10.5 5.5V4a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5" />
                </svg>
              </button>
            )}

            {timetables.length > 1 && (
              <button
                type="button"
                onClick={() => onDelete(timetable.id)}
                aria-label={`Delete ${timetable.name}`}
                className="rounded-full px-1 text-[13px] leading-none hover:bg-on-bright/15"
              >
                ×
              </button>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={onCreate}
        aria-label="New timetable"
        className="shrink-0 rounded-full border border-dashed border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-lime hover:text-lime"
      >
        + new
      </button>
    </div>
  );
}
