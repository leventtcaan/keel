/**
 * Before the workout (Evre 7 C1): today's card says how long it takes and, for the headline lifts, what the last time was beside what is
 * asked today ("Last 180 kg × 8, today 180 kg × 9"). No prose: numbers the server already has (lastBestSet, nextLoadKg, nextReps).
 */
import type { components } from '@/api/schema';
import { estimatedMinutes, lastTodayLine } from '@/train/beforeWorkout';
import { workoutParams } from '@/train/params';

type Schemas = components['schemas'];

const planned = (extra: Partial<Schemas['PlannedExercise']> = {}): Schemas['PlannedExercise'] => ({
  exerciseId: 'bench_press',
  baseSets: 3,
  sets: 3,
  reps: { min: 6, max: 10 },
  targetRir: 1,
  ...extra,
});
const bench = { id: 'bench_press', unilateral: false, load: 'EXTERNAL' } as Schemas['Exercise'];

describe('the time it takes', () => {
  test('each set costs its own seconds and the rest, to the nearest few minutes: 9 sets is about 30 min', () => {
    const per = (workoutParams.sessionSetSeconds + workoutParams.restSecondsMin) / 60;
    expect(estimatedMinutes([planned({ sets: 3 }), planned({ sets: 3 }), planned({ sets: 3 })], 0)).toBe(Math.round((9 * per) / workoutParams.sessionMinutesRound) * workoutParams.sessionMinutesRound);
  });

  test('the cardio after the weights is in it', () => {
    const lifting = estimatedMinutes([planned({ sets: 3 })], 0);
    expect(estimatedMinutes([planned({ sets: 3 })], 30)).toBeGreaterThanOrEqual((lifting as number) + 25);
  });

  test('nothing to do: no estimate', () => {
    expect(estimatedMinutes([], 0)).toBeNull();
  });
});

describe('last time beside today', () => {
  test('both known: the last best set and today\'s ask', () => {
    const line = lastTodayLine(planned({ lastBestSet: { loadKg: 80, reps: 8 }, nextLoadKg: 80, nextReps: 9 }), bench, 'METRIC');
    expect(line).toBe('Last 80 kg × 8 → 80 kg × 9');
  });

  test('in pounds, as real weights', () => {
    const line = lastTodayLine(planned({ lastBestSet: { loadKg: 83.91, reps: 8 }, nextLoadKg: 86.18, nextReps: 8 }), bench, 'IMPERIAL');
    expect(line).toBe('Last 185 lb × 8 → 190 lb × 8');
  });

  test('no target yet: only what was done last time', () => {
    expect(lastTodayLine(planned({ lastBestSet: { loadKg: 80, reps: 8 } }), bench, 'METRIC')).toBe('Last 80 kg × 8');
  });

  test('the first session of a move: nothing to compare, no line', () => {
    expect(lastTodayLine(planned({ nextLoadKg: 60, nextReps: 8 }), bench, 'METRIC')).toBeNull();
  });
});
