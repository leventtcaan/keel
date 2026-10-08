/**
 * What a swap offers (K-970, ADR-073 #6, Ek 3; second user walk B3, C17): the server's swap options of the planned move
 * (worked out on the server, the gym's equipment and the day's moves left out), never the move as it is now, nor one
 * the session already has; a move swapped for today offers the planned move back first ("Back to the planned move").
 */
import type { components } from '@/api/schema';
import { swapChoice } from '@/train/swap';
import type { Found } from '@/train/week';

type Schemas = components['schemas'];

const planned = (exerciseId: string, swapOptions: string[] = []): Schemas['PlannedExercise'] => ({
  exerciseId,
  baseSets: 3,
  sets: 3,
  reps: { min: 6, max: 10 },
  targetRir: 1,
  swapOptions,
});
const BENCH = planned('bench_press', ['dumbbell_bench_press', 'machine_chest_press', 'push_up']);
const DAY: Schemas['ProgramDay'] = { id: 'a', nameKey: 'programDays.upper_a.name', exercises: [BENCH, planned('lat_pulldown', ['seated_row'])] };
const found = (session: Partial<Schemas['WeekSession']> = {}): Found => ({
  day: DAY,
  session: { programDayId: 'a', date: '2026-09-29', exerciseIds: ['bench_press', 'lat_pulldown'], ...session },
});

test("the planned move's options as the server sent them, in its order", () => {
  expect(swapChoice(found(), 'bench_press')).toEqual({
    planned: BENCH,
    current: BENCH,
    swapped: false,
    options: ['dumbbell_bench_press', 'machine_chest_press', 'push_up'],
    todayOptions: ['dumbbell_bench_press', 'machine_chest_press', 'push_up'],
  });
});

test('swapped for today: the title is the move as it is now, not offered again; the planned move comes back first', () => {
  const fresh = planned('dumbbell_bench_press', ['push_up']);
  const choice = swapChoice(
    found({ exerciseIds: ['dumbbell_bench_press', 'lat_pulldown'], swaps: [{ insteadOf: 'bench_press', exercise: fresh }] }),
    'bench_press',
  );
  expect(choice?.current).toBe(fresh);
  expect(choice?.swapped).toBe(true);
  expect(choice?.options).toEqual(['bench_press', 'machine_chest_press', 'push_up']);
});

test('a move the session already has (another swap put it there): from now on yes, for today no', () => {
  const row = planned('seated_row');
  const choice = swapChoice(
    found({ exerciseIds: ['bench_press', 'push_up'], swaps: [{ insteadOf: 'lat_pulldown', exercise: { ...row, exerciseId: 'push_up' } }] }),
    'bench_press',
  );
  expect(choice?.options).toEqual(['dumbbell_bench_press', 'machine_chest_press', 'push_up']);
  expect(choice?.todayOptions).toEqual(['dumbbell_bench_press', 'machine_chest_press']);
});

test("the user's own move has no options; a move not on the day is none to swap", () => {
  const own = planned('custom:1');
  const day = { ...DAY, exercises: [own] };
  expect(swapChoice({ day, session: { programDayId: 'a', date: '2026-09-29', exerciseIds: ['custom:1'] } }, 'custom:1')?.options).toEqual([]);
  expect(swapChoice(found(), 'squat')).toBeNull();
});
