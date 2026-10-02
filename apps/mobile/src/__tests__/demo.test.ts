/**
 * The tips on a move's screen (K-418, ADR-017): Güray's, by the move — full range (G1 K-50) but on the back, where partial
 * reps at the end of a set are fine (K-56) — the set goes on past the slowdown there (K-57), so the last-rep tip is not
 * said either —; a controlled lowering and a lift with intent (K-45); the last rep slowing down on its own (K-8) — a
 * signal that does not come on an isolation move, so it is not said there.
 */
import type { components } from '@/api/schema';
import { tipsFor } from '@/train/demo';

type Schemas = components['schemas'];
const move = (kind: 'COMPOUND' | 'ISOLATION', muscles: string[]) => ({ id: 'm', kind, muscles }) as unknown as Schemas['Exercise'];

test('a compound push: full range, tempo, the last rep', () => {
  expect(tipsFor(move('COMPOUND', ['chest', 'triceps']))).toEqual(['demo.tip.fullRange', 'demo.tip.tempo', 'demo.tip.lastRep']);
});

test('a back move: full range until the reps slow, then partial reps — the set does not end at the slowdown', () => {
  expect(tipsFor(move('COMPOUND', ['lats', 'biceps']))).toEqual(['demo.tip.backRange', 'demo.tip.tempo']);
  expect(tipsFor(move('COMPOUND', ['upper_back']))[0]).toBe('demo.tip.backRange');
});

test('an isolation move: no last-rep signal to watch for', () => {
  expect(tipsFor(move('ISOLATION', ['side_delts']))).toEqual(['demo.tip.fullRange', 'demo.tip.tempo']);
});
