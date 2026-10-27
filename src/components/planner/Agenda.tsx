'use client';

import { DAY_LABEL, clock } from '@/lib/ffcs/format';
import { DAYS } from '@/lib/ffcs/grid';
import type { SolveResult } from '@/lib/ffcs/types';

export default function Agenda({ result }: { result: SolveResult | null }) {
  const entries = result?.solutions[0]?.entries ?? [];

  return (
    <div id="agenda-export" className="bg-white">
      {DAYS.map((day) => {
        const blocks = entries
          .flatMap((entry) =>
            entry.cells.filter((cell) => cell.day === day).map((cell) => ({ entry, cell })),
          )
          .sort((a, b) => a.cell.start - b.cell.start);

        if (blocks.length === 0) return null;

        return (
          <section key={day} className="border-t border-line py-3">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              {DAY_LABEL[day]}
            </h3>
            <ul className="mt-1">
              {blocks.map(({ entry, cell }) => (
                <li key={`${entry.id}-${cell.start}`} className="flex gap-3 py-1">
                  <span className="w-[92px] shrink-0 font-mono text-[11px] tabular-nums">
                    {clock(cell.start)}–{clock(cell.end)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-[11px]">{entry.code}</p>
                    <p className="truncate text-sm">{entry.title}</p>
                    <p className="truncate text-xs text-muted">
                      {entry.faculty}
                      {entry.venue ? ` · ${entry.venue}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {entries.length === 0 && (
        <p className="border-t border-line py-6 text-sm text-muted">
          Nothing scheduled. Ask the agent or add a course.
        </p>
      )}
    </div>
  );
}
