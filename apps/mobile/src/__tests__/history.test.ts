/**
 * A move's history and its records (K-415, ADR-033): every session that has the move, newest first — from the server's
 * list, kept on the phone, joined with what the phone has not sent yet, each workout once. Records come from work sets
 * only; an isolation move has no weight record, only the most reps at each weight (G6 K-33); no volume record (B §6.4).
 */
import type { components } from '@/api/schema';
import type { LocalRecord } from '@/sync/store';
import { historyOf, recordsOf, sessionsOf } from '@/train/history';

type Schemas = components['schemas'];
type NewSet = Schemas['NewSet'];

const move = (id: string, kind: 'COMPOUND' | 'ISOLATION', load: Schemas['Exercise']['load'] = 'EXTERNAL') =>
  ({ id, kind, load, unilateral: false }) as Schemas['Exercise'];
const BENCH = move('bench_press', 'COMPOUND');
const RAISE = move('lateral_raise', 'ISOLATION');
const PUSH_UP = move('push_up', 'COMPOUND', 'BODYWEIGHT');
const DIP = move('dip', 'COMPOUND', 'BODYWEIGHT_PLUS_EXTERNAL');

let n = 0;
const set = (exerciseId: string, loadKg: number, reps: number, rir?: number, setType: NewSet['setType'] = 'WORKING'): NewSet => ({
  clientId: `s${++n}`,
  exerciseId,
  setType,
  loadKg,
  reps,
  ...(rir === undefined ? {} : { rir }),
});
const workout = (clientId: string, startedAt: string, sets: NewSet[]) =>
  ({ id: `srv-${clientId}`, clientId, startedAt, sets: sets.map((s) => ({ ...s, id: `srv-${s.clientId}` })) }) as Schemas['Workout'];

let seq = 0;
const record = (
  kind: string,
  clientId: string,
  body: unknown,
  parent: string | null = null,
  state: LocalRecord['state'] = 'PENDING',
): LocalRecord => ({
  seq: ++seq,
  clientId,
  kind,
  parentClientId: parent,
  body,
  state,
  serverId: null,
  serverBody: null,
  errorCode: null,
});

