'use client';

import type { SolveResult, TimetableState } from '@/lib/ffcs/types';

import { Panel } from '../ui/Panel';

type Props = {
  state: TimetableState;
  result: SolveResult | null;
  onRemove: (code: string) => void;
};

export default function SelectedCourses({ state, result, onRemove }: Props) {
  const entries = new Map(
    (result?.solutions[0]?.entries ?? []).map((entry) => [entry.code, entry]),
  );
  const unsolved = new Set(result?.unsolved ?? []);

  const contactHours = (result?.solutions[0]?.entries ?? []).reduce(
    (total, entry) =>
      total + entry.cells.reduce((sum, cell) => sum + (cell.end - cell.start), 0) / 60,
    0,
  );

  const placed = result?.solutions[0]?.entries ?? [];
  const credits = placed.reduce((total, entry) => total + (entry.credits ?? 0), 0);
  const creditsComplete = placed.length > 0 && placed.every((entry) => entry.credits !== null);
  const creditsLabel =
    placed.length === 0 ? '' : ` · ${credits}${creditsComplete ? '' : '+'} credits`;

  return (
    <Panel
      title="Selected courses"
      mark="sparkle"
      action={
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
          {state.requirements.length} courses · {Math.round(contactHours * 10) / 10} h/week
          {creditsLabel}
        </span>
      }
    >
      {state.requirements.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted">
          Nothing selected yet. Add a course above or ask the agent.
        </p>
      ) : (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                <th className="px-1 pb-2 font-normal">Slot</th>
                <th className="px-1 pb-2 font-normal">Code</th>
                <th className="px-1 pb-2 font-normal">Title</th>
                <th className="hidden px-1 pb-2 font-normal sm:table-cell">Faculty</th>
                <th className="hidden px-1 pb-2 font-normal md:table-cell">Venue</th>
                <th className="hidden px-1 pb-2 text-right font-normal sm:table-cell">Cr</th>
                <th className="px-1 pb-2" />
              </tr>
            </thead>
            <tbody>
              {state.requirements.map((requirement) => {
                const entry = entries.get(requirement.courseCode);
                const failed = unsolved.has(requirement.courseCode);

                return (
                  <tr key={requirement.courseCode} className="border-t border-line align-middle">
                    <td className="px-1 py-2">
                      <span className="rounded bg-purple px-1.5 py-0.5 font-mono text-[10px] text-on-bright">
                        {entry?.slots.join('+') ?? '—'}
                      </span>
                    </td>
                    <td className="px-1 py-2 font-mono text-[11px]">{requirement.courseCode}</td>
                    <td className="max-w-[240px] truncate px-1 py-2 text-[13px]">
                      {entry?.title ?? '—'}
                      {failed && (
                        <span className="ml-2 font-mono text-[9px] uppercase text-red">
                          can’t place
                        </span>
                      )}
                    </td>
                    <td className="hidden max-w-[160px] truncate px-1 py-2 text-[11px] text-muted sm:table-cell">
                      {entry?.faculty ?? '—'}
                    </td>
                    <td className="hidden px-1 py-2 font-mono text-[10px] text-muted md:table-cell">
                      {entry?.venue ?? '—'}
                    </td>
                    <td className="hidden px-1 py-2 text-right font-mono text-[10px] text-muted sm:table-cell">
                      {entry?.credits ?? '—'}
                    </td>
                    <td className="px-1 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => onRemove(requirement.courseCode)}
                        aria-label={`Remove ${requirement.courseCode}`}
                        className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] text-muted hover:border-red hover:text-red"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
