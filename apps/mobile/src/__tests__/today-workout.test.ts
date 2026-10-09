/**
 * Today's workout on This week (K-969, ADR-077 #1): which card shows, read by the same rule as the Train card
 * (src/train/week.ts › sessionState, K-970, K-995): the server's today; the phone's own records first (a workout under
 * way, a finish waiting to be sent), then the server's word (DONE, OPEN elsewhere); then this week's session as the
 * server laid it out: today's, its short version, skipped, or moved off today; a week off; rest. Nothing here decides a
 * session or a date.
 */
import type { components } from '@/api/schema';
import type { LocalRecord } from '@/sync/store';
import { cardioToday, todayCardOf } from '@/today/todayWorkout';
import { finishedOnPhone, sessionState, todayKind } from '@/train/week';

type Schemas = components['schemas'];

const A: Schemas['ProgramDay'] = { id: 'a', nameKey: 'programDays.full_body_a.name', weekday: 'FRIDAY', exercises: [] };
const B: Schemas['ProgramDay'] = { id: 'b', nameKey: 'programDays.full_body_b.name', weekday: 'MONDAY', exercises: [] };
const FRIDAY = '2026-12-25';
const program = (week: Schemas['WeekSession'][], extra: Partial<Schemas['Program']> = {}): Schemas['Program'] => ({
  id: 'p',
  source: 'GENERATED',
  days: [A, B],
  today: FRIDAY,
  weekOf: '2026-12-21',
  week,
  ...extra,
});
const onFriday: Schemas['WeekSession'] = { programDayId: 'a', date: FRIDAY, exerciseIds: ['squat', 'bench_press', 'lat_pulldown', 'plank'] };
// Friday morning on the phone's calendar.
const now = new Date(2026, 11, 25, 9, 0);
const base = { records: [] as LocalRecord[], now, kept: false };
const record = (seq: number, kind: string, clientId: string, parentClientId: string | null, body: unknown, state = 'PENDING', serverId: string | null = null) =>
  ({ seq, clientId, kind, parentClientId, body, state, serverId, serverBody: null, errorCode: null }) as LocalRecord;
const started = (programDayId: string | null, sets = 0) => [
  record(1, 'workout', 'wo', null, { clientId: 'wo', startedAt: new Date(2026, 11, 25, 8, 0).toISOString(), programDayId }),
  ...Array.from({ length: sets }, (_, i) => record(2 + i, 'set', `s${i}`, 'wo', { exerciseId: 'squat', setType: 'WORKING', loadKg: 80, reps: 8 })),
];
const finished = (serverId: string | null = null) => [
  record(1, 'workout', 'wo', null, { clientId: 'wo', startedAt: new Date(2026, 11, 25, 8, 0).toISOString(), programDayId: 'a' }, 'SYNCED', serverId),
  record(9, 'finish', 'f', 'wo', { endedAt: new Date(2026, 11, 25, 9, 0).toISOString(), uncleanExerciseIds: [] }),
];

test("today's session as the server laid it out", () => {
  expect(todayCardOf({ ...base, program: program([onFriday]) })).toEqual({ kind: 'session', day: A, session: onFriday });
});

test("the server's today, not the phone's clock (travelling, past midnight there)", () => {
  const saturdayOnThePhone = new Date(2026, 11, 26, 0, 30);
  expect(todayCardOf({ ...base, now: saturdayOnThePhone, program: program([onFriday]) })).toEqual({ kind: 'session', day: A, session: onFriday });
});

test('the short version is the session, marked short', () => {
  const short = { ...onFriday, short: true, exerciseIds: ['squat', 'bench_press', 'lat_pulldown'] };
  expect(todayCardOf({ ...base, program: program([short]) })).toEqual({ kind: 'session', day: A, session: short });
});

test('skipped: said so, no Start', () => {
  expect(todayCardOf({ ...base, program: program([{ ...onFriday, skipped: true }]) })).toEqual({ kind: 'skipped', day: A, undoable: false });
});

test("moved off today: the day it went to (the server's date), today is rest; found as the Train card finds it", () => {
  const moved = { ...onFriday, date: '2026-12-26', moved: true, movedFrom: FRIDAY, undoable: true };
  expect(todayCardOf({ ...base, program: program([moved]) })).toEqual({ kind: 'moved', day: A, to: '2026-12-26', undoable: true });
});

