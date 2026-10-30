/** A day of the week strip, opened (Evre 7): the plan of a day to come, the best set of each move of a day trained, a rest day. */
import type { components } from '@/api/schema';
import { dayView } from '@/today/dayView';
import type { StripDay } from '@/today/week';

type Schemas = components['schemas'];

const DAY = { id: 'd1', name: 'Upper', exercises: [{ exerciseId: 'bench_press', sets: 3, baseSets: 3, reps: { min: 6, max: 10 } }] } as unknown as Schemas['ProgramDay'];
const PROGRAM = { id: 'p', source: 'GENERATED', days: [DAY], week: [{ date: '2026-10-28', programDayId: 'd1' }] } as unknown as Schemas['Program'];
const strip = (over: Partial<StripDay>): StripDay => ({ weekday: 'WEDNESDAY', date: '2026-10-28', trained: false, logged: false, planned: false, today: false, ...over });
const set = (loadKg: number, reps: number, exerciseId = 'bench_press', setType = 'WORKING') => ({ id: `${loadKg}-${reps}`, clientId: `${loadKg}-${reps}`, exerciseId, setType, loadKg, reps }) as unknown as Schemas['LoggedSet'];
const workout = (sets: Schemas['LoggedSet'][]) =>
  ({ id: 'w', clientId: 'w', startedAt: '2026-10-26T12:00:00', endedAt: '2026-10-26T13:00:00', programDayId: 'd1', sets }) as unknown as Schemas['Workout'];

test('a day still planned: its session and its moves with sets and reps', () => {
  const view = dayView(strip({ planned: true }), PROGRAM, [], 'METRIC');
  expect(view).toMatchObject({ state: 'planned', session: 'Upper', rows: [{ name: 'Bench press', detail: '3 × 6-10' }] });
});

test('a day trained: the best working set of each move, in the unit of the person; warm-ups are not counted', () => {
  const day = strip({ date: '2026-10-26', weekday: 'MONDAY', trained: true });
  const sets = [set(40, 10, 'bench_press', 'WARM_UP'), set(80, 6), set(85, 5), set(85, 7)];
  expect(dayView(day, PROGRAM, [workout(sets)], 'METRIC').rows).toEqual([{ id: 'bench_press', name: 'Bench press', detail: '85 kg × 7' }]);
  expect(dayView(day, PROGRAM, [workout(sets)], 'IMPERIAL').rows[0].detail).toBe('185 lb × 7');
});

test('a day with only a weigh-in, and a day with nothing: no rows, and nothing says missed (U7)', () => {
  expect(dayView(strip({ logged: true }), PROGRAM, [], 'METRIC')).toEqual({ state: 'logged', session: null, rows: [] });
  expect(dayView(strip({}), PROGRAM, [], 'METRIC')).toEqual({ state: 'rest', session: null, rows: [] });
});

test('a session skipped is no plan', () => {
  const skipped = { ...PROGRAM, week: [{ date: '2026-10-28', programDayId: 'd1', skipped: true }] } as unknown as Schemas['Program'];
  expect(dayView(strip({ planned: false }), skipped, [], 'METRIC').state).toBe('rest');
});
