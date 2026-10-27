'use client';

import { DAY_LABEL, clock } from '@/lib/ffcs/format';
import { DAYS } from '@/lib/ffcs/grid';
import type { SolveResult } from '@/lib/ffcs/types';

export default function Agenda({ result }: { result: SolveResult | null }) {
  const entries = result?.solutions[0]?.entries ?? [];

  return (
    <div id="agenda-export" className="space-y-2 bg-panel p-3">
      {DAYS.map((day) => {
        const blocks = entries
          .flatMap((entry) =>
            entry.cells.filter((cell) => cell.day === day).map((cell) => ({ entry, cell })),
          )
          .sort((a, b) => a.cell.start - b.cell.start);

        if (blocks.length === 0) return null;

        return (
          <section key={day} className="rounded-xl border border-line bg-panel-2 p-2.5">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              {DAY_LABEL[day]}
            </h3>
            <ul className="mt-1.5 space-y-2">
              {blocks.map(({ entry, cell }) => (
                <li key={`${entry.id}-${cell.start}`} className="flex gap-2">
                  <span className="w-[86px] shrink-0 font-mono text-[10px] tabular-nums text-muted">
                    {clock(cell.start)}–{clock(cell.end)}
                  </span>
                  <div className="min-w-0">
                    <span className="rounded bg-purple px-1 font-mono text-[9px] text-on-bright">
                      {entry.slots.join('+')}
                    </span>
                    <p className="mt-0.5 truncate text-[13px] leading-tight">{entry.title}</p>
                    <p className="truncate font-mono text-[10px] text-muted">
                      {entry.code} · {entry.faculty}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {entries.length === 0 && (
        <p className="px-2 py-10 text-center text-xs text-muted">
          Nothing scheduled. Ask the agent or add a course.
        </p>
      )}
    </div>
  );
}
