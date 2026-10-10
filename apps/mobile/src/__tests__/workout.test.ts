/**
 * The workout on the phone (K-405): which workout is under way, what the user did last time, and each planned move's
 * rows — the suggestion shown faint (the server's next target, K-217), what was done, and the sides of a one-sided move.
 * Nothing here decides a load: the server's target is shown as it came; only what the user did is carried forward.
 */
import type { components } from '@/api/schema';
import type { LocalRecord } from '@/sync/store';
import { t } from '@/copy';
import { exerciseStatus } from '@/train/session';
import { workoutParams } from '@/train/params';
import { activeWorkout, extraPlan, finishRecord, lastTime, openTooLong, planExercise, sessionMoves } from '@/train/workout';

type Schemas = components['schemas'];

let seq = 0;
function row(
  kind: string,
  clientId: string,
  body: unknown,
  parentClientId: string | null = null,
  state: LocalRecord['state'] = 'SYNCED',
): LocalRecord {
  seq += 1;
  return { seq, clientId, kind, parentClientId, body, state, serverId: null, serverBody: null, errorCode: null };
}
const workout = (clientId: string, programDayId?: string, state: LocalRecord['state'] = 'SYNCED') =>
  row('workout', clientId, { clientId, startedAt: '2026-09-28T17:00:00Z', ...(programDayId ? { programDayId } : {}) }, null, state);
const set = (
  workoutId: string,
  clientId: string,
  exerciseId: string,
  loadKg: number,
  reps: number,
  extra: Partial<Schemas['NewSet']> = {},
  state: LocalRecord['state'] = 'SYNCED',
) => row('set', clientId, { clientId, exerciseId, setType: 'WORKING', loadKg, reps, ...extra }, workoutId, state);
const finish = (workoutId: string) => row('finish', `f-${workoutId}`, { endedAt: '2026-09-28T18:00:00Z' }, workoutId);

const bench: Schemas['PlannedExercise'] = { exerciseId: 'bench_press', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1 };
const benchMove = { id: 'bench_press', unilateral: false, load: 'EXTERNAL' } as Schemas['Exercise'];
const rowMove = { id: 'one_arm_dumbbell_row', unilateral: true, load: 'EXTERNAL' } as Schemas['Exercise'];
const pushUp = { id: 'push_up', unilateral: false, load: 'BODYWEIGHT' } as Schemas['Exercise'];

describe('the workout under way', () => {
  test('is the newest one not finished, with its sets in the order they were done', () => {
    const records = [
      workout('w1'),
      set('w1', 's1', 'squat', 100, 5),
      finish('w1'),
      workout('w2', 'day-a'),
      set('w2', 's2', 'bench_press', 60, 8),
      set('w2', 's3', 'bench_press', 60, 7, {}, 'PENDING'),
    ];
    expect(activeWorkout(records)).toEqual({
      clientId: 'w2',
      startedAt: '2026-09-28T17:00:00Z',
      programDayId: 'day-a',
      sets: [expect.objectContaining({ clientId: 's2' }), expect.objectContaining({ clientId: 's3' })],
    });
  });

  test('there is none when every workout is finished, or the only open one was refused by the server', () => {
    expect(activeWorkout([workout('w1'), finish('w1')])).toBeNull();
    expect(activeWorkout([workout('w1', undefined, 'REJECTED')])).toBeNull();
    expect(activeWorkout([])).toBeNull();
  });

  test('only the newest workout can be under way: an older one left open does not come back when the newest is finished', () => {
    expect(activeWorkout([workout('old'), workout('new'), set('new', 's1', 'bench_press', 60, 8), finish('new')])).toBeNull();
    expect(activeWorkout([workout('old'), workout('new', undefined, 'REJECTED')])).toBeNull();
  });

  test('a finish the server refused leaves the workout under way, so it can be finished again', () => {
    const refused = { ...finish('w1'), state: 'REJECTED' as const };
    expect(activeWorkout([workout('w1'), refused])?.clientId).toBe('w1');
  });

  test('a workout started and finished offline (not sent yet) counts like a sent one', () => {
    expect(activeWorkout([workout('w1', undefined, 'PENDING')])?.clientId).toBe('w1');
    const pendingFinish = { ...finish('w1'), state: 'PENDING' as const };
    expect(activeWorkout([workout('w1', undefined, 'PENDING'), pendingFinish])).toBeNull();
    const records = [workout('w0', undefined, 'PENDING'), set('w0', 'a', 'bench_press', 57.5, 8, {}, 'PENDING'), workout('now')];
    expect(lastTime(records, 'bench_press', 'now').map((s) => s.loadKg)).toEqual([57.5]);
  });

  test('a refused set is not counted as done', () => {
    const records = [workout('w1'), set('w1', 's1', 'bench_press', 60, 8, {}, 'REJECTED')];
    expect(activeWorkout(records)?.sets).toEqual([]);
  });
});

