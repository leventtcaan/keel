/**
 * The charts' longer ranges (K-1260, ADR-096 Ek 1): the weight trend back over a range (everything in 399-day windows), and a lift's
 * best set of each Monday week from its paged history, by the server's rule, the server's own weeks kept where it has them.
 */
import type { components } from '@/api/schema';
import { joinWeeks, rangeFrom, readAllTrend, readLiftWeeks, weekBests } from '@/progress/longRange';
import type { TrainingCache } from '@/train/trainData';

type Schemas = components['schemas'];
const set = (exerciseId: string, loadKg: number, reps: number, rir?: number, setType: Schemas['SetType'] = 'WORKING') => ({
  id: `s-${Math.random()}`,
  clientId: `c-${Math.random()}`,
  exerciseId,
  setType,
  loadKg,
  reps,
  ...(rir === undefined ? {} : { rir }),
});
const session = (startedAt: string, sets: ReturnType<typeof set>[]): Schemas['Workout'] => ({ id: startedAt, clientId: startedAt, startedAt, sets });

test('a range is its days back from today, today included', () => {
  expect(rangeFrom('2026-11-28', 182)).toBe('2026-05-31');
  expect(rangeFrom('2026-11-28', 1)).toBe('2026-11-28');
});

test("each Monday week's best working set: the heaviest, then the most reps, then the fewest left (none last); a warm-up or no reps never", () => {
  const weeks = weekBests(
    [
      session('2026-06-01T17:00:00Z', [set('squat', 100, 5, 2), set('squat', 100, 5, 1), set('squat', 120, 3, undefined, 'WARM_UP')]),
      session('2026-06-04T17:00:00Z', [set('squat', 100, 6), set('squat', 105, 0, 0), set('bench', 200, 1, 0)]),
      session('2026-06-08T17:00:00Z', [set('squat', 102.5, 4, 1)]),
    ],
    'squat',
  );
  expect(weeks).toEqual([
    { weekOf: '2026-06-01', loadKg: 100, reps: 6, held: false },
    { weekOf: '2026-06-08', loadKg: 102.5, reps: 4, rir: 1, held: false },
  ]);
});

test("the server's weeks hold where it has them (with their held ring); the phone's fill the weeks before, oldest first", () => {
  const server = [{ weekOf: '2026-06-08', loadKg: 102.5, reps: 4, rir: 1, held: true }];
  const phone = [
    { weekOf: '2026-06-01', loadKg: 100, reps: 6, held: false },
    { weekOf: '2026-06-08', loadKg: 102.5, reps: 4, rir: 1, held: false },
  ];
  expect(joinWeeks(server, phone)).toEqual([phone[0], server[0]]);
});

test('everything of the trend: windows back from today until one has no point, joined oldest first', async () => {
  const asked: [string, string][] = [];
  const pages: Record<string, Schemas['TrendPoint'][]> = {
    '2026-11-28': [{ day: '2026-02-01', kg: 84 }, { day: '2026-11-27', kg: 80 }],
    '2025-10-25': [{ day: '2025-06-01', kg: 90 }],
    '2024-09-21': [],
  };
  const read = await readAllTrend(async (from, to) => {
    asked.push([from, to]);
    return { state: 'ready', value: pages[to] ?? [] };
  }, '2026-11-28', 399);
  expect(asked).toEqual([
    ['2025-10-26', '2026-11-28'],
    ['2024-09-22', '2025-10-25'],
    ['2023-08-20', '2024-09-21'],
  ]);
  expect(read).toEqual({ state: 'ready', value: [{ day: '2025-06-01', kg: 90 }, { day: '2026-02-01', kg: 84 }, { day: '2026-11-27', kg: 80 }] });
});

test('a window that fails fails the whole: no half a history drawn as all of it', async () => {
  const read = await readAllTrend(async (_from, to) => (to === '2026-11-28' ? { state: 'ready', value: [{ day: '2026-11-27', kg: 80 }] } : { state: 'failed', problem: 'NoConnection' }), '2026-11-28', 399);
  expect(read.state).toBe('failed');
});

test("a lift's pages are read back to the Monday of the range's first week: that week is whole", async () => {
  // The range begins on Wednesday 2026-06-03; page 1 ends on Tuesday 06-02, page 2 holds Monday 06-01 of the same week.
  const pages: Record<string, Schemas['MoveHistory']> = {
    first: { sessions: [session('2026-06-10T17:00:00Z', [set('squat', 100, 5)]), session('2026-06-02T17:00:00Z', [set('squat', 90, 5)])], next: 'p2', records: [] },
    p2: { sessions: [session('2026-06-01T17:00:00Z', [set('squat', 95, 5)]), session('2026-05-20T17:00:00Z', [set('squat', 80, 5)])], next: 'p3', records: [] },
  };
  const asked: (string | undefined)[] = [];
  const training = {
    moveHistory: async (_api: unknown, _move: string, before?: string) => {
      asked.push(before);
      return { read: { state: 'ready' as const, value: pages[before ?? 'first'] }, kept: false };
    },
  } as unknown as TrainingCache;
  const read = await readLiftWeeks(training, {} as never, 'squat', '2026-06-03');
  expect(asked).toEqual([undefined, 'p2']);
  expect(read).toEqual({ state: 'ready', value: [
    { weekOf: '2026-06-01', loadKg: 95, reps: 5, held: false },
    { weekOf: '2026-06-08', loadKg: 100, reps: 5, held: false },
  ] });
});
