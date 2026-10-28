import type { OfferingKind } from './catalog';
import type { Day, SlotCell } from './grid';

export type TimetableConstraints = {
  /** 0 = Monday … 4 = Friday. */
  avoidDays: number[];
  /** Minutes from midnight. A window applies to every day. */
  avoidWindows: { start: number; end: number }[];
  preferredFaculty: string[];
  avoidedFaculty: string[];
  maxCredits?: number;
};

/** A course the user typed in because the catalog does not have it. */
export type CustomCourse = {
  title: string;
  faculty: string;
  slots: string[];
};

export type Requirement = {
  courseCode: string;
  /** Pin one offering; omit to let the solver choose. */
  offeringId?: string;
  /** Require this slot pattern, e.g. ['A1','TA1']; the solver still picks the teacher. */
  slots?: string[];
  /** Manual entry, bypassing the catalog lookup. */
  custom?: CustomCourse;
  /** User-supplied credit override for this course. */
  credits?: number;
};

export type TimetableState = {
  requirements: Requirement[];
  constraints: TimetableConstraints;
};

export type PlacedOffering = {
  id: string;
  code: string;
  title: string;
  kind: OfferingKind;
  faculty: string;
  venue: string | null;
  slots: string[];
  cells: SlotCell[];
  /** Null when the catalog has no credit value for the course. */
  credits: number | null;
  /** True when the value came from the slot estimate rather than a source. */
  creditsEstimated: boolean;
};

export type Conflict = {
  a: string;
  b: string;
  day: Day;
  start: number;
  end: number;
};

export type Violation =
  | { kind: 'avoided-day'; offeringId: string; day: number }
  | { kind: 'avoided-window'; offeringId: string; day: number; start: number; end: number }
  | { kind: 'avoided-faculty'; offeringId: string; faculty: string };

export type ScoreParts = {
  preferredFaculty: number;
  gaps: number;
  days: number;
  earliness: number;
  lateness: number;
  /** Same teacher taught the theory and the lab of a subject. */
  sameTeacher: number;
  /** Theory and lab fell in opposite halves of the day. */
  splitDay: number;
  /** Penalty for mixing A1/B1 with A2/B2, which stacks FAT exams. */
  examSide: number;
  /** Penalty for spreading classes across buildings. */
  venue: number;
};

export type Solution = {
  entries: PlacedOffering[];
  score: number;
  parts: ScoreParts;
};

export type SolveResult = {
  /** Best first. Empty when no clash-free assignment exists. */
  solutions: Solution[];
  /** Course codes that could not be placed at all. */
  unsolved: string[];
  conflicts: Conflict[];
  /** Search nodes visited, for budget reporting. */
  nodes: number;
};

export const emptyConstraints = (): TimetableConstraints => ({
  avoidDays: [],
  avoidWindows: [],
  preferredFaculty: [],
  avoidedFaculty: [],
});

export const emptyState = (): TimetableState => ({
  requirements: [],
  constraints: emptyConstraints(),
});
