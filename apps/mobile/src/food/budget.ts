/**
 * What is left of today's food (K-409), read from the server's range (target minus the logged range, K-209) as one of
 * three plain states. The server's numbers are kept; only their sign is read. Past the target is said once, by how
 * much — no blame and no make-up for tomorrow (U7) — and an estimate stays a range (U5).
 */
import type { components } from '@/api/schema';

type Left = components['schemas']['Left'];

export type KcalLine = { kind: 'left'; low: number; high: number } | { kind: 'around' } | { kind: 'over'; low: number; high: number };
export type ProteinLine = { kind: 'left'; low: number; high: number } | { kind: 'done' };

export function budgetLine(left: Left): { kcal: KcalLine; protein: ProteinLine } {
  const { low, high } = left.kcal;
  // A range that reaches zero or across it: neither "left" nor "past" can be said of it.
  const kcal: KcalLine = low > 0 ? { kind: 'left', low, high } : high < 0 ? { kind: 'over', low: -high, high: -low } : { kind: 'around' };
  const protein: ProteinLine =
    left.proteinG.high <= 0 ? { kind: 'done' } : { kind: 'left', low: Math.max(0, left.proteinG.low), high: left.proteinG.high };
  return { kcal, protein };
}