describe('a workout left open past the time the server keeps one open (unfinished_session_close_hours, K-961)', () => {
  const HOUR = 60 * 60 * 1000;
  const NOW = Date.parse('2026-10-10T12:00:00Z');
  const startedAgo = (hours: number) => ({ ...workout('w1', 'day-a'), body: { clientId: 'w1', startedAt: new Date(NOW - hours * HOUR).toISOString(), programDayId: 'day-a' } });
  const closeHours = workoutParams.unfinishedSessionCloseHours;

  test('openTooLong: past the parameter it is, within it it is not (the edge is still open)', () => {
    expect(openTooLong(new Date(NOW - (closeHours * HOUR + 1)).toISOString(), NOW)).toBe(true);
    expect(openTooLong(new Date(NOW - closeHours * HOUR).toISOString(), NOW)).toBe(false);
    expect(openTooLong(new Date(NOW - HOUR).toISOString(), NOW)).toBe(false);
  });

  test('given the moment, a workout left open past it is retired: the server closed it, so it is under way no more', () => {
    expect(activeWorkout([startedAgo(closeHours + 1)], NOW)).toBeNull();
    expect(activeWorkout([startedAgo(closeHours - 1)], NOW)?.clientId).toBe('w1');
  });

  test('a retired one hides nothing older: only the newest is ever under way', () => {
    const old = { ...startedAgo(2), clientId: 'old', body: { clientId: 'old', startedAt: new Date(NOW - 2 * HOUR).toISOString() } };
    expect(activeWorkout([old, startedAgo(closeHours + 5)], NOW)).toBeNull();
  });

  test('without the moment the age is not asked (the session screen opened on its own workout)', () => {
    expect(activeWorkout([startedAgo(closeHours + 100)])?.clientId).toBe('w1');
  });
});

describe('last time', () => {
  test('is the working sets of the newest other workout with that move', () => {
    const records = [
      workout('w1'),
      set('w1', 'a', 'bench_press', 55, 8),
      finish('w1'),
      workout('w2'),
      set('w2', 'b', 'bench_press', 57.5, 8),
      set('w2', 'c', 'bench_press', 40, 10, { setType: 'WARM_UP' }),
      set('w2', 'd', 'bench_press', 57.5, 7),
      finish('w2'),
      workout('w3'),
      set('w3', 'e', 'squat', 100, 5),
      finish('w3'),
      workout('now'),
      set('now', 'f', 'bench_press', 60, 8),
    ];
    expect(lastTime(records, 'bench_press', 'now').map((s) => [s.loadKg, s.reps])).toEqual([
      [57.5, 8],
      [57.5, 7],
    ]);
  });

  test('is empty for a move never done', () => {
    expect(lastTime([workout('w1'), set('w1', 'a', 'squat', 100, 5)], 'bench_press', 'now')).toEqual([]);
  });
});

