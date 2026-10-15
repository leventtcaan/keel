/**
 * The effort line (K-979, ADR-078 #2, Ek 2): a sentence from the server's `EffortLine` facts, only for its three kinds. The
 * prototype's other sentences are not here; with no effort, no line.
 */
import type { components } from '@/api/schema';
import { effortLine } from '@/progress/effort';

type Effort = components['schemas']['EffortLine'];

test.each([
  [{ kind: 'STUCK', loadKg: 72.5, sessions: 3, held: true }, 'METRIC', 'Stuck at 72.5 kg for 3 sessions. Held this week.'],
  [{ kind: 'STUCK', loadKg: 72.5, sessions: 3, held: false }, 'METRIC', 'Stuck at 72.5 kg for 3 sessions.'],
  [{ kind: 'STUCK', loadKg: 72.5, sessions: 4 }, 'METRIC', 'Stuck at 72.5 kg for 4 sessions.'],
  [{ kind: 'EASIER', loadKg: 100, reps: 8, repsLeft: 1, repsLeftBefore: 0 }, 'METRIC', 'Same 100 kg, now with 1 rep left.'],
  [{ kind: 'EASIER', loadKg: 100, reps: 8, repsLeft: 2, repsLeftBefore: 0 }, 'METRIC', 'Same 100 kg, now with 2 reps left.'],
  [{ kind: 'REPS_RISING', loadKg: 60, repsGained: 1, since: '2026-10-05', sessions: 3, weeks: 2 }, 'METRIC', 'Up 1 rep at 60 kg since Oct 5.'],
  [{ kind: 'REPS_RISING', loadKg: 60, repsGained: 3, since: '2026-10-05', sessions: 5, weeks: 4 }, 'METRIC', 'Up 3 reps at 60 kg since Oct 5.'],
  [{ kind: 'STUCK', loadKg: 72.5, sessions: 3, held: false }, 'IMPERIAL', 'Stuck at 159.8 lb for 3 sessions.'],
] as [Effort, 'METRIC' | 'IMPERIAL', string][])('%j in %s reads "%s"', (effort, units, line) => {
  expect(effortLine(effort, units)).toBe(line);
});

test('no effort, no line', () => {
  expect(effortLine(undefined, 'METRIC')).toBeNull();
});