test("another day's session moved onto today is today's session", () => {
  const here = { programDayId: 'b', date: FRIDAY, exerciseIds: [], moved: true };
  expect(todayCardOf({ ...base, program: program([here, { ...onFriday, date: '2026-12-26', moved: true, undoable: true }]) })).toEqual({
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
  expect(todayCardOf({ ...base, records: started('a', 2), program: program([onFriday]) })).toEqual({ kind: 'open', day: A, sets: 2, onPhone: true });
  expect(todayCardOf({ ...base, records: started(null, 2), program: null })).toEqual({ kind: 'open', day: null, sets: 2, onPhone: true });
});

describe("the server's word on today's session (K-995)", () => {
  test('a skip that can be undone says so (WeekSession.undoable)', () => {
    expect(todayCardOf({ ...base, program: program([{ ...onFriday, skipped: true, undoable: true }]) })).toEqual({ kind: 'skipped', day: A, undoable: true });
  });

  test("today's session done (workout DONE): done, with the server's workout", () => {
    const done = { ...onFriday, workout: { id: 'w7', state: 'DONE' as const } };
    expect(todayCardOf({ ...base, program: program([done]) })).toEqual({ kind: 'done', day: A, workoutId: 'w7' });
  });

  test("today's session under way (workout OPEN) but not on this phone: open, nothing to continue here", () => {
    const open = { ...onFriday, workout: { id: 'w8', state: 'OPEN' as const } };
    expect(todayCardOf({ ...base, program: program([open]) })).toEqual({ kind: 'open', day: A, sets: null, onPhone: false });
  });

  test('the phone still comes first: its open workout, then its finish waiting to be sent, even before the server says DONE', () => {
    const open = { ...onFriday, workout: { id: 'w8', state: 'OPEN' as const } };
    expect(todayCardOf({ ...base, records: started('a', 1), program: program([open]) })).toEqual({ kind: 'open', day: A, sets: 1, onPhone: true });
    expect(todayCardOf({ ...base, records: finished(), program: program([open]) })).toEqual({ kind: 'done', day: A, workoutId: null });
    expect(todayCardOf({ ...base, records: finished('w9'), program: program([onFriday]) })).toEqual({ kind: 'done', day: A, workoutId: 'w9' });
  });
});

test('no program and nothing on the phone: nothing to show', () => {
  expect(todayCardOf({ ...base, program: null })).toEqual({ kind: 'none' });
});

/** A workout started `at` and finished (the finish kept): `serverId` once the server has it. */
const done = (clientId: string, seq: number, programDayId: string | null, serverId: string | null = null, at = new Date(2026, 11, 25, 8, 0)) => [
  record(seq, 'workout', clientId, null, { clientId, startedAt: at.toISOString(), programDayId }, serverId === null ? 'PENDING' : 'SYNCED', serverId),
  record(seq + 1, 'finish', `f-${clientId}`, clientId, { endedAt: new Date(at.getTime() + 3_600_000).toISOString(), uncleanExerciseIds: [] }),
];

describe('a workout finished today is done, whichever session it was (one rule with the Train card)', () => {
  test("another day's session finished while today's is planned: done, by the workout's own program day", () => {
    expect(todayCardOf({ ...base, records: done('wb', 1, 'b', 'w5'), program: program([onFriday]) })).toEqual({ kind: 'done', day: B, workoutId: 'w5' });
  });

  test('a free workout (no program day): done, no day to name', () => {
    expect(todayCardOf({ ...base, records: done('wf', 1, null, 'w6'), program: program([onFriday]) })).toEqual({ kind: 'done', day: null, workoutId: 'w6' });
  });

  test('a day without a session, one of the week picked and finished: done', () => {
    expect(todayCardOf({ ...base, records: done('wb', 1, 'b'), program: program([]) })).toEqual({ kind: 'done', day: B, workoutId: null });
  });

  test("two finished today: today's own session's workout, not the newest one", () => {
    const records = [...done('wa', 1, 'a', 'w1'), ...done('wb', 3, 'b', 'w2')];
    expect(todayCardOf({ ...base, records, program: program([onFriday]) })).toEqual({ kind: 'done', day: A, workoutId: 'w1' });
    expect(finishedOnPhone(records, FRIDAY, 'a')).toEqual({ workoutId: 'w1', programDayId: 'a' });
    expect(finishedOnPhone(records, FRIDAY)).toEqual({ workoutId: 'w2', programDayId: 'b' });
  });

  test("the server's DONE for today's session, another finished here: today's session's own workout", () => {
    const server = { ...onFriday, workout: { id: 'w7', state: 'DONE' as const } };
    expect(todayCardOf({ ...base, records: done('wb', 3, 'b', 'w2'), program: program([server]) })).toEqual({ kind: 'done', day: A, workoutId: 'w7' });
  });

  test('a week off in force comes before done, as on the Train card', () => {
    expect(todayCardOf({ ...base, records: done('wa', 1, 'a'), program: program([onFriday], { restUntil: '2026-12-27' }) })).toEqual({ kind: 'restWeek' });
  });
});

describe("the program is not read (offline, no copy): the phone's records alone", () => {
  test('a workout finished here is done; its day is not known', () => {
    expect(todayCardOf({ ...base, records: done('wa', 1, 'a', 'w1'), program: null })).toEqual({ kind: 'done', day: null, workoutId: 'w1' });
  });

  test('one finished yesterday is not today\'s', () => {
    expect(todayCardOf({ ...base, records: done('wa', 1, 'a', 'w1', new Date(2026, 11, 24, 8, 0)), program: null })).toEqual({ kind: 'none' });
  });
});

describe('the copy of the program kept offline (kept): the phone\'s day, and the server\'s old word is not believed', () => {
  test("a DONE or an undo that was the server's then is not shown now", () => {
    const old = { ...onFriday, workout: { id: 'w7', state: 'DONE' as const } };
    expect(todayCardOf({ ...base, kept: true, program: program([old]) })).toEqual({ kind: 'session', day: A, session: old });
    const skipped = { ...onFriday, skipped: true, undoable: true };
    expect(todayCardOf({ ...base, kept: true, program: program([skipped]) })).toEqual({ kind: 'skipped', day: A, undoable: false });
  });

  test("a session moved off today is not said to be (its Undo was the server's then): rest, as the Train card", () => {
    const moved = { ...onFriday, date: '2026-12-26', moved: true, movedFrom: FRIDAY, undoable: true };
    expect(todayCardOf({ ...base, kept: true, program: program([moved]) })).toEqual({ kind: 'rest' });
  });

  test("the phone's own records still count: a finish here is done", () => {
    expect(todayCardOf({ ...base, kept: true, records: done('wa', 1, 'a', 'w1'), program: program([onFriday]) })).toEqual({ kind: 'done', day: A, workoutId: 'w1' });
  });

  test('a week off that ended (a copy kept before it did) is not a week off now', () => {
    expect(todayCardOf({ ...base, kept: true, program: program([onFriday], { restUntil: '2026-12-20' }) })).toEqual({ kind: 'session', day: A, session: onFriday });
  });
});

describe("the server's today and the phone's day (travelling, past midnight there)", () => {
  // Saturday 00:30 on the phone; the user's calendar, as the server says, is still Friday.
  const saturday = new Date(2026, 11, 26, 0, 30);

  test("a workout started on the server's day and finished here is today's, whatever the phone's day now", () => {
    const records = done('wa', 1, 'a', null, new Date(2026, 11, 25, 23, 0));
    expect(todayCardOf({ ...base, now: saturday, records, program: program([onFriday]) })).toEqual({ kind: 'done', day: A, workoutId: null });
  });

  test("a workout under way since the server's day is the one under way", () => {
    const records = [record(1, 'workout', 'wo', null, { clientId: 'wo', startedAt: new Date(2026, 11, 25, 23, 0).toISOString(), programDayId: 'a' })];
    expect(todayCardOf({ ...base, now: saturday, records, program: program([onFriday]) })).toEqual({ kind: 'open', day: A, sets: 0, onPhone: true });
  });
});

describe('the decision table: the Train card and This week read the one function (todayKind)', () => {
  const moved = { ...onFriday, date: '2026-12-26', moved: true, movedFrom: FRIDAY, undoable: true };
  const cases: [string, Schemas['Program'], { kept?: boolean; records?: LocalRecord[] }, string][] = [
    ["today's session", program([onFriday]), {}, 'session'],
    ['skipped', program([{ ...onFriday, skipped: true }]), {}, 'skipped'],
    ["the server's DONE", program([{ ...onFriday, workout: { id: 'w', state: 'DONE' } }]), {}, 'done'],
    ["the server's OPEN, not on this phone", program([{ ...onFriday, workout: { id: 'w', state: 'OPEN' } }]), {}, 'openElsewhere'],
    ['finished here, another day of the program', program([onFriday]), { records: done('wb', 1, 'b') }, 'done'],
    ['finished here, a free workout, no session today', program([]), { records: done('wf', 1, null) }, 'done'],
    ['a week off in force, with a session', program([onFriday], { restUntil: '2026-12-27' }), {}, 'restWeek'],
    ['a week off in force, a workout finished here', program([onFriday], { restUntil: '2026-12-27' }), { records: done('wa', 1, 'a') }, 'restWeek'],
    ['moved off today, undoable', program([moved]), {}, 'moved'],
    ['moved off today, from a kept copy', program([moved]), { kept: true }, 'rest'],
    ['no session today', program([]), {}, 'rest'],
  ];
  const cardKind: Record<string, string> = { openElsewhere: 'open' };

  test.each(cases)('%s', (_name, p, input, kind) => {
    const records = input.records ?? [];
    const kept = input.kept ?? false;
    expect(todayKind(p, sessionState({ program: p, kept, records, now }))).toBe(kind);
    // The card on This week is that kind, never another.
    expect(todayCardOf({ ...base, kept, records, program: p }).kind).toBe(cardKind[kind] ?? kind);
  });
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