describe('skipped sets and a skipped move (K-972, ADR-075 #5): kept on the phone, never sent, no catch-up', () => {
  const done = (loadKg: number, reps: number, side: Schemas['Side'] = 'BOTH') =>
    ({ clientId: `s${loadKg}${reps}${side}`, exerciseId: 'bench_press', setType: 'WORKING', loadKg, reps, rir: 1, side }) as Schemas['NewSet'];

  test('a skipped set is its own row: the sets done fill the others, in order; the next set is the one after', () => {
    const plan = planExercise(bench, benchMove, [], [done(60, 8)], { sets: [{ side: 'BOTH', set: 1 }], move: false });
    expect(plan.rows.map((r) => [r.done?.reps ?? null, r.skipped])).toEqual([
      [8, false],
      [null, true],
      [null, false],
    ]);
    expect(plan.current).toBe(2);
  });

  test('every set skipped or done: the move is done, no set is added for the skipped one', () => {
    const plan = planExercise(bench, benchMove, [], [done(60, 8), done(60, 8)], { sets: [{ side: 'BOTH', set: 2 }], move: false });
    expect(plan.rows).toHaveLength(3);
    expect(plan.current).toBeNull();
  });

  test("a one-sided set skipped after its left side: the left stays done, the right is skipped", () => {
    const row = { ...bench, exerciseId: 'one_arm_dumbbell_row', sets: 2 };
    const left = { ...done(20, 10, 'LEFT'), exerciseId: 'one_arm_dumbbell_row' };
    const plan = planExercise(row, rowMove, [], [left], { sets: [{ side: 'RIGHT', set: 0 }], move: false });
    expect(plan.rows.map((r) => [r.side, r.done?.reps ?? null, r.skipped])).toEqual([
      ['LEFT', 10, false],
      ['RIGHT', null, true],
      ['LEFT', null, false],
      ['RIGHT', null, false],
    ]);
    expect(plan.current).toBe(2);
  });

  // #517 review (a fix, K1 note in the PR): a move skipped after a set of it was done is that move done, not "Skipped".
  test('a skipped move: every set not done is skipped, the move is done; it says Skipped only with no set done', () => {
    const plan = planExercise(bench, benchMove, [], [done(60, 8)], { sets: [], move: true });
    expect(plan.rows.map((r) => r.skipped)).toEqual([false, true, true]);
    expect(plan.current).toBeNull();
    expect(exerciseStatus(plan)).toBe(t('workout.allDone'));
    expect(exerciseStatus(planExercise(bench, benchMove, [], [], { sets: [], move: true }))).toBe(t('workout.statusSkipped'));
  });

  test('none skipped: as before', () => {
    expect(planExercise(bench, benchMove, [], [done(60, 8)]).rows.map((r) => r.skipped)).toEqual([false, false, false]);
  });
});

describe('a planned move as rows', () => {
  test("the server's next target is the faint suggestion on every row", () => {
    const plan = planExercise({ ...bench, nextLoadKg: 62.5, nextReps: 6 }, benchMove, [], []);
    expect(plan.rows.map((r) => [r.side, r.suggested.loadKg, r.suggested.reps, r.done])).toEqual([
      ['BOTH', 62.5, 6, null],
      ['BOTH', 62.5, 6, null],
      ['BOTH', 62.5, 6, null],
    ]);
  });

  test("this week's sets set the rows: a deload week has fewer (K-217, the server's count)", () => {
    expect(planExercise({ ...bench, sets: 2 }, benchMove, [], []).rows).toHaveLength(2);
  });

  test("without a target, last time's load and reps of the same row; without either, the bottom of the range and no load", () => {
    const last = [set('w1', 'a', 'bench_press', 57.5, 8), set('w1', 'b', 'bench_press', 57.5, 7)].map((r) => r.body as Schemas['NewSet']);
    const plan = planExercise(bench, benchMove, last, []);
    expect(plan.rows.map((r) => [r.suggested.loadKg, r.suggested.reps, r.last?.reps ?? null])).toEqual([
      [57.5, 8, 8],
      [57.5, 7, 7],
      [57.5, 6, null],
    ]);
    expect(planExercise(bench, benchMove, [], []).rows[0].suggested).toEqual({ loadKg: null, reps: 6 });
  });

  test('what was done fills the rows in order, and the next row suggests the load just lifted', () => {
    const done = [set('now', 'x', 'bench_press', 60, 8, { rir: 1 })].map((r) => r.body as Schemas['NewSet']);
    const plan = planExercise({ ...bench, nextLoadKg: 62.5, nextReps: 6 }, benchMove, [], done);
    expect(plan.rows[0].done).toEqual(expect.objectContaining({ loadKg: 60, reps: 8, rir: 1 }));
    expect(plan.rows[1].suggested).toEqual({ loadKg: 60, reps: 6 });
    expect(plan.current).toBe(1);
  });

  test('a set beyond the plan is shown as one more row', () => {
    const done = [1, 2, 3, 4].map((i) => set('now', `x${i}`, 'bench_press', 60, 8).body as Schemas['NewSet']);
    const plan = planExercise(bench, benchMove, [], done);
    expect(plan.rows).toHaveLength(4);
    expect(plan.current).toBeNull();
  });

  test('a one-sided move has a row per side, left then right, and each side is filled by its own sets', () => {
    const done = [set('now', 'l1', 'one_arm_dumbbell_row', 20, 12, { side: 'LEFT' }).body as Schemas['NewSet']];
    const plan = planExercise({ ...bench, exerciseId: 'one_arm_dumbbell_row', sets: 2 }, rowMove, [], done);
    expect(plan.rows.map((r) => [r.side, r.done?.clientId ?? null])).toEqual([
      ['LEFT', 'l1'],
      ['RIGHT', null],
      ['LEFT', null],
      ['RIGHT', null],
    ]);
    expect(plan.current).toBe(1);
  });

  test("a one-sided move takes last time's load and reps from the same side", () => {
    const last = [
      set('w1', 'l', 'one_arm_dumbbell_row', 20, 12, { side: 'LEFT' }),
      set('w1', 'r', 'one_arm_dumbbell_row', 22, 10, { side: 'RIGHT' }),
    ].map((r) => r.body as Schemas['NewSet']);
    const plan = planExercise({ ...bench, exerciseId: 'one_arm_dumbbell_row', sets: 1 }, rowMove, last, []);
    expect(plan.rows.map((r) => [r.side, r.suggested.loadKg, r.suggested.reps, r.last?.clientId])).toEqual([
      ['LEFT', 20, 12, 'l'],
      ['RIGHT', 22, 10, 'r'],
    ]);
  });

  test('a bodyweight move has no load to suggest: always 0', () => {
    const plan = planExercise({ ...bench, exerciseId: 'push_up', nextLoadKg: 5, nextReps: 12 }, pushUp, [], []);
    expect(plan.rows[0].suggested).toEqual({ loadKg: 0, reps: 12 });
  });

  test('warm-ups are not rows of the plan', () => {
    const done = [set('now', 'w', 'bench_press', 40, 10, { setType: 'WARM_UP' }).body as Schemas['NewSet']];
    expect(planExercise(bench, benchMove, [], done).rows.every((r) => r.done === null)).toBe(true);
  });
});

