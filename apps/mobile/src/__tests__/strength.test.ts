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
// Noon UTC: the same calendar day on any phone from UTC−11 to UTC+11.
const session = (day: string, sets: NewSet[]): Session => ({ clientId: `w${(n += 1)}`, startedAt: `${day}T12:00:00Z`, sets });

describe('the windows', () => {
  test('a week starts on Monday', () => {
    expect(weekOf('2026-10-05')).toBe('2026-10-05'); // Monday
    expect(weekOf('2026-10-07')).toBe('2026-10-05');
    expect(weekOf('2026-10-11')).toBe('2026-10-05'); // Sunday
    expect(weekOf('2026-10-12')).toBe('2026-10-12');
    expect(weekOf('2026-03-01')).toBe('2026-02-23'); // across a month (and the clocks in March)
  });

  test('the evaluation window is evaluation_window_days days, today included', () => {
    expect(workoutParams.evaluationWindowDays).toBe(90);
    expect(windowFrom(TODAY)).toBe('2026-07-10');
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

  test('the line spans the evaluation window: its first day in, the day before out', () => {
    const sessions = [session('2026-07-09', [set('bench', 60, 5, 1)]), session('2026-07-10', [set('bench', 50, 5, 1)])];
    expect(strengthPoints('bench', sessions, TODAY)).toEqual([{ week: '2026-07-06', kg: 60, easier: false }]); // 50 × 36/30
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

  test('a lift not in the catalog read is left out: its load model is unknown', () => {
    expect(strengthMoves(MOVES, [session('2026-09-28', [set('unknown', 80, 8, 1)])], TODAY)).toEqual([]);
  });
});