describe('sessions: the server list joined with what the phone has not sent', () => {
  test('each workout once, newest first; a set only on the phone joins its workout', () => {
    const onServer = set('bench_press', 80, 8, 1);
    const onPhone = set('bench_press', 80, 7, 1);
    const sessions = sessionsOf(
      [workout('w1', '2026-09-21T17:00:00Z', [onServer]), workout('w2', '2026-09-28T17:00:00Z', [])],
      [
        record('workout', 'w2', { clientId: 'w2', startedAt: '2026-09-28T17:00:00Z' }, null, 'SYNCED'),
        record('set', onPhone.clientId, onPhone, 'w2'),
        record('workout', 'w3', { clientId: 'w3', startedAt: '2026-09-30T17:00:00Z' }),
        record('set', 'x1', set('squat', 100, 5, 2), 'w3'),
      ],
    );
    expect(sessions.map((s) => s.clientId)).toEqual(['w3', 'w2', 'w1']);
    expect(sessions[1].sets.map((s) => s.reps)).toEqual([7]);
  });

  test('a set both sent and kept on the phone is one set; a refused record is not part of it', () => {
    const both = set('bench_press', 80, 8, 1);
    const refused = set('bench_press', 85, 8, 1);
    const [session] = sessionsOf(
      [workout('w1', '2026-09-21T17:00:00Z', [both])],
      [
        record('workout', 'w1', { clientId: 'w1', startedAt: '2026-09-21T17:00:00Z' }, null, 'SYNCED'),
        record('set', both.clientId, both, 'w1', 'SYNCED'),
        record('set', refused.clientId, refused, 'w1', 'REJECTED'),
      ],
    );
    expect(session.sets).toHaveLength(1);
  });

  test('a workout the server refused is no session', () => {
    expect(sessionsOf([], [record('workout', 'w9', { clientId: 'w9', startedAt: '2026-09-21T17:00:00Z' }, null, 'REJECTED')])).toEqual([]);
  });

  test("the phone's own workouts older than the window are not part of it: a new phone would not have them either", () => {
    const old = record('workout', 'w0', { clientId: 'w0', startedAt: '2025-03-01T17:00:00Z' }, null, 'SYNCED');
    const recent = record('workout', 'w1', { clientId: 'w1', startedAt: '2025-10-02T08:00:00Z' }, null, 'SYNCED');
    expect(sessionsOf(null, [old, recent], '2025-10-02').map((s) => s.clientId)).toEqual(['w1']);
  });

  test("a session's note: the server's, or the phone's finish not sent yet (K-422)", () => {
    const sessions = sessionsOf(
      [{ ...workout('w1', '2026-09-21T17:00:00Z', []), note: 'Slept 5 hours' }],
      [
        record('workout', 'w2', { clientId: 'w2', startedAt: '2026-09-28T17:00:00Z' }),
        record('finish', 'f2', { endedAt: '2026-09-28T18:00:00Z', note: 'Knee fine today' }, 'w2'),
      ],
    );
    expect(sessions.map((s) => s.note)).toEqual(['Knee fine today', 'Slept 5 hours']);
  });

  test("the server lists the workout, the phone's finish with its note is not sent yet: the phone's note shows", () => {
    const [session] = sessionsOf(
      [{ ...workout('w1', '2026-09-21T17:00:00Z', []), note: 'from an older finish' }],
      [
        record('workout', 'w1', { clientId: 'w1', startedAt: '2026-09-21T17:00:00Z' }, null, 'SYNCED'),
        record('finish', 'f1', { endedAt: '2026-09-21T18:00:00Z', note: 'Slept 5 hours' }, 'w1', 'PENDING'),
      ],
    );
    expect(session.note).toBe('Slept 5 hours');
  });

  test("a finish already sent: the server's note is the one (it may have been replaced since)", () => {
    const [session] = sessionsOf(
      [{ ...workout('w1', '2026-09-21T17:00:00Z', []), note: 'Slept 6 hours' }],
      [
        record('workout', 'w1', { clientId: 'w1', startedAt: '2026-09-21T17:00:00Z' }, null, 'SYNCED'),
        record('finish', 'f1', { endedAt: '2026-09-21T18:00:00Z', note: 'Slept 5 hours' }, 'w1', 'SYNCED'),
      ],
    );
    expect(session.note).toBe('Slept 6 hours');
  });

  test('a finish the server refused carries no note: it is not part of what was done', () => {
    const [session] = sessionsOf(
      [],
      [
        record('workout', 'w2', { clientId: 'w2', startedAt: '2026-09-28T17:00:00Z' }),
        record('finish', 'f2', { endedAt: '2026-09-28T18:00:00Z', note: 'refused' }, 'w2', 'REJECTED'),
      ],
    );
    expect(session.note).toBeUndefined();
  });

  test("a set the server has and the phone keeps too is the server's copy", () => {
    const sent = set('bench_press', 80, 8, 1);
    const [session] = sessionsOf(
      [workout('w1', '2026-09-21T17:00:00Z', [sent])],
      [
        record('workout', 'w1', { clientId: 'w1', startedAt: '2026-09-21T17:00:00Z' }, null, 'SYNCED'),
        record('set', sent.clientId, { ...sent, reps: 7 }, 'w1', 'SYNCED'),
      ],
    );
    expect(session.sets.map((s) => s.reps)).toEqual([8]);
  });

  test("without the server's list (offline, nothing kept), the phone's own workouts", () => {
    const sessions = sessionsOf(null, [
      record('workout', 'w1', { clientId: 'w1', startedAt: '2026-09-21T17:00:00Z' }, null, 'SYNCED'),
      record('set', 'a', set('bench_press', 80, 8, 1), 'w1', 'SYNCED'),
    ]);
    expect(sessions.map((s) => s.sets.length)).toEqual([1]);
  });
});

test("a move's history: the sessions that have it, newest first, with its sets only (warm-ups too, they are what was done)", () => {
  const sessions = sessionsOf(
    [
      workout('w1', '2026-09-21T17:00:00Z', [
        set('bench_press', 40, 10, undefined, 'WARM_UP'),
        set('bench_press', 80, 8, 1),
        set('squat', 100, 5, 2),
      ]),
      workout('w2', '2026-09-24T17:00:00Z', [set('squat', 100, 6, 2)]),
      workout('w3', '2026-09-28T17:00:00Z', [set('bench_press', 82.5, 6, 1)]),
    ],
    [],
  );
  const history = historyOf(sessions, 'bench_press');
  expect(history.map((h) => h.startedAt)).toEqual(['2026-09-28T17:00:00Z', '2026-09-21T17:00:00Z']);
  expect(history[1].sets.map((s) => s.setType)).toEqual(['WARM_UP', 'WORKING']);
});

