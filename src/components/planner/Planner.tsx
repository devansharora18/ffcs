'use client';

import { useState } from 'react';

import { usePlanner } from '@/hooks/usePlanner';

import AdSlot from '../ads/AdSlot';
import Agenda from './Agenda';
import Chat from './Chat';
import CoursePicker from './CoursePicker';
import ExportButton from './ExportButton';
import Requirements from './Requirements';
import Timetable from './Timetable';

export default function Planner({ courseCount }: { courseCount: number }) {
  const planner = usePlanner();
  const [tab, setTab] = useState<'planner' | 'agent'>('planner');

  const solution = planner.result?.solutions[0] ?? null;
  const unsolved = planner.result?.unsolved ?? [];
  const noArrangement =
    planner.state.requirements.length > 0 &&
    planner.result !== null &&
    planner.result.solutions.length === 0;

  return (
    <div className="min-h-dvh pb-12 lg:pb-0">
      <header className="border-b border-ink">
        <div className="mx-auto flex max-w-[1440px] items-baseline justify-between gap-4 px-4 py-3">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-sm font-medium tracking-[0.2em]">FFCS</span>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-muted sm:inline">
              Vellore · {courseCount} courses
            </span>
          </div>
          <div className="flex items-center gap-4">
            {planner.canUndo && (
              <button
                type="button"
                onClick={planner.undo}
                className="text-xs underline decoration-line underline-offset-4 hover:decoration-ink"
              >
                undo
              </button>
            )}
            {planner.state.requirements.length > 0 && (
              <button
                type="button"
                onClick={planner.reset}
                className="text-xs text-muted underline decoration-line underline-offset-4 hover:text-ink hover:decoration-ink"
              >
                clear
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[minmax(0,1fr)_380px]">
        <main
          className={`min-w-0 space-y-5 px-4 py-4 ${tab === 'agent' ? 'hidden lg:block' : ''}`}
        >
          <CoursePicker onAdd={planner.add} />

          <Requirements
            state={planner.state}
            result={planner.result}
            onRemove={planner.remove}
            onClearConstraints={() =>
              planner.setConstraints({
                avoidDays: [],
                avoidWindows: [],
                preferredFaculty: [],
                avoidedFaculty: [],
              })
            }
          />

          <section>
            <div className="flex items-baseline justify-between border-b border-ink pb-2">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.18em]">Timetable</h2>
              <ExportButton disabled={solution === null} />
            </div>

            {unsolved.length > 0 && (
              <p className="pt-2 text-xs text-signal">
                Cannot place {unsolved.join(', ')} — every offering breaks a constraint.
              </p>
            )}
            {noArrangement && unsolved.length === 0 && (
              <p className="pt-2 text-xs text-signal">
                No clash-free arrangement. Remove a course or relax a constraint.
              </p>
            )}

            <div className="hidden pt-3 lg:block">
              <Timetable result={planner.result} solving={planner.solving} />
            </div>
            <div className="pt-3 lg:hidden">
              <Agenda result={planner.result} />
            </div>
          </section>

          <AdSlot />

          <section className="border-t border-line pt-3">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
              How this works
            </h2>
            <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted">
              The agent reads the same catalog as the search. It never invents a slot: every change
              goes through the solver, which rejects overlaps down to the minute — including labs
              that run past the hour.
            </p>
          </section>
        </main>

        <aside
          className={`border-line lg:sticky lg:top-0 lg:h-dvh lg:border-l ${
            tab === 'agent' ? '' : 'hidden lg:block'
          }`}
        >
          <Chat state={planner.state} onAgentState={planner.applyAgent} />
        </aside>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-2 border-t border-ink bg-paper lg:hidden">
        {(['planner', 'agent'] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            aria-current={tab === item}
            className={`py-3 font-mono text-[10px] uppercase tracking-[0.18em] ${
              tab === item ? 'bg-ink text-paper' : 'text-muted'
            }`}
          >
            {item}
          </button>
        ))}
      </nav>
    </div>
  );
}
