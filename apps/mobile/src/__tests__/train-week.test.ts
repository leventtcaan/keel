/**
 * This week's sessions as the Train tab reads them (K-970, ADR-073 Ek 3): every date, move and flag is the server's
 * (`Program.week`); the phone only finds today's date among them, puts the planned moves in the session's order with
 * today's swaps in their place, and names the program's split from its days' names (K-970 user test: "PPL" is not
 * said of an upper/lower and push/pull/legs program).
 */
import type { components } from '@/api/schema';
import { sessionMoves, splitName, todaySession, weekRows } from '@/train/week';

type Schemas = components['schemas'];

const planned = (exerciseId: string, extra: Partial<Schemas['PlannedExercise']> = {}): Schemas['PlannedExercise'] => ({
  exerciseId,
  baseSets: 3,
  sets: 3,
  reps: { min: 6, max: 10 },
  targetRir: 1,
  swapOptions: [],
  ...extra,
});
const UPPER: Schemas['ProgramDay'] = { id: 'u', nameKey: 'programDays.upper.name', weekday: 'TUESDAY', exercises: [planned('bench_press'), planned('lat_pulldown'), planned('seated_row')] };
const LOWER: Schemas['ProgramDay'] = { id: 'l', nameKey: 'programDays.lower.name', weekday: 'WEDNESDAY', exercises: [planned('squat')] };
const PUSH: Schemas['ProgramDay'] = { id: 'p', nameKey: 'programDays.push.name', weekday: 'THURSDAY', exercises: [planned('bench_press')] };
const program = (week: Schemas['WeekSession'][], days = [UPPER, LOWER, PUSH], extra: Partial<Schemas['Program']> = {}): Schemas['Program'] => ({
  id: 'prog',
  source: 'GENERATED',
  days,
  week,
  ...extra,
});
const session = (programDayId: string, date: string, extra: Partial<Schemas['WeekSession']> = {}): Schemas['WeekSession'] => ({
  programDayId,
  date,
  exerciseIds: (programDayId === 'u' ? UPPER : programDayId === 'l' ? LOWER : PUSH).exercises.map((e) => e.exerciseId),
  ...extra,
});
// Tuesday 13 Oct 2026.
const TUESDAY = '2026-10-13';

describe("today's session", () => {
  test("is the week's session on today's date, with its program day; none on a day with none", () => {
    const p = program([session('u', TUESDAY), session('l', '2026-10-14')]);
    expect(todaySession(p, TUESDAY)).toEqual({ session: p.week?.[0], day: UPPER });
    expect(todaySession(p, '2026-10-15')).toBeNull();
    expect(todaySession(program([]), TUESDAY)).toBeNull();
  });

  test('a session moved onto today is today\'s, whatever its weekday', () => {
    const p = program([session('l', TUESDAY, { moved: true })]);
    expect(todaySession(p, TUESDAY)?.day).toBe(LOWER);
  });

  test("its moves are the session's, in its order: the short version's first ones only", () => {
    const short = session('u', TUESDAY, { short: true, exerciseIds: ['bench_press', 'lat_pulldown'] });
    expect(sessionMoves(UPPER, short).map((m) => m.planned.exerciseId)).toEqual(['bench_press', 'lat_pulldown']);
  });

  test("a move swapped for today is the move in its place, as the server sent it, and says which it stands in for", () => {
    const fresh = planned('dumbbell_bench_press', { swapOptions: ['push_up'] });
    const swapped = session('u', TUESDAY, {
      exerciseIds: ['dumbbell_bench_press', 'lat_pulldown', 'seated_row'],
      swaps: [{ insteadOf: 'bench_press', exercise: fresh }],
    });
    const moves = sessionMoves(UPPER, swapped);
    expect(moves[0]).toEqual({ planned: fresh, insteadOf: UPPER.exercises[0] });
    expect(moves[1]).toEqual({ planned: UPPER.exercises[1] });
  });
});

test("the week's other sessions in date order, each with its program day and the server's flags", () => {
  const p = program([session('p', '2026-10-15'), session('u', TUESDAY), session('l', '2026-10-12', { skipped: true })]);
  expect(weekRows(p, TUESDAY).map((r) => [r.weekday, r.day.id, r.session.skipped === true])).toEqual([
    ['MONDAY', 'l', true],
    ['THURSDAY', 'p', false],
  ]);
});

describe('the split', () => {
  test("is named from the days' names, each kind once in the program's order", () => {
    expect(splitName(program([], [UPPER, LOWER]))).toBe('Upper / Lower');
    expect(splitName(program([], [UPPER, LOWER, PUSH, { ...PUSH, id: 'pl', nameKey: 'programDays.pull.name' }, { ...LOWER, id: 'lg', nameKey: 'programDays.legs.name' }]))).toBe(
      'Upper / Lower + Push / Pull / Legs',
    );
    expect(splitName(program([], [{ ...UPPER, nameKey: 'programDays.full_body_a.name' }, { ...UPPER, id: 'b', nameKey: 'programDays.full_body_b.name' }]))).toBe('Full body');
  });

  test("the user's own program is their own, whatever its days are called", () => {
    expect(splitName(program([], [{ id: 'o', name: 'Push', exercises: [] }], { source: 'OWN' }))).toBe('Your own program');
  });
});
