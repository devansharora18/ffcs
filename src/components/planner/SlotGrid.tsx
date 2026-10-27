'use client';

import { useMemo } from 'react';

import { DAY_LABEL } from '@/lib/ffcs/format';
import { DAYS, LAB_ROWS, THEORY_ROWS, type Day, type GridRow } from '@/lib/ffcs/grid';
import type { PlacedOffering, SolveResult } from '@/lib/ffcs/types';

const toMinutes = (hhmm: string) => {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
};

const MORNING_END = 13 * 60;
const AFTERNOON_START = 14 * 60;

type Column = { theory: GridRow | null; lab: GridRow | null };

const buildColumns = (): { morning: Column[]; afternoon: Column[] } => {
  const morningTheory = THEORY_ROWS.filter((row) => toMinutes(row.start) < MORNING_END);
  const morningLab = LAB_ROWS.filter((row) => toMinutes(row.start) < AFTERNOON_START);
  const afternoonTheory = THEORY_ROWS.filter((row) => toMinutes(row.start) >= AFTERNOON_START);
  const afternoonLab = LAB_ROWS.filter((row) => toMinutes(row.start) >= AFTERNOON_START);

  const pad = (rows: GridRow[], length: number) =>
    Array.from({ length }, (_, index) => rows[index] ?? null);

  return {
    morning: pad(morningTheory, Math.max(morningTheory.length, morningLab.length)).map((theory, index) => ({
      theory,
      lab: morningLab[index] ?? null,
    })),
    afternoon: pad(
      afternoonTheory,
      Math.max(afternoonTheory.length, afternoonLab.length),
    ).map((theory, index) => ({ theory, lab: afternoonLab[index] ?? null })),
  };
};

const COLUMNS = buildColumns();

function TimeCell({ row }: { row: GridRow | null }) {
  if (!row) {
    return <th aria-hidden className="rounded-lg bg-[#1b2140]/40" />;
  }

  return (
    <th className="rounded-lg bg-[#1d2750] px-1 py-1 text-center align-middle font-mono text-[9px] leading-tight font-normal text-[#c6d2ff]">
      <span className="block tabular-nums">{row.start}</span>
      <span className="block tabular-nums opacity-70">{row.end}</span>
    </th>
  );
}

function SlotCell({
  day,
  column,
  theory,
  lab,
}: {
  day: Day;
  column: Column;
  theory?: PlacedOffering;
  lab?: PlacedOffering;
}) {
  const theorySlot = column.theory?.slots[day] ?? null;
  const labSlot = column.lab?.slots[day] ?? null;

  if (!theorySlot && !labSlot) {
    return <td className="rounded-lg bg-panel-2/40" />;
  }

  const codes = [theory?.code, lab?.code].filter(Boolean) as string[];

  return (
    <td
      className="rounded-lg bg-panel-2 px-0.5 py-0.5 text-center align-middle"
      title={codes.length > 0 ? codes.join(' · ') : undefined}
    >
      <span className="flex items-center justify-center gap-0.5 font-mono text-[9px] leading-none">
        {theorySlot && (
          <span
            className={
              theory
                ? 'rounded bg-lime px-0.5 py-0.5 font-medium text-on-bright'
                : 'text-ink/80'
            }
          >
            {theorySlot}
          </span>
        )}
        {theorySlot && labSlot && <span className="text-muted">/</span>}
        {labSlot && (
          <span
            className={
              lab ? 'rounded bg-purple px-0.5 py-0.5 font-medium text-on-bright' : 'text-ink/80'
            }
          >
            {labSlot}
          </span>
        )}
      </span>
      {codes.length > 0 && (
        <span className="mt-0.5 block truncate font-mono text-[8.5px] leading-tight text-ink/55">
          {codes.join(' · ')}
        </span>
      )}
    </td>
  );
}

export default function SlotGrid({
  result,
  solving,
}: {
  result: SolveResult | null;
  solving: boolean;
}) {
  const entries = useMemo(() => result?.solutions[0]?.entries ?? [], [result]);

  const bySlot = useMemo(() => {
    const map = new Map<string, PlacedOffering>();
    for (const entry of entries) {
      for (const slot of entry.slots) map.set(slot, entry);
    }
    return map;
  }, [entries]);

  const theoryOf = (slot: string | null | undefined) => (slot ? bySlot.get(slot) : undefined);

  return (
    <div className={`overflow-x-auto ${solving ? 'opacity-70' : ''}`} aria-busy={solving}>
      <table
        id="timetable-export"
        className="w-full min-w-[860px] table-fixed border-separate border-spacing-[3px] bg-panel p-2"
      >
        <colgroup>
          <col className="w-[72px]" />
          {COLUMNS.morning.map((_, index) => (
            <col key={`m-${index}`} />
          ))}
          <col className="w-[30px]" />
          {COLUMNS.afternoon.map((_, index) => (
            <col key={`a-${index}`} />
          ))}
        </colgroup>

        <tbody>
          <tr>
            <th className="rounded-lg bg-[#191c33] px-1 py-1 align-middle font-display text-[10px] font-bold uppercase leading-tight tracking-[0.06em] text-ink">
              Theory
              <br />
              hours
            </th>
            {COLUMNS.morning.map((column, index) => (
              <TimeCell key={`mt-${index}`} row={column.theory} />
            ))}
            <th
              rowSpan={7}
              className="rounded-lg bg-[#101226] px-0 align-middle"
              aria-label="Lunch"
            >
              <div className="flex h-full flex-col items-center justify-center gap-[3px]">
                {'LUNCH'.split('').map((letter) => (
                  <span
                    key={letter}
                    aria-hidden
                    className="font-display text-[9px] font-bold leading-none tracking-tight text-muted"
                  >
                    {letter}
                  </span>
                ))}
              </div>
            </th>
            {COLUMNS.afternoon.map((column, index) => (
              <TimeCell key={`at-${index}`} row={column.theory} />
            ))}
          </tr>

          <tr>
            <th className="rounded-lg bg-[#191c33] px-1 py-1 align-middle font-display text-[10px] font-bold uppercase leading-tight tracking-[0.06em] text-ink">
              Lab
              <br />
              hours
            </th>
            {COLUMNS.morning.map((column, index) => (
              <TimeCell key={`ml-${index}`} row={column.lab} />
            ))}
            {COLUMNS.afternoon.map((column, index) => (
              <TimeCell key={`al-${index}`} row={column.lab} />
            ))}
          </tr>

          {DAYS.map((day) => (
            <tr key={day}>
              <th className="rounded-lg bg-[#191c33] px-2 py-2 text-left align-middle font-display text-[12px] font-bold uppercase tracking-[0.06em] text-ink">
                {DAY_LABEL[day]}
              </th>
              {COLUMNS.morning.map((column, index) => (
                <SlotCell
                  key={`m-${index}`}
                  day={day}
                  column={column}
                  theory={theoryOf(column.theory?.slots[day])}
                  lab={theoryOf(column.lab?.slots[day])}
                />
              ))}
              {COLUMNS.afternoon.map((column, index) => (
                <SlotCell
                  key={`a-${index}`}
                  day={day}
                  column={column}
                  theory={theoryOf(column.theory?.slots[day])}
                  lab={theoryOf(column.lab?.slots[day])}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
