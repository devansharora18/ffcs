import { type Day, type SlotCell, offeringCells, overlappingCells, slotCells } from '@/lib/ffcs/grid';

const DAY_LABEL: Record<Day, string> = {
  MON: 'Mon',
  TUE: 'Tue',
  WED: 'Wed',
  THU: 'Thu',
  FRI: 'Fri',
};

const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

const describe = (cells: SlotCell[]) =>
  cells.map((cell) => `${DAY_LABEL[cell.day]} ${clock(cell.start)}–${clock(cell.end)}`);

export default function Home() {
  const theory = slotCells('A1');
  const lab = offeringCells(['L3', 'L4']);
  const clash = overlappingCells(offeringCells(['L1', 'L2']), slotCells('F1'));

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">FFCS planner</h1>
      <p className="text-sm text-muted">Grid loaded. No catalog yet.</p>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted">Theory A1</dt>
        <dd>{describe(theory).join(' · ')}</dd>
        <dt className="text-muted">Lab L3+L4</dt>
        <dd>
          {describe(lab).join(' · ')} ({lab[lab.length - 1].end - lab[0].start} min)
        </dd>
        <dt className="text-muted">L1+L2 vs F1</dt>
        <dd>{clash.length} overlapping hour(s)</dd>
      </dl>
    </main>
  );
}
