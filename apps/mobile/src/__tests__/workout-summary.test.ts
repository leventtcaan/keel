/**
 * The session's summary (K-406, prototype 2.6, B §6.4): effort, not volume. Against last time, each move says what
 * improved — the same weight for more reps at the same RIR, the same weight and reps with more in the tank, a heavier
 * weight, a higher estimated max (the engine's Epley, K-218) — and an isolation move is never compared by its weight
 * (coaching experience, K-33). The header counts the moves whose work sets reached the target effort.
 */
import type { components } from '@/api/schema';
import { e1rm, summarize } from '@/train/summary';

type Schemas = components['schemas'];
type NewSet = Schemas['NewSet'];

const move = (id: string, kind: 'COMPOUND' | 'ISOLATION', load: Schemas['Exercise']['load'] = 'EXTERNAL') =>
  ({ id, kind, load, unilateral: false }) as Schemas['Exercise'];
const BENCH = move('bench_press', 'COMPOUND');
const RAISE = move('lateral_raise', 'ISOLATION');
const PUSH_UP = move('push_up', 'COMPOUND', 'BODYWEIGHT');
let n = 0;
const set = (exerciseId: string, loadKg: number, reps: number, rir?: number, setType: NewSet['setType'] = 'WORKING'): NewSet => ({
  clientId: `s${++n}`,
  exerciseId,
  setType,
  loadKg,
  reps,
  ...(rir === undefined ? {} : { rir }),
});
const planned = (exerciseId: string, targetRir = 1) =>
  ({ exerciseId, baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir }) as Schemas['PlannedExercise'];

const summaryOf = (today: NewSet[], last: Record<string, NewSet[]>, moves = [BENCH, RAISE, PUSH_UP]) =>
  summarize(
    today,
    (id) => last[id] ?? [],
    new Map(moves.map((m) => [m.id, m])),
    [planned('bench_press'), planned('lateral_raise'), planned('push_up')],
    'METRIC',
  );

test('Epley as the engine reads it: none without RIR or past 10 reps to failure; one rep to failure is the load', () => {
  expect(e1rm(100, 5, 1)).toBe(120);
  expect(e1rm(100, 1, 0)).toBe(100);
  expect(e1rm(100, 5, undefined)).toBeNull();
  expect(e1rm(100, 9, 2)).toBeNull();
});

test('Epley rounds once, half up to a tenth, exactly as the engine (the same vectors as E1rmTests)', () => {
  // Ties a float rounds down: 30.75 × 38/30 = 38.95, 15.75 × 34/30 = 17.85, 2.25 × 38/30 = 2.85.
  expect(e1rm(30.75, 6, 2)).toBe(39);
  expect(e1rm(15.75, 3, 1)).toBe(17.9);
  expect(e1rm(2.25, 7, 1)).toBe(2.9);
  expect(e1rm(82.5, 5, 2)).toBe(101.8);
  expect(e1rm(52.5, 5, 2)).toBe(64.8);
});

test('no estimated max on one side (no RIR, or past 10 reps to failure): nothing is claimed', () => {
  expect(summaryOf([set('bench_press', 80, 8, 1)], { bench_press: [set('bench_press', 85, 6)] }).moves[0].line).toBeNull();
  expect(summaryOf([set('bench_press', 80, 8, 1)], { bench_press: [set('bench_press', 85, 12, 0)] }).moves[0].line).toBeNull();
  expect(summaryOf([set('bench_press', 80, 8)], { bench_press: [set('bench_press', 85, 6, 1)] }).moves[0].line).toBeNull();
  expect(e1rm(82.55, 1, 0)).toBe(82.6);
});

test('the best set of a weight is the hardest of the same reps: a back-off set at more RIR claims nothing', () => {
  // An isolation move (no estimated max to muddy it): 12 at RIR 0 matched last time; the 12 at RIR 2 is not "2 more in the tank".
  const raise = summaryOf([set('lateral_raise', 12.5, 12, 2), set('lateral_raise', 12.5, 12, 0)], {
    lateral_raise: [set('lateral_raise', 12.5, 12, 0)],
  });
  expect(raise.moves[0].line).toBeNull();
});

test('in lb, the lines say lb: a heavier weight and a higher estimated max', () => {
  const imperial = (today: NewSet[], last: NewSet[]) =>
    summarize(today, () => last, new Map([[BENCH.id, BENCH]]), [planned('bench_press')], 'IMPERIAL').moves[0].line;
  // 185 lb and 180 lb as the app stores them.
  expect(imperial([set('bench_press', 83.91, 6, 1)], [set('bench_press', 81.65, 6, 1)])).toBe('Up 5 lb from last time at RIR 1');
  expect(imperial([set('bench_press', 80, 10, 0)], [set('bench_press', 82.5, 6, 1)])).toBe('Estimated max up 10.8 lb');
});

test("without the plan (the day left the program), the target is the engine's: the effort is still judged", () => {
  const summary = summarize([set('bench_press', 80, 8, 1)], () => [], new Map([[BENCH.id, BENCH]]), [], 'METRIC');
  expect(summary).toMatchObject({ reached: 1, judged: 1 });
});

