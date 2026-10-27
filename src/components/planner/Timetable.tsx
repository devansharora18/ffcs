'use client';

import { useMemo } from 'react';

import { findConflicts } from '@/lib/ffcs/conflicts';
import { DAY_LABEL, clock } from '@/lib/ffcs/format';
import { DAYS } from '@/lib/ffcs/grid';
import type { SolveResult } from '@/lib/ffcs/types';

const START = 8 * 60;
const END = 19 * 60 + 20;
const HEIGHT = END - START;
const HOURS = Array.from({ length: Math.ceil((END - START) / 60) }, (_, index) => 8 + index);

export default function Timetable({ result, solving }: { result: SolveResult | null; solving: boolean }) {
  const entries = useMemo(() => result?.solutions[0]?.entries ?? [], [result]);
  const conflicted = useMemo(
    () => new Set(findConflicts(entries).flatMap((conflict) => [conflict.a, conflict.b])),
    [entries],
  );

  if (entries.length === 0) {
    return (
      <div id="timetable-export" className="border border-line bg-white p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">No courses yet</p>
        <p className="mt-2 max-w-sm text-sm">
          Ask the agent for a plan, or search a course above. The grid runs 08:00 to 19:20, Monday to
          Friday.
        </p>
      </div>
    );
  }

  return (
    <div
      id="timetable-export"
      className={`bg-white ${solving ? 'opacity-70' : ''}`}
      aria-busy={solving}
    >
      <div className="grid grid-cols-[52px_repeat(5,1fr)] border-b border-ink">
        <div />
        {DAYS.map((day) => (
          <div
            key={day}
            className="border-l border-line py-2 text-center font-mono text-[10px] uppercase tracking-[0.18em]"
          >
            {DAY_LABEL[day]}
          </div>
        ))}
      </div>

      <div className="relative" style={{ height: HEIGHT }}>
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="absolute left-[52px] right-0 border-t border-line"
            style={{ top: hour * 60 - START }}
          />
        ))}

        {HOURS.map((hour) => (
          <span
            key={`label-${hour}`}
            className="absolute left-0 w-[46px] -translate-y-1/2 text-right font-mono text-[10px] tabular-nums text-muted"
            style={{ top: Math.max(6, hour * 60 - START) }}
          >
            {String(hour).padStart(2, '0')}
          </span>
        ))}

        <div className="absolute inset-y-0 left-[52px] right-0 grid grid-cols-5">
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
                        className={`absolute inset-x-0.5 overflow-hidden border bg-white px-1.5 py-0.5 ${
                          clash ? 'border-signal' : 'border-ink'
                        }`}
                        style={{ top: cell.start - START, height }}
                        title={`${entry.code} ${entry.title} — ${entry.faculty}${entry.venue ? ` — ${entry.venue}` : ''} — ${clock(cell.start)}–${clock(cell.end)}`}
                      >
                        <p className="font-mono text-[10px] font-medium leading-tight">{entry.code}</p>
                        {height >= 36 && (
                          <p className="truncate text-[10px] leading-tight">{entry.title}</p>
                        )}
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
