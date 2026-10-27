'use client';

import { useEffect, useState } from 'react';

import { fetchOfferings } from '@/lib/client/api';
import type { CourseSummary, OfferingDetail } from '@/lib/ffcs/search';

type Props = {
  course: CourseSummary | null;
  onAdd: (code: string, offeringId?: string) => void;
};

export default function AddCoursePanel({ course, onAdd }: Props) {
  const [offerings, setOfferings] = useState<OfferingDetail[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!course) {
      setOfferings([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    fetchOfferings(course.code, controller.signal)
      .then((detail) => setOfferings(detail))
      .catch(() => setOfferings([]))
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [course]);

  if (!course) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-yellow" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 2c.8 5.6 3.6 8.4 9.2 9.2-5.6.8-8.4 3.6-9.2 9.2-.8-5.6-3.6-8.4-9.2-9.2C8.4 10.4 11.2 7.6 12 2Z" />
        </svg>
        <p className="text-xs leading-relaxed text-muted">
          Pick a course on the left.
          <br />
          Its teachers and slots show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-baseline gap-2">
          <span className="rounded bg-purple/20 px-1.5 py-0.5 font-mono text-[10px] text-purple">
            {course.code}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            {course.kind}
          </span>
        </div>
        <p className="mt-1 text-sm leading-snug">{course.title}</p>
      </div>

      <button
        type="button"
        onClick={() => onAdd(course.code)}
        className="w-full rounded-xl bg-lime px-3 py-2 font-display text-sm font-bold text-on-bright transition-transform hover:scale-[1.01] active:scale-[0.99]"
      >
        Add — solver picks the slot
      </button>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
          {loading ? 'loading teachers…' : `${offerings.length} offerings`}
        </p>
        <ul className="mt-1 max-h-[168px] space-y-1 overflow-y-auto pr-1">
          {offerings.map((offering) => (
            <li
              key={offering.id}
              className="flex items-center gap-2 rounded-lg bg-panel-2 px-2 py-1.5"
            >
              <span className="font-mono text-[10px] text-purple">{offering.slots}</span>
              <span className="min-w-0 flex-1 truncate text-[11px]">{offering.faculty}</span>
              <button
                type="button"
                onClick={() => onAdd(course.code, offering.id)}
                className="shrink-0 rounded-full border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted hover:border-lime hover:text-lime"
              >
                pin
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
