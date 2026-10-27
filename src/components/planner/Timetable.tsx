'use client';

import { useMemo } from 'react';

import { findConflicts } from '@/lib/ffcs/conflicts';
import { DAY_LABEL, clock } from '@/lib/ffcs/format';
import { DAYS } from '@/lib/ffcs/grid';
import type { SolveResult } from '@/lib/ffcs/types';

const START = 8 * 60;
const CEILING = 19 * 60 + 20;
const FLOOR = 13 * 60;
const SCALE = 0.85;

export default function Timetable({
  result,
  solving,
}: {
  result: SolveResult | null;
  solving: boolean;
}) {
  const entries = useMemo(() => result?.solutions[0]?.entries ?? [], [result]);
  const conflicted = useMemo(
    () => new Set(findConflicts(entries).flatMap((conflict) => [conflict.a, conflict.b])),
    [entries],
  );

  const lastEnd = useMemo(
    () => entries.reduce((max, entry) => Math.max(max, ...entry.cells.map((cell) => cell.end), 0), 0),
    [entries],
  );
  const end = Math.min(CEILING, Math.max(FLOOR, lastEnd + 30));
  const height = (end - START) * SCALE;
  const hours = Array.from(
    { length: Math.ceil((end - START) / 60) },
    (_, index) => 8 + index,
  );

  if (entries.length === 0) {
    return (
      <div id="timetable-export" className="bg-panel px-6 py-14 text-center">
        <svg viewBox="0 0 24 24" className="mx-auto mb-3 h-8 w-8 text-lime" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 19a9 9 0 0 1 18 0" />
          <path d="M8 19a4 4 0 0 1 8 0" />
        </svg>
        <p className="font-display text-lg font-bold">No classes yet</p>
        <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted">
          Ask the agent for a plan, or search a course above. The grid runs 08:00 to 19:20, Monday to
          Friday.
        </p>
      </div>
    );
  }

  return (
    <div
      id="timetable-export"
      className={`bg-panel p-3 ${solving ? 'opacity-70' : ''}`}
      aria-busy={solving}
    >
      <div className="grid grid-cols-[44px_repeat(5,1fr)] border-b border-line pb-1.5">
        <div />
        {DAYS.map((day) => (
          <div
            key={day}
            className="border-l border-line text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted"
          >
            {DAY_LABEL[day]}
          </div>
        ))}
      </div>

      <div className="relative" style={{ height }}>
        {hours.map((hour) => (
          <div
            key={hour}
            className="absolute left-[44px] right-0 border-t border-line/70"
            style={{ top: (hour * 60 - START) * SCALE }}
          />
        ))}

        {hours.map((hour) => (
          <span
            key={`label-${hour}`}
            className="absolute left-0 w-[38px] -translate-y-1/2 text-right font-mono text-[10px] tabular-nums text-muted"
            style={{ top: Math.max(6, (hour * 60 - START) * SCALE) }}
          >
            {String(hour).padStart(2, '0')}
          </span>
        ))}

        <div className="absolute inset-y-0 left-[44px] right-0 grid grid-cols-5">
          {DAYS.map((day) => (
            <div key={day} className="relative border-l border-line">
              {entries.flatMap((entry) =>
                entry.cells
                  .filter((cell) => cell.day === day)
                  .map((cell) => {
                    const height = cell.end - cell.start;
                    const clash = conflicted.has(entry.id);

                    return (
                      <div
                        key={`${entry.id}-${cell.start}`}
                        className={`absolute inset-x-1 overflow-hidden rounded-lg border bg-[#26263a] px-1.5 py-1 ${
                          clash ? 'border-red' : 'border-[#3d3d5c]'
                        }`}
                        style={{
                          top: (cell.start - START) * SCALE + 1,
                          height: (cell.end - cell.start) * SCALE - 2,
                        }}
                        title={`${entry.code} ${entry.title} — ${entry.faculty}${entry.venue ? ` — ${entry.venue}` : ''} — ${clock(cell.start)}–${clock(cell.end)}`}
                      >
                        <span className="inline-block rounded bg-purple px-1 font-mono text-[9px] font-medium text-on-bright">
                          {entry.slots.join('+')}
                        </span>
                        <p className="mt-0.5 truncate text-[10px] leading-tight">{entry.title}</p>
                        {height >= 56 && (
                          <p className="truncate font-mono text-[9px] leading-tight text-muted">
                            {entry.faculty}
                          </p>
                        )}
                        {height >= 76 && entry.venue && (
                          <p className="truncate font-mono text-[9px] leading-tight text-muted">
                            {entry.venue}
                          </p>
                        )}
                      </div>
                    );
                  }),
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
