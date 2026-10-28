import type { CustomCourse, TimetableConstraints, TimetableState } from './types';

export type StateOp =
  | { op: 'add'; courseCode: string; offeringId?: string; slots?: string[]; custom?: CustomCourse }
  | { op: 'remove'; courseCode: string }
  | { op: 'credits'; courseCode: string; credits: number }
  | { op: 'constraints'; constraints: Partial<TimetableConstraints> };

function mergeConstraints(
  current: TimetableConstraints,
  patch: Partial<TimetableConstraints>,
): TimetableConstraints {
  return {
    avoidDays: patch.avoidDays ?? current.avoidDays,
    avoidWindows: patch.avoidWindows ?? current.avoidWindows,
    preferredFaculty: patch.preferredFaculty ?? current.preferredFaculty,
    avoidedFaculty: patch.avoidedFaculty ?? current.avoidedFaculty,
    maxCredits: patch.maxCredits ?? current.maxCredits,
  };
}

/** The single mutation path. The agent and the UI both go through this. */
export function applyOps(state: TimetableState, ops: StateOp[]): TimetableState {
  let next = state;

  for (const op of ops) {
    switch (op.op) {
      case 'add': {
        if (next.requirements.some((requirement) => requirement.courseCode === op.courseCode)) {
          break;
        }
        next = {
          ...next,
          requirements: [
            ...next.requirements,
            {
              courseCode: op.courseCode,
              offeringId: op.offeringId,
              slots: op.slots,
              custom: op.custom,
            },
          ],
        };
        break;
      }
      case 'remove':
        next = {
          ...next,
          requirements: next.requirements.filter(
            (requirement) => requirement.courseCode !== op.courseCode,
          ),
        };
        break;
      case 'credits':
        next = {
          ...next,
          requirements: next.requirements.map((requirement) =>
            requirement.courseCode === op.courseCode
              ? { ...requirement, credits: op.credits }
              : requirement,
          ),
        };
        break;
      case 'constraints':
        next = { ...next, constraints: mergeConstraints(next.constraints, op.constraints) };
        break;
    }
  }

  return next;
}