test('a weighted bodyweight move has no estimated max on the phone: its load is only what is added', () => {
  // The engine adds the bodyweight (E1rm.java); the phone does not read it. +10 × 8 at RIR 2 against +10 × 7 at RIR 1:
  // an estimate from the added 10 kg alone would say "up 0.6 kg". A heavier added weight still says so.
  const DIP = move('dip', 'COMPOUND', 'BODYWEIGHT_PLUS_EXTERNAL');
  expect(summaryOf([set('dip', 10, 8, 2)], { dip: [set('dip', 10, 7, 1)] }, [DIP]).moves[0].line).toBeNull();
  expect(summaryOf([set('dip', 12.5, 6, 1)], { dip: [set('dip', 10, 6, 1)] }, [DIP]).moves[0].line).toBe('Up 2.5 kg from last time at RIR 1');
});

test('the same weight, more reps at the same RIR', () => {
  const [bench] = summaryOf([set('bench_press', 80, 9, 1), set('bench_press', 80, 8, 1)], { bench_press: [set('bench_press', 80, 8, 1)] }).moves;
  expect(bench.line).toBe('Same weight, 1 more rep at RIR 1');
});

test('more reps at a different RIR is not the same effort: the estimated max says it instead', () => {
  // 80 × 9 at RIR 1 (e1RM 106.7) against 80 × 8 at RIR 0 (101.3): not "1 more rep at the same RIR".
  const [bench] = summaryOf([set('bench_press', 80, 9, 1)], { bench_press: [set('bench_press', 80, 8, 0)] }).moves;
  expect(bench.line).toBe('Estimated max up 5.4 kg');
});

test('the same weight and reps, more in the tank', () => {
  const [bench] = summaryOf([set('bench_press', 80, 8, 2)], { bench_press: [set('bench_press', 80, 8, 0)] }).moves;
  expect(bench.line).toBe('Same weight and reps, 2 more in the tank');
});

test('a heavier weight than last time', () => {
  const [bench] = summaryOf([set('bench_press', 82.5, 6, 1)], { bench_press: [set('bench_press', 80, 10, 1)] }).moves;
  expect(bench.line).toBe('Up 2.5 kg from last time at RIR 1');
});

test('a higher estimated max when the top set is lighter but harder', () => {
  // 80 × 10 at RIR 0 (e1RM 106.7) against 82.5 × 6 at RIR 1 last time (e1RM 101.8): a lighter top weight, a higher max.
  const [bench] = summaryOf([set('bench_press', 80, 10, 0)], { bench_press: [set('bench_press', 82.5, 6, 1)] }).moves;
  expect(bench.line).toBe('Estimated max up 4.9 kg');
});

test('an isolation move is never compared by its weight: reps and effort at the same weight only', () => {
  const lighterMoreReps = summaryOf([set('lateral_raise', 10, 15, 1)], { lateral_raise: [set('lateral_raise', 12.5, 12, 1)] }).moves;
  expect(lighterMoreReps.find((m) => m.exerciseId === 'lateral_raise')?.line).toBeNull();
  const heavier = summaryOf([set('lateral_raise', 15, 12, 1)], { lateral_raise: [set('lateral_raise', 12.5, 12, 1)] }).moves;
  expect(heavier.find((m) => m.exerciseId === 'lateral_raise')?.line).toBeNull();
  const moreReps = summaryOf([set('lateral_raise', 12.5, 14, 1)], { lateral_raise: [set('lateral_raise', 12.5, 12, 1)] }).moves;
  expect(moreReps.find((m) => m.exerciseId === 'lateral_raise')?.line).toBe('Same weight, 2 more reps at RIR 1');
});

test('a bodyweight move has no weight to compare and no estimated max: reps and effort only', () => {
  const [push] = summaryOf([set('push_up', 0, 20, 1)], { push_up: [set('push_up', 0, 18, 1)] }).moves;
  expect(push.line).toBe('2 more reps at RIR 1');
});

test('a move done for the first time says so; a move with nothing better says nothing', () => {
  expect(summaryOf([set('bench_press', 80, 8, 1)], {}).moves[0].line).toBe('First time logged');
  expect(summaryOf([set('bench_press', 80, 8, 1)], { bench_press: [set('bench_press', 80, 8, 1)] }).moves[0].line).toBeNull();
});

test('the target effort: moves whose every work set had RIR at or under the target; past it, a note for next time', () => {
  const summary = summaryOf(
    [set('bench_press', 80, 8, 1), set('bench_press', 80, 8, 2), set('lateral_raise', 12.5, 12, 0), set('push_up', 0, 20)],
    {},
  );
  expect(summary.reached).toBe(1);
  expect(summary.judged).toBe(2); // push-ups without RIR are not judged
  expect(summary.moves[0].note).toBe('RIR 2. Next time, aim for 0–1.');
  expect(summary.moves[1].note).toBeNull();
});

test('a work set right at the target RIR reached it', () => {
  expect(summaryOf([set('bench_press', 80, 8, 1)], {}).reached).toBe(1);
});

test('warm-ups are not part of it, and only moves done today are listed', () => {
  const summary = summaryOf([set('bench_press', 40, 10, 5, 'WARM_UP'), set('bench_press', 80, 8, 1)], {});
  expect(summary.moves.map((m) => m.exerciseId)).toEqual(['bench_press']);
  expect(summary.moves[0].sets).toHaveLength(1);
});
