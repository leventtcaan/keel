/**
 * The strength line (K-604, prototype 4.4): a compound lift's estimated 1RM week by week over the evaluation window
 * (3 months, G1 K-25), the decision window (the last 2 weeks, 03 §5) marked apart, and a ring where the same weight went
 * for the same reps with more in the tank. The estimate is K-218's (the engine's Epley, mirrored in summary.ts): the line
 * never estimates anything of its own.
 */
import type { components } from '@/api/schema';
import { callFrom, strengthMoves, strengthPoints, weekOf, windowFrom } from '@/progress/strength';
import type { Session } from '@/train/history';
import { workoutParams } from '@/train/params';
import type { Move } from '@/train/trainData';
import { loadValue } from '@/units/units';

type NewSet = components['schemas']['NewSet'];

const TODAY = '2026-10-07'; // a Wednesday
let n = 0;
const set = (exerciseId: string, loadKg: number, reps: number, rir?: number, setType: NewSet['setType'] = 'WORKING'): NewSet => ({
  clientId: `s${(n += 1)}`,
  exerciseId,
  setType,
  loadKg,
  reps,
  ...(rir === undefined ? {} : { rir }),
});
// Noon on the phone's own clock: that calendar day in any time zone.
const localNoon = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12).toISOString();
};
const session = (day: string, sets: NewSet[]): Session => ({ clientId: `w${(n += 1)}`, startedAt: localNoon(day), sets });

describe('the windows', () => {
  test('a week starts on Monday', () => {
    expect(weekOf('2026-10-05')).toBe('2026-10-05'); // Monday
    expect(weekOf('2026-10-07')).toBe('2026-10-05');
    expect(weekOf('2026-10-11')).toBe('2026-10-05'); // Sunday
    expect(weekOf('2026-10-12')).toBe('2026-10-12');
    expect(weekOf('2026-03-01')).toBe('2026-02-23'); // across a month (and the clocks in March)
  });

  test('the line starts on the first Monday inside the evaluation window (90 days, today included): every week whole', () => {
    expect(workoutParams.evaluationWindowDays).toBe(90);
    // 90 days back from Wednesday Oct 7 is Friday Jul 10: its week would be counted from Friday only, and called the week's best.
    expect(windowFrom(TODAY)).toBe('2026-07-13');
    expect(windowFrom('2026-10-11')).toBe('2026-07-20'); // a Sunday: 90 days back is Tuesday Jul 14, so the next Monday
    expect(windowFrom('2026-10-10')).toBe('2026-07-13'); // 90 days back is Monday Jul 13 itself
  });

  test('the decision window is this week and the one before', () => {
    expect(workoutParams.effortCallWindowWeeks).toBe(2);
    expect(callFrom(TODAY)).toBe('2026-09-28');
    expect(callFrom('2026-10-05')).toBe('2026-09-28');
    expect(callFrom('2026-10-04')).toBe('2026-09-21'); // a Sunday is the end of its week
  });
});

