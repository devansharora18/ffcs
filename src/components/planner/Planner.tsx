'use client';

import { useState } from 'react';

import { usePlanner } from '@/hooks/usePlanner';
import { DAY_LABEL, clock } from '@/lib/ffcs/format';
import { DAYS } from '@/lib/ffcs/grid';
import AdSlot from '../ads/AdSlot';
import Doodles from '../ui/Doodles';
import { Panel } from '../ui/Panel';
import Chat from './Chat';
import CourseBuilder from './CourseBuilder';
import ExportButton from './ExportButton';
import SelectedCourses from './SelectedCourses';
import SlotGrid from './SlotGrid';

function Mark() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden>
      <circle cx="10" cy="10" r="6" fill="#b8f24a" />
      <rect x="18" y="4" width="9" height="9" rx="2" fill="#b39dfb" />
      <path d="M15.5 18 21 27.5H10L15.5 18Z" fill="#ffd43a" />
    </svg>
  );
}

export default function Planner({
  courseCount,
  schools,
}: {
  courseCount: number;
  schools: string[];
}) {
  const planner = usePlanner();
  const [agentOpen, setAgentOpen] = useState(false);

  const solution = planner.result?.solutions[0] ?? null;
  const unsolved = planner.result?.unsolved ?? [];
  const noArrangement =
    planner.state.requirements.length > 0 &&
    planner.result !== null &&
    planner.result.solutions.length === 0;

  const constraints = planner.state.constraints;
  const chips = [
    ...constraints.avoidDays.map((day) => `no ${DAY_LABEL[DAYS[day]]}`),
    ...constraints.avoidWindows.map((window) => `free ${clock(window.start)}–${clock(window.end)}`),
    ...constraints.preferredFaculty.map((name) => `prefers ${name}`),
    ...constraints.avoidedFaculty.map((name) => `never ${name}`),
  ];

  const clearConstraints = () =>
    planner.setConstraints({
      avoidDays: [],
      avoidWindows: [],
      preferredFaculty: [],
      avoidedFaculty: [],
    });

  return (
    <div className="relative min-h-dvh pb-6">
      <Doodles />

      <div className="relative mx-auto max-w-[1440px] px-3 py-3 sm:px-4 lg:px-6">
        <header className="mb-3 flex items-center justify-between gap-3 rounded-[var(--radius-panel)] border border-line bg-panel px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Mark />
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-extrabold leading-none tracking-tight">
                FFCS<span className="hidden sm:inline"> planner</span>
              </p>
              <p className="mt-1 hidden truncate font-mono text-[10px] uppercase tracking-[0.16em] text-muted sm:block">
                Vellore · {courseCount} courses
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {planner.canUndo && (
              <button
                type="button"
                onClick={planner.undo}
                className="rounded-full border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted hover:border-lime hover:text-lime"
              >
                undo
              </button>
            )}
            {planner.state.requirements.length > 0 && (
              <button
                type="button"
                onClick={planner.reset}
                className="rounded-full border border-red/50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-red hover:bg-red hover:text-on-bright"
              >
                clear
              </button>
            )}
            <button
              type="button"
              onClick={() => setAgentOpen(true)}
              className="rounded-full bg-pink px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-on-bright lg:hidden"
            >
              agent
            </button>
          </div>
        </header>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-4">
          <main className="min-w-0 space-y-3 lg:space-y-4">
            <Panel title="Course preferences" mark="circle" bodyClassName="p-3">
              <CourseBuilder schools={schools} onAdd={planner.add} />
            </Panel>

            <Panel
              title="Timetable"
              mark="triangle"
              action={<ExportButton />}
              bodyClassName="p-0"
            >
              {(chips.length > 0 || unsolved.length > 0 || noArrangement) && (
                <div className="space-y-1.5 border-b border-line px-3 py-2">
                  {unsolved.length > 0 && (
                    <p className="text-[11px] text-red">
                      Cannot place {unsolved.join(', ')} — every offering breaks a constraint.
                    </p>
                  )}
                  {noArrangement && unsolved.length === 0 && (
                    <p className="text-[11px] text-red">
                      No clash-free arrangement. Remove a course or relax a constraint.
                    </p>
                  )}
                  {chips.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {chips.map((chip) => (
                        <span
                          key={chip}
                          className="rounded-full bg-panel-2 px-2 py-0.5 font-mono text-[10px] text-muted"
                        >
                          {chip}
                        </span>
                      ))}
                      <button
                        type="button"
                        onClick={clearConstraints}
                        className="rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-red hover:bg-red/10"
                      >
                        clear
                      </button>
                    </div>
                  )}
                </div>
              )}

              <SlotGrid result={planner.result} solving={planner.solving} />

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-3 py-2 font-mono text-[10px] text-muted">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-[2px] bg-lime" aria-hidden /> theory
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-[2px] bg-purple" aria-hidden /> lab
                </span>
                <span className="ml-auto">
                  {solution?.entries.length ?? 0} courses highlighted
                </span>
              </div>
            </Panel>

            <SelectedCourses
              state={planner.state}
              result={planner.result}
              onRemove={planner.remove}
            />

            <AdSlot />
          </main>

          <aside
            className={
              agentOpen
                ? 'fixed inset-0 z-40 bg-bg p-3 lg:static lg:z-auto lg:bg-transparent lg:p-0'
                : 'hidden lg:block'
            }
          >
            <div className="h-full overflow-hidden rounded-[var(--radius-panel)] border border-line bg-panel lg:sticky lg:top-3 lg:h-[calc(100dvh-1.5rem)]">
              <Chat
                state={planner.state}
                onAgentState={planner.applyAgent}
                onClose={() => setAgentOpen(false)}
                schools={schools}
                hasCourses={planner.state.requirements.length > 0}
                onBuild={planner.addMany}
              />
            </div>
          </aside>
        </div>
      </div>


    </div>
  );
}
