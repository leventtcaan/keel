/**
 * The guide's "Today's workout" line matches the card it points at (K-1066): loads ready in a regular week, "Session 1 finds your
 * weights" when the server has no target yet, today's done with the next session when the workout is done, and no "Tap Start"
 * for a card that has no Start.
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { workoutLine } from '@/guide/workoutLine';
import type { TodayCard } from '@/today/todayWorkout';

type Schemas = components['schemas'];

const move = (extra: Partial<Schemas['PlannedExercise']> = {}): Schemas['PlannedExercise'] => ({
  exerciseId: 'bench',
  baseSets: 3,
  sets: 3,
  reps: { min: 6, max: 10 },
  targetRir: 2,
  ...extra,
});
const day = (id: string, name: string, exercises: Schemas['PlannedExercise'][]): Schemas['ProgramDay'] => ({ id, name, exercises });
const UPPER = day('d1', 'Upper B', [move()]);
const LOWER = day('d2', 'Lower A', [move()]);
const session = (programDayId: string, date: string): Schemas['WeekSession'] => ({ programDayId, date }) as Schemas['WeekSession'];
const program = (week: Schemas['WeekSession'][]): Schemas['Program'] => ({ days: [UPPER, LOWER], week }) as Schemas['Program'];
const TODAY = '2026-10-29'; // a Thursday

test('a session whose moves have targets: the loads are ready', () => {
  const card: TodayCard = { kind: 'session', day: day('d1', 'Upper B', [move({ nextLoadKg: 26, nextReps: 10 })]), session: session('d1', TODAY) };
  expect(workoutLine(card, program([]), TODAY)).toBe(t('guide.workout.body'));
});

test('a session with no target yet (the first week): session 1 finds the weights', () => {
  const card: TodayCard = { kind: 'session', day: UPPER, session: session('d1', TODAY) };
  expect(workoutLine(card, program([]), TODAY)).toBe(t('guide.workout.first'));
  expect(t('guide.workout.first')).toContain('Session 1 finds your weights');
});

test('a workout done today: today is done and the next session is named, no Start', () => {
  const card: TodayCard = { kind: 'done', day: UPPER, workoutId: 'w1' };
  const line = workoutLine(card, program([session('d2', '2026-10-31')]), TODAY);
  expect(line).toBe(t('guide.workout.done', { session: 'Lower A', weekday: t('onboarding.schedule.dayName.SATURDAY') }));
  expect(line).not.toContain('Start');
});

test('done with no session left in the week: no next is invented', () => {
  const card: TodayCard = { kind: 'done', day: UPPER, workoutId: 'w1' };
  expect(workoutLine(card, program([]), TODAY)).toBe(t('guide.workout.doneLast'));
  expect(workoutLine(card, null, TODAY)).toBe(t('guide.workout.doneLast'));
});

test('a card with no Start (rest, under way) is not told to be pressed', () => {
  for (const card of [{ kind: 'rest' }, { kind: 'restWeek' }, { kind: 'open', day: UPPER, sets: 2, onPhone: true, workoutId: null }] as TodayCard[]) {
    expect(workoutLine(card, program([]), TODAY)).toBe(t('guide.workout.other'));
  }
});
