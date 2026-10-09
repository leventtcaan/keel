/**
 * This week's sessions as the Train tab reads them (K-970, ADR-073 Ek 3): every date, move and flag is the server's
 * (`Program.week`, `Program.today`); the phone only finds the server's today among them, puts the planned moves in the session's order with
 * today's swaps in their place, and names the program's split from its days' names (K-970 user test: "PPL" is not
 * said of an upper/lower and push/pull/legs program).
 */
import type { components } from '@/api/schema';
import type { LocalRecord } from '@/sync/store';
import { movedOffToday, sessionMoves, sessionState, splitName, todaySession, weekRows } from '@/train/week';

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
  test("is the week's session on the server's today, with its program day; none on a day with none (never the phone's clock)", () => {
    const week = [session('u', TUESDAY), session('l', '2026-10-14')];
    expect(todaySession(program(week, undefined, { today: TUESDAY }))).toEqual({ session: week[0], day: UPPER });
    expect(todaySession(program(week, undefined, { today: '2026-10-15' }))).toBeNull();
    expect(todaySession(program([], undefined, { today: TUESDAY }))).toBeNull();
    // A server that does not say what today is: no session is taken for today.
    expect(todaySession(program(week))).toBeNull();
  });

  test('a session moved onto today is today\'s, whatever its weekday', () => {
    const p = program([session('l', TUESDAY, { moved: true, movedFrom: '2026-10-14' })], undefined, { today: TUESDAY });
    expect(todaySession(p)?.day).toBe(LOWER);
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
  expect(weekRows({ ...p, today: TUESDAY }).map((r) => [r.weekday, r.day.id, r.session.skipped === true])).toEqual([
    ['MONDAY', 'l', true],
    ['THURSDAY', 'p', false],
  ]);
});

describe('a session moved off today', () => {
  test('is the one the server says was moved today and can be undone (moved and undoable), wherever it now is', () => {
    const p = program(
      [session('u', '2026-10-14', { moved: true, movedFrom: TUESDAY, undoable: true }), session('l', '2026-10-15', { moved: true, movedFrom: '2026-10-14' })],
      undefined,
      { today: TUESDAY },
    );
    expect(movedOffToday(p)).toEqual({ session: p.week?.[0], day: UPPER });
  });

  test("moved twice (its program day is Monday, today it went on from Tuesday): still today's move, by undoable", () => {
    const p = program([session('u', '2026-10-14', { moved: true, movedFrom: '2026-10-12', undoable: true })], undefined, { today: TUESDAY });
    expect(movedOffToday(p)?.day).toBe(UPPER);
  });

  test('in a chain, the one pushed along is not the one moved off today', () => {
    const p = program(
      [session('l', '2026-10-15', { moved: true, movedFrom: TUESDAY }), session('u', '2026-10-14', { moved: true, movedFrom: '2026-10-12', undoable: true })],
      undefined,
      { today: TUESDAY },
    );
    expect(movedOffToday(p)?.day).toBe(UPPER);
  });

  test('a session moved on another day, skipped, or none moved: none', () => {
    expect(movedOffToday(program([session('u', '2026-10-15', { moved: true, movedFrom: '2026-10-14' })], undefined, { today: TUESDAY }))).toBeNull();
    expect(movedOffToday(program([session('u', TUESDAY, { skipped: true, undoable: true })], undefined, { today: TUESDAY }))).toBeNull();
    expect(movedOffToday(program([session('u', TUESDAY)], undefined, { today: TUESDAY }))).toBeNull();
  });
});

describe("today's session state: the phone's records first, then the server's word (as This week, K-969)", () => {
  const NOW = new Date(2026, 9, 13, 9, 0); // Tuesday 13 Oct on the phone
  const rec = (kind: string, clientId: string, body: unknown, extra: Partial<LocalRecord> = {}): LocalRecord => ({
    seq: 1,
    clientId,
    kind,
    parentClientId: kind === 'workout' ? null : 'w1',
    body,
    state: 'PENDING',
    serverId: null,
    serverBody: null,
    errorCode: null,
    ...extra,
  });
  const started = rec('workout', 'w1', { clientId: 'w1', startedAt: new Date(2026, 9, 13, 8, 0).toISOString(), programDayId: 'u' });
  const finished = rec('finish', 'f1', { endedAt: new Date(2026, 9, 13, 8, 50).toISOString() });
  const fresh = (week: Schemas['WeekSession'][], today = TUESDAY) => program(week, undefined, { today });

  test("a workout under way on this phone (sets still in the queue): on the phone, whatever the server knows", () => {
    const state = sessionState({ program: fresh([session('u', TUESDAY)]), kept: false, records: [started], now: NOW });
    expect(state.status).toBe('onPhone');
    expect(state.onPhone?.clientId).toBe('w1');
  });

  test('finished on this phone, the finish not sent yet: done, before the server says so', () => {
    expect(sessionState({ program: fresh([session('u', TUESDAY)]), kept: false, records: [started, finished], now: NOW }).status).toBe('done');
  });

  test("the server's word when the phone has none: DONE is done, OPEN not on this phone is open elsewhere", () => {
    expect(sessionState({ program: fresh([session('u', TUESDAY, { workout: { id: 's', state: 'DONE' } })]), kept: false, records: [], now: NOW }).status).toBe('done');
    expect(sessionState({ program: fresh([session('u', TUESDAY, { workout: { id: 's', state: 'OPEN' } })]), kept: false, records: [], now: NOW }).status).toBe(
      'openElsewhere',
    );
    expect(sessionState({ program: fresh([session('u', TUESDAY)]), kept: false, records: [], now: NOW }).status).toBe('none');
  });

  test("an open workout of another day (yesterday's left open) is not today's", () => {
    const yesterday = rec('workout', 'w0', { clientId: 'w0', startedAt: new Date(2026, 9, 12, 8, 0).toISOString(), programDayId: 'l' });
    const state = sessionState({ program: fresh([session('u', TUESDAY)]), kept: false, records: [yesterday], now: NOW });
    expect(state.status).toBe('none');
    // Still under way on this phone: the card continues it rather than start a second.
    expect(state.onPhone?.clientId).toBe('w0');
  });

  test("the copy kept offline from another day: the phone's day, and the kept session states are not believed", () => {
    // Kept on Monday: Monday was today and done. On Tuesday, offline, Tuesday's session is today's and not done.
    const monday = fresh([session('l', '2026-10-12', { workout: { id: 's', state: 'DONE' } }), session('u', TUESDAY)], '2026-10-12');
    const state = sessionState({ program: monday, kept: true, records: [], now: NOW });
    expect(state.today).toBe(TUESDAY);
    expect(state.stale).toBe(true);
    expect(state.found?.day).toBe(UPPER);
    expect(state.status).toBe('none');
  });

  test('a kept copy of today: the day is the same, the server states are still not believed', () => {
    const state = sessionState({ program: fresh([session('u', TUESDAY, { workout: { id: 's', state: 'OPEN' } })]), kept: true, records: [], now: NOW });
    expect(state.stale).toBe(true);
    expect(state.status).toBe('none');
  });
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
