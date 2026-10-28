'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  fetchCategories,
  fetchCategoryCourses,
  fetchOfferings,
} from '@/lib/client/api';
import { isKnownSlot } from '@/lib/ffcs/grid';
import type { CourseSummary, OfferingDetail } from '@/lib/ffcs/search';

import Select, { type SelectOption } from '../ui/Select';

type Props = {
  schools: string[];
  onAdd: (
    code: string,
    offeringId?: string,
    slots?: string[],
    custom?: { title: string; faculty: string; slots: string[] },
  ) => void;
};

export default function CourseBuilder({ schools, onAdd }: Props) {
  const [school, setSchool] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [code, setCode] = useState<string | null>(null);
  const [offerings, setOfferings] = useState<OfferingDetail[]>([]);
  const [slot, setSlot] = useState<string | null>(null);
  const [offeringId, setOfferingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualFaculty, setManualFaculty] = useState('');
  const [manualSlots, setManualSlots] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchCategories(school, controller.signal)
      .then((list) => {
        setCategories(list);
        setCategory((current) => (current && list.includes(current) ? current : null));
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Could not load domains.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [school]);

  useEffect(() => {
    if (!category) {
      setCourses([]);
      setCode(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchCategoryCourses(category, school, controller.signal)
      .then((list) => {
        setCourses(list);
        setCode(null);
        setSlot(null);
        setOfferingId(null);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Could not load subjects.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [category, school]);

  useEffect(() => {
    if (!code) {
      setOfferings([]);
      setSlot(null);
      setOfferingId(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchOfferings(code, controller.signal)
      .then((list) => {
        setOfferings(list);
        setSlot(null);
        setOfferingId(null);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Could not load slots.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [code]);

  const categoryOptions: SelectOption[] = useMemo(
    () =>
      categories.map((name) => ({
        value: name,
        label: name.replace(/([a-z])([A-Z])/g, '$1 $2'),
      })),
    [categories],
  );

  const courseOptions: SelectOption[] = useMemo(
    () => courses.map((course) => ({ value: course.code, label: `${course.code} – ${course.title}` })),
    [courses],
  );

  const slotOptions: SelectOption[] = useMemo(
    () =>
      [...new Set(offerings.map((offering) => offering.slots))].map((value) => ({
        value,
        label: value,
      })),
    [offerings],
  );

  const facultyRows = useMemo(
    () => offerings.filter((offering) => !slot || offering.slots === slot),
    [offerings, slot],
  );

  const chosen = offerings.find((offering) => offering.id === offeringId) ?? null;

  function add() {
    if (!code) return;

    if (chosen) onAdd(code, chosen.id);
    else if (slot) onAdd(code, undefined, slot.split('+'));
    else onAdd(code);

    setSlot(null);
    setOfferingId(null);
  }

  function toggleManual() {
    if (!manualOpen) {
      // Prefill from the current selection so "same subject, different teacher"
      // only needs the faculty field.
      setManualCode(code ?? '');
      setManualTitle(courses.find((course) => course.code === code)?.title ?? '');
      setManualSlots(slot ?? '');
      setManualError(null);
    }
    setManualOpen((open) => !open);
  }

  function addManual() {
    const cleanCode = manualCode.trim().toUpperCase();
    const slots = manualSlots
      .split('+')
      .map((slot) => slot.trim().toUpperCase())
      .filter(Boolean);
    const faculty = manualFaculty.trim();
    const title = manualTitle.trim();

    if (cleanCode.length === 0) return setManualError('A course code is required.');
    if (slots.length === 0) return setManualError('At least one slot is required, e.g. A1+TA1.');

    const unknown = slots.filter((slot) => !isKnownSlot(slot));
    if (unknown.length > 0) {
      return setManualError(`Unknown slot ${unknown.join(', ')}. Try A1, TA1, L3…`);
    }

    onAdd(cleanCode, undefined, undefined, {
      title: title || cleanCode,
      faculty: faculty || 'MANUAL',
      slots,
    });

    setManualFaculty('');
    setManualError(null);
  }

  return (
    <div className="space-y-3">
      <div className="-mx-1 flex flex-wrap gap-1.5 px-1">
        {[null, ...schools].map((item) => {
          const active = school === item;
          return (
            <button
              key={item ?? 'all'}
              type="button"
              onClick={() => setSchool(item)}
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

      <div className="grid gap-2 sm:grid-cols-3">
        <Select
          label="Domain"
          value={category}
          options={categoryOptions}
          onChange={setCategory}
        />
        <Select
          label="Subject"
          value={code}
          options={courseOptions}
          onChange={setCode}
          disabled={!category}
          searchable
        />
        <Select
          label="Slot"
          value={slot}
          options={slotOptions}
          onChange={(value) => {
            setSlot(value);
            setOfferingId(null);
          }}
          disabled={!code}
        />
      </div>

      {error && <p className="font-mono text-[11px] text-red">{error}</p>}

      <div className="rounded-xl border border-line">
        <p className="flex items-center justify-between border-b border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
          <span>Select faculty</span>
          <span>{loading ? '…' : `${facultyRows.length}`}</span>
        </p>

        <ul className="max-h-44 overflow-y-auto p-1">
          {facultyRows.map((offering) => {
            const active = offering.id === offeringId;
            return (
              <li key={offering.id}>
                <button
                  type="button"
                  onClick={() => setOfferingId(active ? null : offering.id)}
                  aria-pressed={active}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                    active ? 'bg-purple/20' : 'hover:bg-panel-2'
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate text-xs">{offering.faculty}</span>
                  <span className="font-mono text-[10px] text-purple">{offering.slots}</span>
                  <span className="hidden font-mono text-[10px] text-muted sm:inline">
                    {offering.venue ?? '—'}
                  </span>
                  <span
                    className={`h-3.5 w-3.5 shrink-0 rounded-full border ${
                      active ? 'border-lime bg-lime' : 'border-line'
                    }`}
                    aria-hidden
                  />
                </button>
              </li>
            );
          })}

          {!loading && facultyRows.length === 0 && (
            <li className="px-2 py-3 text-center text-xs text-muted">
              {code ? `No teacher runs ${slot ?? 'this course'}.` : 'Pick a subject first.'}
            </li>
          )}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={add}
          disabled={!code}
          className="rounded-xl bg-lime px-4 py-2 font-display text-sm font-bold text-on-bright transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-line disabled:text-muted disabled:hover:scale-100"
        >
          Add to timetable
        </button>
        <p className="text-[11px] leading-snug text-muted">
          {chosen
            ? `Pinned to ${chosen.faculty} (${chosen.slots}).`
            : slot
              ? `Slot ${slot} reserved; the solver picks the teacher.`
              : 'The solver picks both slot and teacher.'}
        </p>
      </div>

      <div className="border-t border-line pt-3">
        <button
          type="button"
          onClick={toggleManual}
          aria-expanded={manualOpen}
          className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted underline decoration-line underline-offset-4 hover:text-lime hover:decoration-lime"
        >
          {manualOpen ? '− hide manual entry' : '+ subject or teacher missing?'}
        </button>

        {manualOpen && (
          <div className="mt-2 space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value)}
                placeholder="Code, e.g. BCSE202L"
                aria-label="Manual course code"
                className="rounded-lg border border-line bg-panel-2 px-2 py-1.5 font-mono text-[11px] placeholder:text-muted/70 focus:border-purple focus:outline-none"
              />
              <input
                value={manualTitle}
                onChange={(event) => setManualTitle(event.target.value)}
                placeholder="Course title"
                aria-label="Manual course title"
                className="rounded-lg border border-line bg-panel-2 px-2 py-1.5 text-[11px] placeholder:text-muted/70 focus:border-purple focus:outline-none"
              />
              <input
                value={manualFaculty}
                onChange={(event) => setManualFaculty(event.target.value)}
                placeholder="Teacher, e.g. IYAPPAN P"
                aria-label="Manual faculty"
                className="rounded-lg border border-line bg-panel-2 px-2 py-1.5 text-[11px] placeholder:text-muted/70 focus:border-purple focus:outline-none"
              />
              <input
                value={manualSlots}
                onChange={(event) => setManualSlots(event.target.value)}
                placeholder="Slots, e.g. A1+TA1"
                aria-label="Manual slots"
                className="rounded-lg border border-line bg-panel-2 px-2 py-1.5 font-mono text-[11px] placeholder:text-muted/70 focus:border-purple focus:outline-none"
              />
            </div>

            {manualError && <p className="font-mono text-[10px] text-red">{manualError}</p>}

            <button
              type="button"
              onClick={addManual}
              className="w-full rounded-lg border border-purple px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-purple hover:bg-purple hover:text-on-bright"
            >
              add manual course
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
