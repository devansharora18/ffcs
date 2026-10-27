'use client';

import { useEffect, useMemo, useState } from 'react';

import { fetchSchoolCourses } from '@/lib/client/api';
import type { CourseSummary } from '@/lib/ffcs/search';

type Props = {
  schools: string[];
  onBuild: (codes: string[], school: string) => void;
};

const MAX_COURSES = 12;

export default function Onboarding({ schools, onBuild }: Props) {
  const [school, setSchool] = useState<string | null>(null);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!school) return;

    const controller = new AbortController();
    setLoading(true);
    setCourses([]);

    fetchSchoolCourses(school, controller.signal)
      .then((list) => setCourses(list))
      .catch(() => setCourses([]))
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [school]);

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const pool =
      needle.length === 0
        ? courses
        : courses.filter((course) =>
            `${course.code} ${course.title}`.toLowerCase().includes(needle),
          );
    return pool.slice(0, 60);
  }, [courses, filter]);

  function toggle(code: string) {
    setSelected((current) => {
      if (current.includes(code)) return current.filter((item) => item !== code);
      if (current.length >= MAX_COURSES) return current;
      return [...current, code];
    });
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl rounded-bl-sm bg-panel-2 px-3 py-2 text-[13px] leading-relaxed">
        Hi. Tell me your school and the courses you want, and I&apos;ll build the timetable.
      </div>

      <div className="flex flex-wrap gap-1.5">
        {schools.map((item) => {
          const active = school === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => {
                setSchool(item);
                setSelected([]);
                setFilter('');
              }}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
                active
                  ? 'border-lime bg-lime text-on-bright'
                  : 'border-line text-muted hover:border-purple hover:text-ink'
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>

      {school && (
        <>
          <div className="rounded-2xl rounded-bl-sm bg-panel-2 px-3 py-2 text-[13px] leading-relaxed">
            {loading
              ? 'Loading the catalog…'
              : `${school}. Pick your courses — tap a few, then build.`}
          </div>

          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter by code or title"
            aria-label="Filter courses"
            className="w-full rounded-xl border border-line bg-panel-2 px-2.5 py-1.5 text-xs placeholder:text-muted/70 focus:border-lime focus:outline-none"
          />

          <ul className="max-h-48 overflow-y-auto rounded-xl border border-line p-1">
            {visible.map((course) => {
              const active = selected.includes(course.code);
              return (
                <li key={course.code}>
                  <button
                    type="button"
                    onClick={() => toggle(course.code)}
                    aria-pressed={active}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                      active ? 'bg-purple/20' : 'hover:bg-panel-2'
                    }`}
                  >
                    <span className="shrink-0 font-mono text-[10px] text-purple">
                      {course.code}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px]">{course.title}</span>
                    <span
                      className={`h-3 w-3 shrink-0 rounded-full border ${
                        active ? 'border-lime bg-lime' : 'border-line'
                      }`}
                      aria-hidden
                    />
                  </button>
                </li>
              );
            })}
            {!loading && visible.length === 0 && (
              <li className="px-2 py-3 text-center text-xs text-muted">No course matches that.</li>
            )}
          </ul>

          {!loading && courses.length > visible.length && filter.trim().length === 0 && (
            <p className="font-mono text-[10px] text-muted">
              Showing {visible.length} of {courses.length} — filter to narrow.
            </p>
          )}

          <button
            type="button"
            disabled={selected.length === 0}
            onClick={() => onBuild(selected, school)}
            className="w-full rounded-xl bg-lime px-4 py-2 font-display text-sm font-bold text-on-bright transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-line disabled:text-muted disabled:hover:scale-100"
          >
            Build timetable{selected.length > 0 ? ` (${selected.length})` : ''}
          </button>
        </>
      )}
    </div>
  );
}
