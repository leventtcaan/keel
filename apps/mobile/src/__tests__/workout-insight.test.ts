/**
 * The analysis line after a move's sets (ADR-075 #4, K-973): the progress the server already worked out, said in templates
 * from en.json with the server's numbers (lastBestSet, the range, nextLoadAtTopKg). Not a new rule: the phone compares the
 * best set of today with the best set of last time and picks a sentence. Read from the sets as they are (not their order),
 * so a set corrected, deleted or skipped changes it by itself. The weight of the next session is promised only when the
 * server's condition holds (nextLoadAtTopKg: every set of the plan reached the top of the range); before that, an observation.
 */
import type { components } from '@/api/schema';
import { bestSet, moveInsight } from '@/train/insight';

type Planned = components['schemas']['PlannedExercise'];
type NewSet = components['schemas']['NewSet'];

const set = (loadKg: number, reps: number, rir = 1): NewSet => ({ clientId: `s-${loadKg}-${reps}-${rir}`, exerciseId: 'bench_press', setType: 'WORKING', loadKg, reps, rir });
const BENCH: Planned = {
  exerciseId: 'bench_press',
  baseSets: 3,
  sets: 3,
  reps: { min: 6, max: 10 },
  targetRir: 1,
  nextLoadKg: 100,
  nextReps: 7,
  lastBestSet: { loadKg: 100, reps: 6, rir: 1 },
  nextLoadAtTopKg: 105,
};
/** The sets done today (the planned count when all are listed), the load held or not, one side or two. */
const say = (planned: Planned, sets: NewSet[], { held = false, sides = 1 as 1 | 2 } = {}) => moveInsight({ planned, sets, sides, held, units: 'METRIC' });
const times = (count: number, make: () => NewSet) => Array.from({ length: count }, make);

describe('rep progress against last time at the same weight', () => {
  test('one rep up, the plan not done yet: the reps alone, no weight promised', () => {
    expect(say(BENCH, [set(100, 7)])).toBe('+1 rep vs last time.');
  });

  test('several reps up say reps', () => {
    expect(say(BENCH, [set(100, 9)])).toBe('+3 reps vs last time.');
  });

  test('the first set at the top and the others still to do: no weight (the contract needs every set at the top)', () => {
    expect(say(BENCH, [set(100, 10)])).toBe('+4 reps vs last time.');
    expect(say(BENCH, [set(100, 10), set(100, 10)])).toBe('+4 reps vs last time.');
  });

  test('every planned set done and every one at the top: the next weight, next time (the server\'s)', () => {
    expect(say(BENCH, times(3, () => set(100, 10)))).toBe('+4 reps vs last time. Top of the range: 105 kg next time.');
    expect(say({ ...BENCH, lastBestSet: { loadKg: 100, reps: 9, rir: 1 } }, times(3, () => set(100, 10)))).toBe('+1 rep vs last time. Top of the range: 105 kg next time.');
  });

  test('every set done but one short of the top: the reps alone', () => {
    expect(say(BENCH, [set(100, 10), set(100, 10), set(100, 9)])).toBe('+4 reps vs last time.');
  });

  test('a set under the load called does not count toward the top', () => {
    expect(say(BENCH, [set(100, 10), set(100, 10), set(95, 10)])).toBe('+4 reps vs last time.');
  });

  test('sets beyond the plan still have to be at the top; the plan counted this week (a deload week has fewer)', () => {
    expect(say(BENCH, [...times(3, () => set(100, 10)), set(100, 8)])).toBe('+4 reps vs last time.');
    expect(say({ ...BENCH, sets: 2 }, times(2, () => set(100, 10)))).toBe('+4 reps vs last time. Top of the range: 105 kg next time.');
  });

  test('a one-sided move: every set of both sides', () => {
    expect(say(BENCH, times(3, () => set(100, 10)), { sides: 2 })).toBe('+4 reps vs last time.');
    expect(say(BENCH, times(6, () => set(100, 10)), { sides: 2 })).toBe('+4 reps vs last time. Top of the range: 105 kg next time.');
  });

  test('no weight from the server (held, or none in reach): the reps alone, whatever is done', () => {
    const { nextLoadAtTopKg: _gone, ...noTop } = BENCH;
    expect(say(noTop, [set(100, 8)])).toBe('+2 reps vs last time.');
    expect(say(noTop, times(3, () => set(100, 10)))).toBe('+4 reps vs last time.');
  });

  test('the same reps: same as last time, and one more is the next step', () => {
    expect(say(BENCH, [set(100, 6)])).toBe('Same as last time. One more rep is the next step.');
  });

  test('a fixed rep target has no rep to climb: same as last time, nothing more said', () => {
    const fixed = { ...BENCH, reps: { min: 5, max: 5 }, lastBestSet: { loadKg: 100, reps: 5, rir: 1 } };
    expect(say(fixed, [set(100, 5)])).toBe('Same as last time.');
  });

  test('fewer reps are not blamed: logged, next time starts from here', () => {
    expect(say({ ...BENCH, lastBestSet: { loadKg: 100, reps: 8, rir: 1 } }, [set(100, 7)])).toBe('Logged. Next time starts from here.');
  });
});

