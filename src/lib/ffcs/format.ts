import type { Day, SlotCell } from './grid';

export const DAY_LABEL: Record<Day, string> = {
  MON: 'Mon',
  TUE: 'Tue',
  WED: 'Wed',
  THU: 'Thu',
  FRI: 'Fri',
};

export const clock = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export const formatSlots = (slots: string[]): string => slots.join('+');

export const formatCells = (cells: SlotCell[]): string =>
  cells.map((cell) => `${DAY_LABEL[cell.day]} ${clock(cell.start)}–${clock(cell.end)}`).join(', ');
