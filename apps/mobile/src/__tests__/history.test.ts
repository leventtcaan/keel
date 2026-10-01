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
      [record('set', both.clientId, both, 'w1', 'SYNCED'), record('set', refused.clientId, refused, 'w1', 'REJECTED')],
    );
    expect(session.sets).toHaveLength(1);
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

  test('no work sets, no records', () => {
    expect(recordsOf(BENCH, sessionsWith([set('bench_press', 40, 10, undefined, 'WARM_UP')]))).toEqual([]);
  });
});
