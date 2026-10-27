'use client';

import { useState } from 'react';

import { usePlanner } from '@/hooks/usePlanner';
import { DAY_LABEL, clock } from '@/lib/ffcs/format';
import { DAYS } from '@/lib/ffcs/grid';
import type { CourseSummary } from '@/lib/ffcs/search';

import AdSlot from '../ads/AdSlot';
import Doodles from '../ui/Doodles';
import { Panel } from '../ui/Panel';
import AddCoursePanel from './AddCoursePanel';
import Agenda from './Agenda';
import Chat from './Chat';
import CoursePicker from './CoursePicker';
import ExportButton from './ExportButton';
import SelectedCourses from './SelectedCourses';
import Timetable from './Timetable';

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
  const [school, setSchool] = useState<string | null>(null);
  const [selected, setSelected] = useState<CourseSummary | null>(null);
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
    <div className="relative min-h-dvh pb-24 lg:pb-6">
      <Doodles />

      <div className="relative mx-auto max-w-[1440px] px-3 py-3 sm:px-4 lg:px-6">
        <header className="mb-3 flex items-center justify-between gap-3 rounded-[var(--radius-panel)] border border-line bg-panel px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Mark />
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-extrabold leading-none tracking-tight">
                FFCS planner
              </p>
              <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
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
          </div>
        </header>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_388px] lg:gap-4">
          <main className="min-w-0 space-y-3 lg:space-y-4">
            <div className="grid gap-3 md:grid-cols-2 lg:gap-4">
              <Panel title="Course preferences" mark="circle" bodyClassName="p-3">
                <CoursePicker
                  schools={schools}
                  school={school}
                  onSchool={setSchool}
                  selected={selected}
                  onSelect={setSelected}
                />
              </Panel>

              <Panel title="Add course" mark="square" bodyClassName="p-3">
                <AddCoursePanel course={selected} onAdd={planner.add} />
              </Panel>
            </div>

            <Panel
              title="Timetable"
              mark="triangle"
              action={<ExportButton disabled={solution === null} />}
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

              <div className="hidden lg:block">
                <Timetable result={planner.result} solving={planner.solving} />
              </div>
              <div className="lg:hidden">
                <Agenda result={planner.result} />
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
              />
            </div>
          </aside>
        </div>
      </div>

      {!agentOpen && (
        <button
          type="button"
          onClick={() => setAgentOpen(true)}
          className="fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full bg-pink px-4 py-3 font-display text-sm font-bold text-on-bright transition-transform hover:scale-[1.03] active:scale-95 lg:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
            <path d="M4 5h16v11H9l-5 4V5Z" />
          </svg>
          Ask the agent
        </button>
      )}
    </div>
  );
}