test("a finish names the moves whose form was not clean, once each, and carries the workout's clientId", () => {
  expect(finishRecord('w2', 'local-f', new Date('2026-09-28T18:00:00Z'), ['bench_press', 'squat', 'bench_press'])).toEqual({
    kind: 'finish',
    clientId: 'local-f',
    workoutClientId: 'w2',
    body: { endedAt: '2026-09-28T18:00:00.000Z', uncleanExerciseIds: ['bench_press', 'squat'] },
  });
});

test('a finish with a note carries it, without its outer spaces; only spaces is none (K-422)', () => {
  const at = new Date('2026-09-28T18:00:00Z');
  expect(finishRecord('w2', 'f1', at, [], ' Slept 5 hours ')).toMatchObject({ body: { note: 'Slept 5 hours' } });
  const without = finishRecord('w2', 'f2', at, [], '  ');
  expect(without.kind === 'finish' && without.body).not.toHaveProperty('note');
});

describe('a move added to the session, outside the plan (K-416)', () => {
  const done = (exerciseId: string, loadKg: number, reps: number, side?: Schemas['Side']) =>
    ({
      clientId: `d-${loadKg}-${reps}-${side ?? ''}`,
      exerciseId,
      setType: 'WORKING',
      loadKg,
      reps,
      rir: 1,
      ...(side ? { side } : {}),
    }) as Schemas['NewSet'];

  test('the sets done, then one open row: as many as the user does, never a planned count', () => {
    const plan = extraPlan(benchMove, [], [done('bench_press', 60, 8), done('bench_press', 60, 7)]);
    expect(plan.rows.map((r) => r.done?.reps ?? null)).toEqual([8, 7, null]);
    expect(plan.current).toBe(2);
  });

  test("the open row suggests the load just lifted in this session, else last time's at that row, else last time's heaviest", () => {
    expect(extraPlan(benchMove, [], [done('bench_press', 60, 8)]).rows[1].suggested).toEqual({ loadKg: 60, reps: 8 });
    const last = [done('bench_press', 55, 10), done('bench_press', 57.5, 8)];
    expect(extraPlan(benchMove, last, []).rows[0].suggested).toEqual({ loadKg: 55, reps: 10 });
    expect(extraPlan(benchMove, last, [done('bench_press', 55, 10), done('bench_press', 57.5, 8)]).rows[2].suggested).toEqual({
      loadKg: 57.5,
      reps: 8,
    });
  });

  test('never done before: nothing to suggest, the user types it — no reps made up', () => {
    expect(extraPlan(benchMove, [], []).rows[0].suggested).toEqual({ loadKg: null, reps: null });
  });

  test('a bodyweight move suggests no load; a one-sided move has a row a side', () => {
    expect(extraPlan(pushUp, [], []).rows[0].suggested.loadKg).toBe(0);
    const plan = extraPlan(rowMove, [], [done('one_arm_dumbbell_row', 20, 10, 'LEFT')]);
    expect(plan.rows.map((r) => [r.side, r.done?.reps ?? null])).toEqual([
      ['LEFT', 10],
      ['RIGHT', null],
    ]);
    expect(plan.current).toBe(1);
  });

  test("other moves' sets are not its", () => {
    expect(extraPlan(benchMove, [], [done('squat', 100, 5)]).rows).toHaveLength(1);
  });

  // K-973 (ADR-075 Ek 7, Ek 8): a move swapped away from keeps its sets but is no move to come back to; its one open row is not
  // a set to do, so it is never "next" and never holds the finish.
  test('closed (a move swapped away from): the sets done stay, no open row, nothing left to do', () => {
    const plan = extraPlan(benchMove, [], [done('bench_press', 60, 8), done('bench_press', 60, 7)], true);
    expect(plan.rows.map((r) => r.done?.reps ?? null)).toEqual([8, 7]);
    expect(plan.current).toBeNull();
    expect(exerciseStatus(plan)).toBe(t('workout.allDone'));
  });

  test('closed, a one-sided move with one side done is closed too', () => {
    const plan = extraPlan(rowMove, [], [done('one_arm_dumbbell_row', 20, 10, 'LEFT')], true);
    expect(plan.current).toBeNull();
  });

  test("this session's set comes before last time's at the same row; last time's row is shown beside it", () => {
    const last = [done('bench_press', 50, 10), done('bench_press', 50, 10), done('bench_press', 50, 10)];
    const plan = extraPlan(benchMove, last, [done('bench_press', 60, 8)]);
    expect(plan.rows[1].suggested).toEqual({ loadKg: 60, reps: 8 });
    expect(plan.rows[1].last).toEqual(last[1]);
  });

  test("past last time's rows on a side, that side's heaviest last time; never done on it, the other side's set just done", () => {
    const last = [done('one_arm_dumbbell_row', 30, 8, 'RIGHT')];
    const uneven = extraPlan(rowMove, last, [done('one_arm_dumbbell_row', 32, 8, 'LEFT'), done('one_arm_dumbbell_row', 34, 8, 'LEFT')]);
    expect(uneven.rows[3]).toMatchObject({ side: 'RIGHT', suggested: { loadKg: 30, reps: 8 } });
    expect(extraPlan(rowMove, [], [done('one_arm_dumbbell_row', 20, 10, 'LEFT')]).rows[1].suggested).toEqual({ loadKg: 20, reps: 10 });
  });

  test('both sides done: a new round opens, left first', () => {
    const plan = extraPlan(rowMove, [], [done('one_arm_dumbbell_row', 20, 10, 'LEFT'), done('one_arm_dumbbell_row', 20, 10, 'RIGHT')]);
    expect(plan.rows.map((r) => [r.side, r.done === null])).toEqual([
      ['LEFT', false],
      ['RIGHT', false],
      ['LEFT', true],
      ['RIGHT', true],
    ]);
    expect(plan.current).toBe(2);
  });

  test('a warm-up is not a work row, nor what the open row suggests', () => {
    const warmup = { ...done('bench_press', 20, 5), setType: 'WARM_UP' } as Schemas['NewSet'];
    const plan = extraPlan(benchMove, [], [warmup]);
    expect(plan.rows).toHaveLength(1);
    expect(plan.rows[0]).toMatchObject({ done: null, suggested: { loadKg: null, reps: null } });
  });
});

