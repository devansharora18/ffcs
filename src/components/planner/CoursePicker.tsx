'use client';

import { useEffect, useState } from 'react';

import { fetchCourses } from '@/lib/client/api';
import type { CourseSummary } from '@/lib/ffcs/search';

type Props = {
  schools: string[];
  school: string | null;
  onSchool: (school: string | null) => void;
  selected: CourseSummary | null;
  onSelect: (course: CourseSummary) => void;
};

export default function CoursePicker({ schools, school, onSchool, selected, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        setResults(await fetchCourses(query.trim(), school, controller.signal));
      } catch {
        if (!controller.signal.aborted) setError('Search failed. Try again.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, school]);

  return (
    <div className="space-y-3">
      <div className="-mx-1 flex flex-wrap gap-1.5 px-1 pb-1">
        {[null, ...schools].map((item) => {
          const active = school === item;
          return (
            <button
              key={item ?? 'all'}
              type="button"
              onClick={() => onSchool(item)}
              aria-pressed={active}
              className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
                active
                  ? 'border-lime bg-lime text-on-bright'
                  : 'border-line text-muted hover:border-purple hover:text-ink'
              }`}
            >
              {item ?? 'All'}
            </button>
          );
        })}
      </div>

      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search code, title or teacher"
          autoComplete="off"
          aria-label="Search courses"
          className="w-full rounded-xl border border-line bg-panel-2 px-3 py-2.5 text-sm placeholder:text-muted/70 focus:border-lime focus:outline-none"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted">
            …
          </span>
        )}
      </div>

      {error && <p className="font-mono text-[11px] text-red">{error}</p>}

      <ul className="max-h-[300px] space-y-1 overflow-y-auto pr-1">
        {results.map((course) => {
          const active = selected?.code === course.code;
          return (
            <li key={course.code}>
              <button
                type="button"
                onClick={() => onSelect(course)}
                aria-pressed={active}
                className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                  active
                    ? 'border-purple bg-purple/10'
                    : 'border-transparent hover:border-line hover:bg-panel-2'
                }`}
              >
                <span className="flex items-baseline gap-2">
                  <span className="rounded bg-purple/20 px-1.5 py-0.5 font-mono text-[10px] text-purple">
                    {course.code}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px]">{course.title}</span>
                </span>
                <span className="mt-1 block truncate font-mono text-[10px] text-muted">
                  {course.kind} · {course.teachers.join(', ')}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {query.trim().length >= 2 && !loading && results.length === 0 && !error && (
        <p className="px-1 text-xs text-muted">Nothing matches that.</p>
      )}
      {query.trim().length < 2 && (
        <p className="px-1 text-xs text-muted">
          Type at least two characters. {school ? `Filtered to ${school}.` : 'All schools.'}
        </p>
      )}
    </div>
  );
}