describe('a lift week by week', () => {
  test('each week is its best estimated 1RM, oldest first', () => {
    const sessions = [
      session('2026-09-30', [set('bench', 80, 8, 1)]), // 80 × 39/30 = 104
      session('2026-09-21', [set('bench', 85, 4, 2), set('bench', 80, 6, 2)]), // 85 × 36/30 = 102; 80 × 38/30 = 101.3
      session('2026-09-24', [set('bench', 75, 10, 0)]), // same week: 75 × 40/30 = 100
    ];
    expect(strengthPoints('bench', sessions, TODAY)).toEqual([
      { week: '2026-09-21', kg: 102, easier: false },
      { week: '2026-09-28', kg: 104, easier: false },
    ]);
  });

  test('only work sets count, and only the ones K-218 can estimate', () => {
    const sessions = [
      session('2026-09-14', [set('bench', 100, 5, 1, 'WARM_UP'), set('bench', 100, 5, 1, 'DROP'), set('bench', 60, 5, 1)]), // 60 × 36/30 = 72
      session('2026-09-21', [set('bench', 100, 5)]), // no RIR: no estimate
      session('2026-09-28', [set('bench', 100, 8, 3)]), // 11 reps to failure: past what Epley holds for
      session('2026-10-05', [set('squat', 140, 5, 1)]), // another lift
    ];
    expect(strengthPoints('bench', sessions, TODAY)).toEqual([{ week: '2026-09-14', kg: 72, easier: false }]);
  });

  test('the line spans whole weeks: its first Monday in, the Sunday before out', () => {
    const sessions = [session('2026-07-12', [set('bench', 60, 5, 1)]), session('2026-07-13', [set('bench', 50, 5, 1)])];
    expect(strengthPoints('bench', sessions, TODAY)).toEqual([{ week: '2026-07-13', kg: 60, easier: false }]); // 50 × 36/30
  });

  test('a session logged today counts at once; one dated tomorrow does not', () => {
    const sessions = [session(TODAY, [set('bench', 50, 5, 1)]), session('2026-10-08', [set('bench', 100, 5, 1)])];
    expect(strengthPoints('bench', sessions, TODAY)).toEqual([{ week: '2026-10-05', kg: 60, easier: false }]);
  });

  test('the week is its best estimate, whichever set gives it: not the heaviest set', () => {
    // 100 × 1 at RIR 0 is the load itself, 100; 90 × 8 at RIR 1 is 90 × 39/30 = 117.
    const sessions = [session('2026-09-28', [set('bench', 100, 1, 0), set('bench', 90, 8, 1)])];
    expect(strengthPoints('bench', sessions, TODAY).map((p) => p.kg)).toEqual([117]);
  });

  test('a ring where the same weight went for the same reps with more reps in reserve', () => {
    const sessions = [
      session('2026-09-07', [set('bench', 80, 5, 0)]),
      session('2026-09-14', [set('bench', 80, 5, 1)]), // same weight and reps, one more in the tank
      session('2026-09-21', [set('bench', 80, 6, 2)]), // more in the tank, but not the same reps
      session('2026-09-28', [set('bench', 82.5, 6, 3)]), // heavier: not the same weight
      session('2026-10-05', [set('bench', 82.5, 6, 3), set('bench', 70, 6, 3)]), // the same: no more in the tank
    ];
    expect(strengthPoints('bench', sessions, TODAY).map((p) => p.easier)).toEqual([false, true, false, false, false]);
  });

  test('the ring reads the week top set: its heaviest work set, then its most reps, then the fewest in reserve', () => {
    const sessions = [
      session('2026-09-21', [set('bench', 80, 6, 1), set('bench', 70, 12, 0)]),
      session('2026-09-28', [set('bench', 80, 6, 0), set('bench', 80, 6, 2), set('bench', 60, 10, 0)]),
    ];
    // This week's top set is 80 × 6 at RIR 0 (the fewest in reserve of the two at 80 × 6): no easier than last week's.
    expect(strengthPoints('bench', sessions, TODAY).map((p) => p.easier)).toEqual([false, false]);
  });

  test('the top set is the heaviest, not the one with the most reps', () => {
    const sessions = [
      session('2026-09-21', [set('bench', 100, 3, 1), set('bench', 60, 10, 0)]),
      session('2026-09-28', [set('bench', 100, 3, 2), set('bench', 60, 10, 0)]),
    ];
    expect(strengthPoints('bench', sessions, TODAY).map((p) => p.easier)).toEqual([false, true]);
  });

  test('at the top weight, the set with the most reps', () => {
    const sessions = [
      session('2026-09-21', [set('bench', 100, 5, 1), set('bench', 100, 3, 1)]),
      session('2026-09-28', [set('bench', 100, 5, 2), set('bench', 100, 3, 0)]),
    ];
    expect(strengthPoints('bench', sessions, TODAY).map((p) => p.easier)).toEqual([false, true]);
  });

  test('at the top weight and reps, the fewest in reserve, in whichever order they were done', () => {
    const sessions = [
      session('2026-09-21', [set('bench', 80, 6, 1)]),
      session('2026-09-28', [set('bench', 80, 6, 2), set('bench', 80, 6, 0)]),
    ];
    expect(strengthPoints('bench', sessions, TODAY).map((p) => p.easier)).toEqual([false, false]);
  });

  test('each week is compared with the week before it, not the first', () => {
    const sessions = [
      session('2026-09-14', [set('bench', 80, 5, 2)]),
      session('2026-09-21', [set('bench', 80, 5, 0)]),
      session('2026-09-28', [set('bench', 80, 5, 1)]),
    ];
    expect(strengthPoints('bench', sessions, TODAY).map((p) => p.easier)).toEqual([false, false, true]);
  });

  test('weights read as the user sees them: two that show as one weight are the same weight', () => {
    const sessions = [session('2026-09-21', [set('bench', 62.5, 8, 0)]), session('2026-09-28', [set('bench', 62.51, 8, 1)])];
    const pounds = (kg: number) => loadValue(kg, 'IMPERIAL');
    expect(strengthPoints('bench', sessions, TODAY, pounds).map((p) => p.easier)).toEqual([false, true]);
    expect(strengthPoints('bench', sessions, TODAY).map((p) => p.easier)).toEqual([false, false]);
  });
});

