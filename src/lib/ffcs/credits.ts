import type { PlacedOffering } from './types';

/** VIT caps a semester at 27.5 credits. */
export const CREDIT_LIMIT = 27.5;

export type CreditSummary = {
  total: number;
  /** False when at least one course has no credit value. */
  complete: boolean;
  limit: number;
  over: boolean;
};

export function creditSummary(
  entries: PlacedOffering[],
  limit: number = CREDIT_LIMIT,
): CreditSummary {
  const total = entries.reduce((sum, entry) => sum + (entry.credits ?? 0), 0);
  return {
    total: Math.round(total * 10) / 10,
    complete: entries.every((entry) => entry.credits !== null),
    limit,
    over: total > limit,
  };
}

export function formatCredits(summary: CreditSummary): string {
  return `${summary.total}${summary.complete ? '' : '+'}/${summary.limit}`;
}