describe('a different weight', () => {
  test('heavier than last time is said so; no rep count is compared across weights', () => {
    expect(say(BENCH, [set(102.5, 6)])).toBe('Heavier than last time.');
  });

  test('lighter than last time: logged, no comparison', () => {
    expect(say(BENCH, [set(97.5, 8)])).toBe('Logged. Next time starts from here.');
  });
});

describe('the other cases', () => {
  test('no earlier session of the move: logged, next time starts from here', () => {
    const { lastBestSet: _none, ...first } = BENCH;
    expect(say(first, [set(100, 6)])).toBe('Logged. Next time starts from here.');
  });

  test('under the range: below the range, whatever else', () => {
    expect(say(BENCH, [set(100, 5)])).toBe('Below the range.');
    expect(say(BENCH, [set(100, 5)], { held: true })).toBe('Below the range.');
  });

  test("a move with no target is the calibration's to say: nothing here", () => {
    const { nextLoadKg: _n, nextReps: _r, ...calibrating } = BENCH;
    expect(say({ ...calibrating, calibrationStepKg: 2.5 }, [set(100, 8)])).toBeNull();
  });

  test('no set done, no line', () => {
    expect(say(BENCH, [])).toBeNull();
  });

  test('in pounds', () => {
    expect(moveInsight({ planned: BENCH, sets: times(3, () => set(100, 10)), sides: 1, held: false, units: 'IMPERIAL' })).toBe(
      '+4 reps vs last time. Top of the range: 231.5 lb next time.',
    );
  });
});

// The load is held by the weekly call: "again, as called" is the same weight as last time, at the weight called. It says
// "again" only where that is so; otherwise the set is read as any other.
describe('a load the weekly call holds', () => {
  test('the weight called, the weight of last time: said again, as called, with the reps done', () => {
    expect(say(BENCH, [set(100, 8)], { held: true })).toBe('8 again, as called. The weekly call reads it.');
  });

  test('heavier than last time is not "again"', () => {
    expect(say({ ...BENCH, nextLoadKg: 102.5 }, [set(102.5, 6)], { held: true })).toBe('Heavier than last time.');
  });

  test('a weight other than the one called is not "as called"', () => {
    expect(say(BENCH, [set(97.5, 8)], { held: true })).toBe('Logged. Next time starts from here.');
    expect(say(BENCH, [set(102.5, 8)], { held: true })).toBe('Heavier than last time.');
  });

  test('no earlier session: nothing to be "again" of', () => {
    const { lastBestSet: _none, ...first } = BENCH;
    expect(say(first, [set(100, 8)], { held: true })).toBe('Logged. Next time starts from here.');
  });

  test('a lighter weight than last time held at the call: logged', () => {
    expect(say({ ...BENCH, nextLoadKg: 95, lastBestSet: { loadKg: 100, reps: 6, rir: 1 } }, [set(95, 8)], { held: true })).toBe('Logged. Next time starts from here.');
  });
});

describe('the best set of today', () => {
  test('the heaviest, then the most reps, then the fewest left; not the last one done', () => {
    expect(bestSet([set(100, 8), set(100, 7), set(100, 6)])).toEqual(set(100, 8));
    expect(bestSet([set(100, 6), set(102.5, 5), set(100, 8)])).toEqual(set(102.5, 5));
    expect(bestSet([set(100, 8, 2), set(100, 8, 0)])).toEqual(set(100, 8, 0));
  });

  test('no sets, no best', () => {
    expect(bestSet([])).toBeNull();
  });

  test('the order the sets come in does not matter (the server puts a corrected set last)', () => {
    const sets = [set(100, 8), set(100, 7), set(100, 6)];
    expect(bestSet([...sets].reverse())).toEqual(bestSet(sets));
    expect(bestSet([sets[1], sets[2], sets[0]])).toEqual(bestSet(sets));
  });
});
