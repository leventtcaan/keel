/**
 * The one way the app writes a move's reps (K-991, ADR-073 Ek 4): a range as a range, a fixed rep target (min = max,
 * 5 x 5) as its reps, never "5-5". The Train tab, the plan, the import draft and the program editor print through it.
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';

type RepRange = components['schemas']['RepRange'];

/** The numbers: "6-10", or "5" for a fixed rep target. */
export function repCount({ min, max }: RepRange): string {
  return min === max ? String(min) : t('format.range', { low: min, high: max });
}

/** The numbers with their word: "6-10 reps", "5 reps", "1 rep". */
export function repsText(reps: RepRange): string {
  return reps.min === 1 && reps.max === 1 ? t('train.reps.one') : t('train.reps.other', { reps: repCount(reps) });
}