describe("today's session is the server's (K-971, K-964, ADR-073 Ek 3): its moves as the week says, never picked here", () => {
  const squat: Schemas['PlannedExercise'] = { exerciseId: 'squat', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1, nextLoadKg: 100 };
  const row: Schemas['PlannedExercise'] = { exerciseId: 'barbell_row', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1 };
  const curl: Schemas['PlannedExercise'] = { exerciseId: 'curl', baseSets: 2, sets: 2, reps: { min: 8, max: 12 }, targetRir: 1 };
  const day: Schemas['ProgramDay'] = { id: 'd1', nameKey: 'programDays.full_body_a.name', exercises: [squat, { ...bench, nextLoadKg: 60 }, row, curl] };
  const ON = '2026-10-07';
  const week = (session: Partial<Schemas['WeekSession']>): Schemas['WeekSession'][] => [
    { programDayId: 'other', date: '2026-10-05', exerciseIds: ['x'] },
    { programDayId: 'd1', date: '2026-10-07', exerciseIds: day.exercises.map((e) => e.exerciseId), ...session },
  ];

  test('no week from the server: the day as planned', () => {
    expect(sessionMoves(day, undefined, ON)).toEqual(day.exercises);
  });

  test('the short version: only the moves the server lists, in its order', () => {
    expect(sessionMoves(day, week({ short: true, exerciseIds: ['squat', 'bench_press', 'barbell_row'] }), ON).map((e) => e.exerciseId)).toEqual([
      'squat',
      'bench_press',
      'barbell_row',
    ]);
  });

  test("a move swapped for today is the swap's own planned move, in the place of the one it stands in for, with no target", () => {
    const swapIn: Schemas['PlannedExercise'] = { exerciseId: 'dumbbell_bench_press', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1 };
    const moves = sessionMoves(day, week({ exerciseIds: ['squat', 'dumbbell_bench_press', 'barbell_row', 'curl'], swaps: [{ insteadOf: 'bench_press', exercise: swapIn }] }), ON);
    expect(moves.map((e) => e.exerciseId)).toEqual(['squat', 'dumbbell_bench_press', 'barbell_row', 'curl']);
    expect(moves[1]).toBe(swapIn);
    expect(moves[1].nextLoadKg).toBeUndefined();
  });

  test('a day not in the week (on no weekday) is the day as planned', () => {
    expect(sessionMoves({ ...day, id: 'd9' }, week({}), ON)).toEqual(day.exercises);
  });

  test("another day's session of the same program day is not today's: its short version or swap was for that day only", () => {
    // Picked short on Monday and not trained; the day started on Thursday, or last week's cached week offline.
    expect(sessionMoves(day, week({ short: true, exerciseIds: ['squat'] }), '2026-10-09')).toEqual(day.exercises);
    expect(sessionMoves(day, week({ short: true, exerciseIds: ['squat'] }), '2026-10-14')).toEqual(day.exercises);
  });
});

