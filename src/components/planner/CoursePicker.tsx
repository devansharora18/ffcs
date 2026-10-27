'use client';

import { useEffect, useState } from 'react';

import { fetchCourses, fetchOfferings } from '@/lib/client/api';
import type { CourseSummary, OfferingDetail } from '@/lib/ffcs/search';

type Props = {
  onAdd: (code: string, offeringId?: string) => void;
};

export default function CoursePicker({ onAdd }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [offerings, setOfferings] = useState<Record<string, OfferingDetail[]>>({});
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
        setResults(await fetchCourses(query.trim(), controller.signal));
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
  }, [query]);

  async function toggle(code: string) {
    if (open === code) {
      setOpen(null);
      return;
    }

    setOpen(code);
    if (offerings[code]) return;

    try {
      setOfferings((current) => ({ ...current, [code]: [] }));
      const detail = await fetchOfferings(code);
      setOfferings((current) => ({ ...current, [code]: detail }));
    } catch {
      setError('Could not load teachers.');
    }
  }

  return (
    <section>
      <label
        htmlFor="course-search"
        className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted"
      >
        Find a course
      </label>
      <input
        id="course-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="code, title or teacher"
        autoComplete="off"
        className="mt-1 w-full border-b border-ink bg-transparent py-2 text-lg placeholder:text-muted/70 focus:border-signal focus:outline-none"
      />

      {loading && <p className="pt-2 font-mono text-[11px] text-muted">searching…</p>}
      {error && <p className="pt-2 font-mono text-[11px] text-signal">{error}</p>}

      <ul className="mt-1 divide-y divide-line">
        {results.map((course) => (
          <li key={course.code}>
            <div className="flex items-baseline gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[11px]">
                  {course.code}
                  <span className="ml-2 text-muted">{course.kind}</span>
                </p>
                <p className="truncate text-sm">{course.title}</p>
                <p className="truncate font-mono text-[10px] text-muted">
                  {course.teachers.join(' · ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggle(course.code)}
                className="shrink-0 text-xs underline decoration-line underline-offset-4 hover:decoration-ink"
                aria-expanded={open === course.code}
              >
                teachers
              </button>
              <button
                type="button"
                onClick={() => onAdd(course.code)}
                className="shrink-0 border border-ink px-2 py-1 font-mono text-[10px] uppercase tracking-wider hover:bg-ink hover:text-paper"
              >
                add
              </button>
            </div>

            {open === course.code && (
              <ul className="mb-2 border-l border-line pl-3">
                {(offerings[course.code] ?? []).map((offering) => (
                  <li
                    key={offering.id}
                    className="flex items-baseline gap-3 border-b border-line/60 py-1.5 last:border-0"
                  >
                    <span className="min-w-0 flex-1 truncate font-mono text-[10px]">
                      {offering.slots}
                      <span className="ml-2 text-muted">{offering.venue ?? '—'}</span>
                    </span>
                    <span className="max-w-[45%] truncate text-xs">{offering.faculty}</span>
                    <button
                      type="button"
                      onClick={() => onAdd(course.code, offering.id)}
                      className="shrink-0 font-mono text-[10px] uppercase tracking-wider underline decoration-line underline-offset-4 hover:decoration-ink"
                    >
                      pin
                    </button>
                  </li>
                ))}
                {offerings[course.code]?.length === 0 && (
                  <li className="py-1 font-mono text-[10px] text-muted">loading teachers…</li>
                )}
              </ul>
            )}
          </li>
        ))}
      </ul>

      {query.trim().length >= 2 && !loading && results.length === 0 && !error && (
        <p className="pt-2 text-sm text-muted">No course matches that.</p>
      )}
    </section>
  );
}
