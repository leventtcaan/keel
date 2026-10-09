/**
 * Today's workout on This week (K-969, ADR-077 #1): which card shows, from what the server and the phone already hold. A
 * workout under way on this phone (its own records, K-961) comes first: "Open workout · Continue"; a workout finished
 * today: done, no Start; then this week's session as the server laid it out (Program.week, K-964): today's, its short
 * version, skipped, or moved away to another day; a week off; rest. Nothing here decides a session.
 */
import type { components } from '@/api/schema';
import type { LocalRecord } from '@/sync/store';
import { cardioToday, finishedOnPhone, todayCardOf } from '@/today/todayWorkout';

type Schemas = components['schemas'];

const A: Schemas['ProgramDay'] = { id: 'a', nameKey: 'programDays.full_body_a.name', weekday: 'FRIDAY', exercises: [] };
const B: Schemas['ProgramDay'] = { id: 'b', nameKey: 'programDays.full_body_b.name', weekday: 'MONDAY', exercises: [] };
const program = (week: Schemas['WeekSession'][], extra: Partial<Schemas['Program']> = {}): Schemas['Program'] => ({
  id: 'p',
  source: 'GENERATED',
  days: [A, B],
  week,
  ...extra,
});
const FRIDAY = '2026-12-25';
const onFriday: Schemas['WeekSession'] = { programDayId: 'a', date: FRIDAY, exerciseIds: ['squat', 'bench_press', 'lat_pulldown', 'plank'] };
const base = { day: FRIDAY, active: null, doneToday: null };

test("today's session as the server laid it out", () => {
  expect(todayCardOf({ ...base, program: program([onFriday]) })).toEqual({ kind: 'session', day: A, session: onFriday });
});

test('the short version is the session, marked short', () => {
  const short = { ...onFriday, short: true, exerciseIds: ['squat', 'bench_press', 'lat_pulldown'] };
  expect(todayCardOf({ ...base, program: program([short]) })).toEqual({ kind: 'session', day: A, session: short });
});

test('skipped: said so, no Start', () => {
  expect(todayCardOf({ ...base, program: program([{ ...onFriday, skipped: true }]) })).toEqual({ kind: 'skipped', day: A });
});

test("moved away: the day it went to (the server's date); today is rest", () => {
  const moved = { ...onFriday, date: '2026-12-26', moved: true };
  expect(todayCardOf({ ...base, program: program([moved]) })).toEqual({ kind: 'moved', day: A, to: '2026-12-26' });
});

test("another day's session moved onto today is today's session", () => {
  const here = { programDayId: 'b', date: FRIDAY, exerciseIds: [], moved: true };
  expect(todayCardOf({ ...base, program: program([here, { ...onFriday, date: '2026-12-26', moved: true }]) })).toEqual({
    kind: 'session',
    day: B,
    session: here,
  });
});

test('no session today: rest; a week off in force: the week off', () => {
  expect(todayCardOf({ ...base, program: program([]) })).toEqual({ kind: 'rest' });
  expect(todayCardOf({ ...base, program: program([onFriday], { restUntil: '2026-12-27' }) })).toEqual({ kind: 'restWeek' });
});

test('a workout under way on this phone comes first: "Open workout · Continue", with the sets logged so far', () => {
  const active = { clientId: 'c', startedAt: '2026-12-25T09:00:00Z', programDayId: 'a', sets: [{}, {}] as Schemas['NewSet'][] };
  expect(todayCardOf({ ...base, program: program([onFriday]), active })).toEqual({ kind: 'open', day: A, sets: 2 });
  expect(todayCardOf({ ...base, program: null, active: { ...active, programDayId: null } })).toEqual({ kind: 'open', day: null, sets: 2 });
});

test('a workout finished today: done, its day by the workout\'s own program day', () => {
  const doneToday = { workoutId: 'w', programDayId: 'a' };
  expect(todayCardOf({ ...base, program: program([onFriday]), doneToday })).toEqual({ kind: 'done', day: A, workoutId: 'w' });
});

test('no program: nothing to show', () => {
  expect(todayCardOf({ ...base, program: null })).toEqual({ kind: 'none' });
});

describe("today's cardio (ADR-074, K-959)", () => {
  const cardio: Schemas['ProgramCardio'] = {
    source: 'GENERATED',
    minutes: 30,
    sessionsPerWeek: 3,
    sessions: [{ weekday: 'FRIDAY', place: 'AFTER_LIFT' } as Schemas['PlannedCardio']],
    doneThisWeek: 1,
    afterLiftOverLine: false,
  };

  test('a session planned today: its minutes', () => {
    expect(cardioToday(program([], { cardio }), FRIDAY)).toBe(30);
  });

  test('none today, cardio turned off, or none at all: nothing', () => {
    expect(cardioToday(program([], { cardio }), '2026-12-24')).toBeNull();
    expect(cardioToday(program([], { cardio: { ...cardio, sessionsPerWeek: 0 } }), FRIDAY)).toBeNull();
    expect(cardioToday(program([]), FRIDAY)).toBeNull();
  });
});

describe('a workout finished on this phone, its finish not sent yet (offline)', () => {
  const record = (seq: number, kind: string, clientId: string, parentClientId: string | null, body: unknown, state = 'PENDING', serverId: string | null = null) =>
    ({ seq, clientId, kind, parentClientId, body, state, serverId, serverBody: null, errorCode: null }) as LocalRecord;
  const workout = (startedAt: string, state = 'PENDING', serverId: string | null = null) =>
    record(1, 'workout', 'wo', null, { clientId: 'wo', startedAt, programDayId: 'a' }, state, serverId);
  const finish = (state = 'PENDING') => record(2, 'finish', 'f', 'wo', { endedAt: '2026-12-25T10:00:00Z', uncleanExerciseIds: [] }, state);

  test("finished today: done, by the workout's own day; its server id once it has one", () => {
    expect(finishedOnPhone([workout('2026-12-25T09:00:00Z'), finish()], FRIDAY)).toEqual({ workoutId: null, programDayId: 'a' });
    expect(finishedOnPhone([workout('2026-12-25T09:00:00Z', 'SYNCED', 'w9'), finish()], FRIDAY)).toEqual({ workoutId: 'w9', programDayId: 'a' });
  });

  test('not finished, finished another day, or refused by the server: not done today', () => {
    expect(finishedOnPhone([workout('2026-12-25T09:00:00Z')], FRIDAY)).toBeNull();
    expect(finishedOnPhone([workout('2026-12-24T09:00:00Z'), finish()], FRIDAY)).toBeNull();
    expect(finishedOnPhone([workout('2026-12-25T09:00:00Z'), finish('REJECTED')], FRIDAY)).toBeNull();
    expect(finishedOnPhone([workout('2026-12-25T09:00:00Z', 'REJECTED'), finish()], FRIDAY)).toBeNull();
  });
});
