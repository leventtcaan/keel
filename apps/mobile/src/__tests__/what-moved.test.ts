/**
 * "What moved" on the workout's end (K-974, ADR-075 #7 and Ek 2 "Ne arttı", K-1008): each move's best set and how it
 * stands against last time, from the server's `moves` as they come. The phone counts and compares nothing: it writes the
 * server's `by` in the user's unit, in the server's order, the first few (the parameter) and how many more. A drop is
 * said calmly (U7: no blame, no alarm), "same" and "held" and "first time" in plain words. No e1RM.
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { workoutParams } from '@/train/params';
import type { Move as Known } from '@/train/trainData';
import { whatMoved } from '@/train/whatMoved';

type Move = components['schemas']['MoveChange'];

const move = (exerciseId: string, loadKg: number, reps: number, change: Move['change'], by?: number): Move => ({
  exerciseId,
  best: { loadKg, reps },
  change,
  ...(by === undefined ? {} : { by }),
});

test('reps up: the best set, and by how many reps', () => {
  const { rows } = whatMoved([move('romanian_deadlift', 90, 9, 'REPS', 1)], 'METRIC');
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    name: 'Romanian deadlift',
    set: '90 × 9',
    change: t('workoutEnd.move.repsUp.one', { count: 1 }),
    tone: 'up',
  });
});

test('reps up by several: plural', () => {
  expect(whatMoved([move('seated_row', 60, 10, 'REPS', 2)], 'METRIC').rows[0].change).toBe(t('workoutEnd.move.repsUp.other', { count: 2 }));
});

test('load up: by the server difference, in kg', () => {
  const [row] = whatMoved([move('bench_press', 72.5, 8, 'LOAD', 2.5)], 'METRIC').rows;
  expect(row).toMatchObject({
    set: '72.5 × 8',
    change: t('workoutEnd.move.loadUp', { amount: '2.5 kg' }),
    tone: 'up',
  });
});

test('load up in lb: the set and the difference are written in the user unit (formatted, not recomputed against history)', () => {
  const [row] = whatMoved([move('bench_press', 72.5, 8, 'LOAD', 2.5)], 'IMPERIAL').rows;
  expect(row.set).toBe('159.8 × 8');
  expect(row.change).toBe(t('workoutEnd.move.loadUp', { amount: '5.5 lb' }));
});

test('lighter today: calm words with the amount, never a warning (U7)', () => {
  const [row] = whatMoved([move('bench_press', 70, 8, 'LOAD', -2.5)], 'METRIC').rows;
  expect(row.change).toBe(t('workoutEnd.move.loadDown', { amount: '2.5 kg' }));
  expect(row.tone).toBe('flat');
  expect(row.change).not.toMatch(/-|fail|miss|worse|drop|lost|only/i);
});

test('fewer reps: calm words, plural', () => {
  expect(whatMoved([move('squat', 100, 7, 'REPS', -1)], 'METRIC').rows[0]).toMatchObject({
    change: t('workoutEnd.move.repsDown.one', { count: 1 }),
    tone: 'flat',
  });
  expect(whatMoved([move('squat', 100, 6, 'REPS', -2)], 'METRIC').rows[0].change).toBe(t('workoutEnd.move.repsDown.other', { count: 2 }));
});

test('same, held and first time have their own plain words', () => {
  // A first time beside a move that has a past: the list shows (every move first is the first session, below).
  const { rows } = whatMoved([move('squat', 100, 8, 'SAME'), move('bench_press', 72.5, 8, 'HELD'), move('seated_row', 60, 9, 'FIRST')], 'METRIC');
  expect(rows.map((r) => r.change)).toEqual([t('workoutEnd.move.same'), t('workoutEnd.move.held'), t('workoutEnd.move.first')]);
  expect(rows.map((r) => r.tone)).toEqual(['flat', 'flat', 'flat']);
});

test('a load or reps change the server sent without its `by`: the set alone, nothing made up', () => {
  const { rows } = whatMoved([move('squat', 100, 8, 'LOAD'), move('bench_press', 70, 8, 'REPS')], 'METRIC');
  expect(rows.map((r) => r.change)).toEqual([null, null]);
});

test("the server's order is kept, and only the first few show with how many more", () => {
  const shown = workoutParams.summaryMovesShown;
  const many = Array.from({ length: shown + 2 }, (_, i) => move('squat', 100 + i, 8, 'LOAD', 1));
  const { rows, more } = whatMoved(many, 'METRIC');
  expect(rows).toHaveLength(shown);
  expect(rows.map((r) => r.set)).toEqual(many.slice(0, shown).map((m) => `${m.best.loadKg} × 8`));
  expect(more).toBe(2);
  expect(whatMoved(many.slice(0, shown), 'METRIC').more).toBe(0);
});

test('every move first time (the first session): nothing moved, no list; the baseline card says it', () => {
  expect(whatMoved([move('squat', 60, 8, 'FIRST'), move('bench_press', 40, 8, 'FIRST')], 'METRIC')).toEqual({ rows: [], more: 0 });
  expect(whatMoved([], 'METRIC')).toEqual({ rows: [], more: 0 });
});

test('imperial, reps up: the set is in lb, the reps difference is a count and does not change with the unit', () => {
  const [row] = whatMoved([move('squat', 100, 8, 'REPS', 2)], 'IMPERIAL').rows;
  expect(row.set).toBe('220.5 × 8');
  expect(row.change).toBe(t('workoutEnd.move.repsUp.other', { count: 2 }));
  expect(row.tone).toBe('up');
});

test('imperial, a lighter day: calm words, the amount in lb, flat', () => {
  const [row] = whatMoved([move('bench_press', 70, 8, 'LOAD', -2.5)], 'IMPERIAL').rows;
  expect(row.set).toBe('154.3 × 8');
  expect(row.change).toBe(t('workoutEnd.move.loadDown', { amount: '5.5 lb' }));
  expect(row.tone).toBe('flat');
});

test("the user's own move (not in the catalog) is named by what they called it, in the row and to VoiceOver", () => {
  const own = new Map<string, Known>([['custom-1', { id: 'custom-1', name: 'Zercher squat' } as Known]]);
  const [row] = whatMoved([move('custom-1', 80, 6, 'LOAD', 5)], 'METRIC', own).rows;
  expect(row.name).toBe('Zercher squat');
  expect(row.label).toBe(
    t('workoutEnd.move.label', { move: 'Zercher squat', set: '80 kg × 6', change: t('workoutEnd.move.loadUp', { amount: '5 kg' }) }),
  );
});

test('a spoken line per row: the move, the set with its unit, and the change', () => {
  const [row] = whatMoved([move('bench_press', 72.5, 8, 'LOAD', 2.5)], 'METRIC').rows;
  expect(row.label).toBe(
    t('workoutEnd.move.label', {
      move: 'Bench press',
      set: '72.5 kg × 8',
      change: t('workoutEnd.move.loadUp', { amount: '2.5 kg' }),
    }),
  );
});
