/**
 * The VIT FFCS slot grid for the Vellore campus.
 *
 * Theory and lab periods are NOT aligned (theory is 8:00-8:50, labs are
 * 8:00-8:50 then 8:51-9:40), so every slot is stored as real time intervals.
 * Comparing period indices would miss clashes between a lab and a theory hour
 * that overlap in wall-clock time.
 */

export const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'] as const;
export type Day = (typeof DAYS)[number];

export type SlotCell = {
  day: Day;
  /** Minutes from midnight. */
  start: number;
  /** Minutes from midnight, exclusive. */
  end: number;
};

type Row = {
  start: string;
  end: string;
  slots: Partial<Record<Day, string>>;
};

const THEORY_ROWS: Row[] = [
  { start: '08:00', end: '08:50', slots: { MON: 'A1', TUE: 'B1', WED: 'C1', THU: 'D1', FRI: 'E1' } },
  { start: '09:00', end: '09:50', slots: { MON: 'F1', TUE: 'G1', WED: 'A1', THU: 'B1', FRI: 'C1' } },
  { start: '10:00', end: '10:50', slots: { MON: 'D1', TUE: 'E1', WED: 'F1', THU: 'G1', FRI: 'TA1' } },
  { start: '11:00', end: '11:50', slots: { MON: 'TB1', TUE: 'TC1', WED: 'V1', THU: 'TE1', FRI: 'TF1' } },
  { start: '12:00', end: '12:50', slots: { MON: 'TG1', TUE: 'TAA1', WED: 'V2', THU: 'TCC1', FRI: 'TD1' } },
  { start: '14:00', end: '14:50', slots: { MON: 'A2', TUE: 'B2', WED: 'C2', THU: 'D2', FRI: 'E2' } },
  { start: '15:00', end: '15:50', slots: { MON: 'F2', TUE: 'G2', WED: 'A2', THU: 'B2', FRI: 'C2' } },
  { start: '16:00', end: '16:50', slots: { MON: 'D2', TUE: 'E2', WED: 'F2', THU: 'G2', FRI: 'TA2' } },
  { start: '17:00', end: '17:50', slots: { MON: 'TB2', TUE: 'TC2', WED: 'TD2', THU: 'TE2', FRI: 'TF2' } },
  { start: '18:00', end: '18:50', slots: { MON: 'TG2', TUE: 'TAA2', WED: 'TBB2', THU: 'TCC2', FRI: 'TDD2' } },
  { start: '19:01', end: '19:50', slots: { MON: 'V3', TUE: 'V4', WED: 'V5', THU: 'V6', FRI: 'V7' } },
];

const LAB_ROWS: Row[] = [
  { start: '08:00', end: '08:50', slots: { MON: 'L1', TUE: 'L7', WED: 'L13', THU: 'L19', FRI: 'L25' } },
  { start: '08:51', end: '09:40', slots: { MON: 'L2', TUE: 'L8', WED: 'L14', THU: 'L20', FRI: 'L26' } },
  { start: '09:51', end: '10:40', slots: { MON: 'L3', TUE: 'L9', WED: 'L15', THU: 'L21', FRI: 'L27' } },
  { start: '10:41', end: '11:30', slots: { MON: 'L4', TUE: 'L10', WED: 'L16', THU: 'L22', FRI: 'L28' } },
  { start: '11:40', end: '12:30', slots: { MON: 'L5', TUE: 'L11', WED: 'L17', THU: 'L23', FRI: 'L29' } },
  { start: '12:31', end: '13:20', slots: { MON: 'L6', TUE: 'L12', WED: 'L18', THU: 'L24', FRI: 'L30' } },
  { start: '14:00', end: '14:50', slots: { MON: 'L31', TUE: 'L37', WED: 'L43', THU: 'L49', FRI: 'L55' } },
  { start: '14:51', end: '15:40', slots: { MON: 'L32', TUE: 'L38', WED: 'L44', THU: 'L50', FRI: 'L56' } },
  { start: '15:51', end: '16:40', slots: { MON: 'L33', TUE: 'L39', WED: 'L45', THU: 'L51', FRI: 'L57' } },
  { start: '16:41', end: '17:30', slots: { MON: 'L34', TUE: 'L40', WED: 'L46', THU: 'L52', FRI: 'L58' } },
  { start: '17:40', end: '18:30', slots: { MON: 'L35', TUE: 'L41', WED: 'L47', THU: 'L53', FRI: 'L59' } },
  { start: '18:31', end: '19:20', slots: { MON: 'L36', TUE: 'L42', WED: 'L48', THU: 'L54', FRI: 'L60' } },
];

const toMinutes = (hhmm: string): number => {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
};

function buildIndex(rows: Row[]): Map<string, SlotCell[]> {
  const index = new Map<string, SlotCell[]>();

  for (const row of rows) {
    for (const [day, code] of Object.entries(row.slots) as [Day, string][]) {
      const cells = index.get(code) ?? [];
      cells.push({ day, start: toMinutes(row.start), end: toMinutes(row.end) });
      index.set(code, cells);
    }
  }

  return index;
}

const SLOT_CELLS = new Map([...buildIndex(THEORY_ROWS), ...buildIndex(LAB_ROWS)]);

export function slotCells(code: string): SlotCell[] {
  return SLOT_CELLS.get(code.trim().toUpperCase()) ?? [];
}

export function isKnownSlot(code: string): boolean {
  return SLOT_CELLS.has(code.trim().toUpperCase());
}

export function offeringCells(slots: string[]): SlotCell[] {
  return slots.flatMap(slotCells);
}

/** Every pair of cells that share a day and overlap in time. */
export function overlappingCells(a: SlotCell[], b: SlotCell[]): [SlotCell, SlotCell][] {
  const pairs: [SlotCell, SlotCell][] = [];

  for (const left of a) {
    for (const right of b) {
      if (left.day === right.day && left.start < right.end && right.start < left.end) {
        pairs.push([left, right]);
      }
    }
  }

  return pairs;
}