describe('records', () => {
  const sessionsWith = (...days: NewSet[][]) =>
    sessionsOf(
      days.map((sets, i) => workout(`w${i}`, `2026-09-${String(10 + i).padStart(2, '0')}T17:00:00Z`, sets)),
      [],
    );

  test('a compound move: the heaviest (its most reps), the highest estimated max, and the most reps at each weight', () => {
    const records = recordsOf(BENCH, sessionsWith([set('bench_press', 80, 8, 1), set('bench_press', 80, 9, 0)], [set('bench_press', 85, 4, 2)]));
    expect(records).toEqual([
      { kind: 'heaviest', loadKg: 85, reps: 4, on: '2026-09-11T17:00:00Z' },
      // 80 × 9 at RIR 0 is 104 (Epley, the engine's); 85 × 4 at RIR 2 is 102.
      { kind: 'estimatedMax', kg: 104, on: '2026-09-10T17:00:00Z' },
      { kind: 'repsAt', loadKg: 85, reps: 4, on: '2026-09-11T17:00:00Z' },
      { kind: 'repsAt', loadKg: 80, reps: 9, on: '2026-09-10T17:00:00Z' },
    ]);
  });

  test('an isolation move: no weight record and no estimated max, only the most reps at each weight (G6 K-33)', () => {
    const records = recordsOf(
      RAISE,
      sessionsWith([set('lateral_raise', 12.5, 12, 1)], [set('lateral_raise', 15, 10, 1), set('lateral_raise', 12.5, 14, 1)]),
    );
    expect(records).toEqual([
      { kind: 'repsAt', loadKg: 15, reps: 10, on: '2026-09-11T17:00:00Z' },
      { kind: 'repsAt', loadKg: 12.5, reps: 14, on: '2026-09-11T17:00:00Z' },
    ]);
  });

  test('a bodyweight move: the most reps', () => {
    expect(recordsOf(PUSH_UP, sessionsWith([set('push_up', 0, 18, 1)], [set('push_up', 0, 22, 1)]))).toEqual([
      { kind: 'mostReps', reps: 22, on: '2026-09-11T17:00:00Z' },
    ]);
  });

  test('a weighted bodyweight move: the heaviest added, and the most reps with the body alone; no estimated max', () => {
    expect(recordsOf(DIP, sessionsWith([set('dip', 0, 12, 1), set('dip', 10, 8, 1)], [set('dip', 15, 5, 2)]))).toEqual([
      { kind: 'heaviest', loadKg: 15, reps: 5, on: '2026-09-11T17:00:00Z' },
      { kind: 'mostReps', reps: 12, on: '2026-09-10T17:00:00Z' },
    ]);
  });

  test('only work sets count; a tie keeps the first time it was done', () => {
    const records = recordsOf(
      BENCH,
      sessionsWith([set('bench_press', 100, 3, undefined, 'WARM_UP'), set('bench_press', 80, 8)], [set('bench_press', 80, 8)]),
    );
    expect(records).toEqual([
      { kind: 'heaviest', loadKg: 80, reps: 8, on: '2026-09-10T17:00:00Z' },
      { kind: 'repsAt', loadKg: 80, reps: 8, on: '2026-09-10T17:00:00Z' },
    ]);
  });

  test('two loads the user sees as one weight are one: 62.5 and 62.51 kg are both 137.8 lb; the first time holds it', () => {
    const lb = (kg: number) => Math.round((kg / 0.45359237) * 10) / 10;
    const sessions = sessionsWith([set('bench_press', 62.5, 6, 1)], [set('bench_press', 62.51, 6, 1)]);
    expect(recordsOf(BENCH, sessions, lb).filter((r) => r.kind !== 'estimatedMax')).toEqual([
      { kind: 'heaviest', loadKg: 62.5, reps: 6, on: '2026-09-10T17:00:00Z' },
      { kind: 'repsAt', loadKg: 62.5, reps: 6, on: '2026-09-10T17:00:00Z' },
    ]);
  });

  test('the same top weight for more reps later: the heaviest is the later, fuller set', () => {
    expect(recordsOf(BENCH, sessionsWith([set('bench_press', 85, 4)], [set('bench_press', 85, 5)]))[0]).toEqual({
      kind: 'heaviest',
      loadKg: 85,
      reps: 5,
      on: '2026-09-11T17:00:00Z',
    });
  });

  test('an estimated max reached again later keeps the first day', () => {
    // 80 × 8 at RIR 1 and 80 × 9 at RIR 0 are both 104.
    const records = recordsOf(BENCH, sessionsWith([set('bench_press', 80, 8, 1)], [set('bench_press', 80, 9, 0)]));
    expect(records.find((r) => r.kind === 'estimatedMax')).toEqual({ kind: 'estimatedMax', kg: 104, on: '2026-09-10T17:00:00Z' });
  });

  test('no work sets, no records', () => {
    expect(recordsOf(BENCH, sessionsWith([set('bench_press', 40, 10, undefined, 'WARM_UP')]))).toEqual([]);
  });
});
