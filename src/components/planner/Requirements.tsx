'use client';

import { DAY_LABEL, clock } from '@/lib/ffcs/format';
import { DAYS } from '@/lib/ffcs/grid';
import type { SolveResult, TimetableState } from '@/lib/ffcs/types';

type Props = {
  state: TimetableState;
  result: SolveResult | null;
  onRemove: (code: string) => void;
  onClearConstraints: () => void;
};

export default function Requirements({ state, result, onRemove, onClearConstraints }: Props) {
  const entries = new Map(
    (result?.solutions[0]?.entries ?? []).map((entry) => [entry.code, entry]),
  );
  const unsolved = new Set(result?.unsolved ?? []);
  const { constraints } = state;

  const chips = [
    ...constraints.avoidDays.map((day) => `no ${DAY_LABEL[DAYS[day]]}`),
    ...constraints.avoidWindows.map(
      (window) => `free ${clock(window.start)}–${clock(window.end)}`,
    ),
    ...constraints.preferredFaculty.map((name) => `prefers ${name}`),
    ...constraints.avoidedFaculty.map((name) => `never ${name}`),
  ];

  if (state.requirements.length === 0 && chips.length === 0) return null;

  return (
    <section className="border-t border-ink pt-3">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
        This timetable
      </h2>

      <ul className="mt-1 divide-y divide-line">
        {state.requirements.map((requirement) => {
          const entry = entries.get(requirement.courseCode);
          return (
            <li key={requirement.courseCode} className="flex items-baseline gap-3 py-1.5">
              <span className="font-mono text-[11px]">{requirement.courseCode}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{entry?.title ?? '—'}</span>
              <span className="hidden font-mono text-[10px] text-muted sm:inline">
                {entry?.slots.join('+') ?? ''}
              </span>
              <span className="hidden max-w-[28%] truncate text-xs text-muted sm:inline">
                {entry?.faculty ?? ''}
              </span>
              {unsolved.has(requirement.courseCode) && (
                <span className="font-mono text-[10px] uppercase text-signal">cannot place</span>
              )}
              <button
                type="button"
                onClick={() => onRemove(requirement.courseCode)}
                className="shrink-0 text-xs text-muted underline decoration-line underline-offset-4 hover:text-ink hover:decoration-ink"
              >
                remove
              </button>
            </li>
          );
        })}
      </ul>

      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {chips.map((chip) => (
            <span key={chip} className="font-mono text-[10px] uppercase tracking-wider text-muted">
              {chip}
            </span>
          ))}
          <button
            type="button"
            onClick={onClearConstraints}
            className="text-xs text-muted underline decoration-line underline-offset-4 hover:text-ink"
          >
            clear
          </button>
        </div>
      )}
    </section>
  );
}