describe("a move swapped in starts with nothing of its own (K-972, ADR-075 Ek 7): last time's weight and reps are not the aim", () => {
  const dumbbell = { exerciseId: 'dumbbell_bench_press', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1 };
  const dumbbellMove = { id: 'dumbbell_bench_press', unilateral: false, load: 'EXTERNAL' } as Schemas['Exercise'];
  const last = [
    { clientId: 'x1', exerciseId: 'dumbbell_bench_press', setType: 'WORKING', loadKg: 32.5, reps: 12 },
    { clientId: 'x2', exerciseId: 'dumbbell_bench_press', setType: 'WORKING', loadKg: 32.5, reps: 11 },
  ] as Schemas['NewSet'][];

  test("fresh: no weight, the range's bottom for reps; not fresh: last time's, as for any planned move", () => {
    expect(planExercise(dumbbell, dumbbellMove, last, []).rows[0].suggested).toEqual({ loadKg: 32.5, reps: 12 });
    expect(planExercise(dumbbell, dumbbellMove, last, [], undefined, true).rows[0].suggested).toEqual({ loadKg: null, reps: 6 });
  });

  test('fresh, what was just lifted in this session still carries to the next row', () => {
    const lifted = { clientId: 'y1', exerciseId: 'dumbbell_bench_press', setType: 'WORKING', loadKg: 30, reps: 10 } as Schemas['NewSet'];
    const plan = planExercise(dumbbell, dumbbellMove, last, [lifted], undefined, true);
    expect(plan.rows[1].suggested).toEqual({ loadKg: 30, reps: 6 });
  });

  test('a bodyweight move is 0 either way', () => {
    const planned = { ...dumbbell, exerciseId: 'push_up' };
    expect(planExercise(planned, pushUp, [], [], undefined, true).rows[0].suggested.loadKg).toBe(0);
  });

  // K-973 (ADR-075 #3, Ek 8): the server says a move is at calibration (no target, a calibration step): the weight is picked,
  // not the phone's guess from its own history; a server that says nothing of it leaves the move as it was.
  test('a move the server calibrates starts with no weight whatever the phone remembers; with no step it is as before', () => {
    const calibrating = { ...dumbbell, calibrationStepKg: 2.5 };
    expect(planExercise(calibrating, dumbbellMove, last, []).rows[0].suggested).toEqual({ loadKg: null, reps: 6 });
    expect(planExercise({ ...calibrating, nextLoadKg: 30 }, dumbbellMove, last, []).rows[0].suggested.loadKg).toBe(30);
    expect(planExercise(dumbbell, dumbbellMove, last, []).rows[0].suggested.loadKg).toBe(32.5);
  });
});
