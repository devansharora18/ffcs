export type CourseKind = 'theory' | 'lab';

export type TimetableEntry = {
  offeringId: string;
  courseCode: string;
  courseTitle: string;
  kind: CourseKind;
  faculty: string;
  slots: string[];
};

export type TimetableConstraints = {
  /** 0 = Monday … 4 = Friday */
  avoidDays: number[];
  /** Minutes from midnight, inclusive start / exclusive end. */
  avoidWindows: { start: number; end: number }[];
  preferredFaculty: string[];
  avoidedFaculty: string[];
  maxCredits?: number;
};

export type TimetableState = {
  entries: TimetableEntry[];
  constraints: TimetableConstraints;
  /** Offerings the solver must keep, even when re-solving. */
  lockedOfferingIds: string[];
};

export const emptyState = (): TimetableState => ({
  entries: [],
  constraints: {
    avoidDays: [],
    avoidWindows: [],
    preferredFaculty: [],
    avoidedFaculty: [],
  },
  lockedOfferingIds: [],
});