describe('the lifts it draws', () => {
  const move = (id: string, kind: Move['kind'], load: Move['load']) => ({ id, kind, load }) as Move;
  const MOVES = new Map(
    [
      move('bench', 'COMPOUND', 'EXTERNAL'),
      move('squat', 'COMPOUND', 'EXTERNAL'),
      move('row', 'COMPOUND', 'EXTERNAL'),
      move('raise', 'ISOLATION', 'EXTERNAL'), // no weight tracking (G6 K-33)
      move('pullup', 'COMPOUND', 'BODYWEIGHT'),
      move('dip', 'COMPOUND', 'BODYWEIGHT_PLUS_EXTERNAL'), // the engine adds the bodyweight; the phone does not read it
    ].map((m) => [m.id, m]),
  );

  test('compound lifts with an outside load that have a point, the most weeks first', () => {
    const sessions = [
      session('2026-09-21', [set('squat', 100, 5, 1), set('raise', 10, 12, 0), set('pullup', 0, 8, 1), set('dip', 20, 8, 1)]),
      session('2026-09-28', [set('bench', 80, 8, 1), set('squat', 100, 5, 1), set('row', 70, 8, 1)]),
      session('2026-07-01', [set('bench', 80, 8, 1), set('row', 70, 8, 1)]), // before the window
      session('2026-10-05', [set('row', 70, 8)]), // no RIR: no point
    ];
    expect(strengthMoves(MOVES, sessions, TODAY)).toEqual(['squat', 'bench', 'row']);
  });

  test('two lifts with as many weeks: by id, whichever was logged first', () => {
    const sessions = [session('2026-09-28', [set('row', 70, 8, 1), set('bench', 80, 8, 1)])];
    expect(strengthMoves(MOVES, sessions, TODAY)).toEqual(['bench', 'row']);
  });

  test('a lift not in the catalog read is left out: its load model is unknown', () => {
    expect(strengthMoves(MOVES, [session('2026-09-28', [set('unknown', 80, 8, 1)])], TODAY)).toEqual([]);
  });
});

describe('the day is the phone calendar day', () => {
  // Built from the phone's own clock, so the test holds in any time zone: in Istanbul (UTC+3) 00:30 on Monday is still
  // Sunday in UTC, and a day read from the UTC string would put the session in the week before.
  test('a session just after midnight on Monday is in Monday week; one just before, in the week before', () => {
    const at = (hour: number, day: number) => ({ clientId: `t${day}`, startedAt: new Date(2026, 9, day, hour, 30).toISOString(), sets: [set('bench', 50, 5, 1)] });
    expect(strengthPoints('bench', [at(0, 5)], TODAY).map((p) => p.week)).toEqual(['2026-10-05']);
    expect(strengthPoints('bench', [at(23, 4)], TODAY).map((p) => p.week)).toEqual(['2026-09-28']);
  });
});
