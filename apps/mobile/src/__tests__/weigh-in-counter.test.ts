/**
 * The week's weigh-in counter (ADR-089, K-1058, prototype 11.1-11.4): the server's block (WeighInWeek) laid out as seven
 * days, and which of four things to say. The phone shows the server's count and date and works none of it out (U1): the
 * only thing worked out here is how many mornings are left in the block, to tell "behind" from "this is the last chance".
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { counterOf } from '@/today/weighInWeek';

type WeighInWeek = components['schemas']['WeighInWeek'];

// A block that ends on the check-in day, so it runs Tuesday to Monday (the user's calendar).
const block = (weighedDays: string[], extra: Partial<WeighInWeek> = {}): WeighInWeek => ({
  from: '2026-10-27',
  to: '2026-11-02',
  weighedDays,
  needed: 4,
  ...extra,
});
const MONDAY = 'Monday';

describe('the seven days', () => {
  test("laid out from the block's own dates: the letters follow the block (Tuesday first), weighed filled, today marked", () => {
    const counter = counterOf(block(['2026-10-27', '2026-10-29']), '2026-10-30');
    expect(counter.days.map((d) => d.date)).toEqual(['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
    expect(counter.days.map((d) => d.weekday)).toEqual(['TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY', 'MONDAY']);
    expect(counter.days.map((d) => d.weighed)).toEqual([true, false, true, false, false, false, false]);
    expect(counter.days.map((d) => d.today)).toEqual([false, false, false, true, false, false, false]);
    expect(counter.count).toBe(2);
    expect(counter.needed).toBe(4);
  });

  test('today outside the block (the block is still ahead): no day is today', () => {
    const counter = counterOf(block([]), '2026-10-20');
    expect(counter.days.some((d) => d.today)).toBe(false);
  });
});

describe('enough (11.1)', () => {
  test('the count reached: the call named by its day, and a mark that it is reached', () => {
    const counter = counterOf(block(['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30']), '2026-10-31');
    expect(counter.state).toBe('enough');
    expect(counter.reached).toBe(true);
    expect(counter.note).toEqual({ key: 'thisWeek.counter.enough', vars: { day: MONDAY } });
    expect(counter.showWeighIn).toBe(false);
  });

  test('more than needed is still enough', () => {
    const counter = counterOf(block(['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31']), '2026-11-01');
    expect(counter.state).toBe('enough');
    expect(counter.count).toBe(5);
  });
});

describe('behind (11.2)', () => {
  test('how many more before the call, and the button while today is not weighed', () => {
    const counter = counterOf(block(['2026-10-27', '2026-10-29']), '2026-10-30'); // Friday: Fri-Mon left, 4 mornings for 2
    expect(counter.state).toBe('behind');
    expect(counter.reached).toBe(false);
    expect(counter.note).toEqual({ key: 'thisWeek.counter.behind', vars: { count: 2, day: MONDAY } });
    expect(counter.showWeighIn).toBe(true);
  });

  test('today already weighed: behind still, but no button (nothing more to do today)', () => {
    const counter = counterOf(block(['2026-10-27', '2026-10-29', '2026-10-30']), '2026-10-30'); // 3 of 4, Sat-Mon left
    expect(counter.state).toBe('behind');
    expect(counter.note).toEqual({ key: 'thisWeek.counter.behind', vars: { count: 1, day: MONDAY } });
    expect(counter.showWeighIn).toBe(false);
  });

  test('the block is still ahead: behind, with no button (today is not in it)', () => {
    const counter = counterOf(block([]), '2026-10-20');
    expect(counter.state).toBe('behind');
    expect(counter.showWeighIn).toBe(false);
  });
});

describe('the last chance (11.3)', () => {
  test('the mornings left (today included) are exactly the weigh-ins missing: today and tomorrow', () => {
    const counter = counterOf(block(['2026-10-27', '2026-10-29']), '2026-11-01'); // Sunday: Sun+Mon left for 2 more
    expect(counter.state).toBe('last');
    expect(counter.note).toEqual({ key: 'thisWeek.counter.last.todayTomorrow', vars: { day: MONDAY } });
    expect(counter.showWeighIn).toBe(true);
  });

  test('one morning left and it is today', () => {
    const counter = counterOf(block(['2026-10-27', '2026-10-28', '2026-10-29']), '2026-11-02');
    expect(counter.state).toBe('last');
    expect(counter.note).toEqual({ key: 'thisWeek.counter.last.today', vars: { day: MONDAY } });
  });

  test('today is weighed and tomorrow is the last morning', () => {
    // Three weighed, today (Sunday) among them: Monday alone is left for the fourth.
    const counter = counterOf(block(['2026-10-27', '2026-10-28', '2026-11-01']), '2026-11-01');
    expect(counter.state).toBe('last');
    expect(counter.note).toEqual({ key: 'thisWeek.counter.last.tomorrow', vars: { day: MONDAY } });
    expect(counter.showWeighIn).toBe(false);
  });

  test('more than two mornings, all needed: every morning until the call day', () => {
    const counter = counterOf(block(['2026-10-27']), '2026-10-31'); // Sat, Sun, Mon left for 3 more
    expect(counter.state).toBe('last');
    expect(counter.note).toEqual({ key: 'thisWeek.counter.last.every', vars: { day: MONDAY } });
  });
});

describe('a short week (11.4)', () => {
  test('callsFrom present: the date the server named, no button, and the training line', () => {
    const counter = counterOf(block(['2026-10-27', '2026-10-29'], { callsFrom: '2026-11-18' }), '2026-11-02');
    expect(counter.state).toBe('short');
    expect(counter.reached).toBe(false);
    expect(counter.note).toEqual({ key: 'thisWeek.counter.short', vars: { day: MONDAY, date: 'Wed, Nov 18' } });
    expect(counter.showWeighIn).toBe(false);
  });

  test('callsFrom wins over the mornings left: the server said the block cannot reach the count', () => {
    const counter = counterOf(block(['2026-10-27'], { callsFrom: '2026-11-18' }), '2026-11-01');
    expect(counter.state).toBe('short');
  });
});

describe('the words (U7: no blame, nothing to make up)', () => {
  const states = [
    counterOf(block(['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30']), '2026-10-31'),
    counterOf(block(['2026-10-27', '2026-10-29']), '2026-10-30'),
    counterOf(block(['2026-10-27', '2026-10-29']), '2026-11-01'),
    counterOf(block(['2026-10-27', '2026-10-28', '2026-10-29']), '2026-11-02'),
    counterOf(block(['2026-10-27']), '2026-10-31'),
    counterOf(block(['2026-10-27', '2026-10-29'], { callsFrom: '2026-11-18' }), '2026-11-02'),
  ];

  test.each(states.map((s) => [s.state, s.note] as const))('%s says the call by its weekday, and no make-up or blame', (_state, note) => {
    const text = t(note.key, note.vars);
    expect(text).not.toMatch(/\[missing|\{/);
    expect(text).not.toMatch(/make up|catch up|behind on|missed|failed|should have|only/i);
    expect(text).toContain(MONDAY);
  });

  test('the sentences, close to the prototype', () => {
    expect(t('thisWeek.counter.enough', { day: MONDAY })).toBe('Enough for Monday. More mornings make the call surer.');
    expect(t('thisWeek.counter.behind', { count: 2, day: MONDAY })).toBe("2 more before Monday's call, and it can read your week.");
    expect(t('thisWeek.counter.last.todayTomorrow', { day: MONDAY })).toBe("Weigh in today and tomorrow, and Monday's call can read your week.");
    expect(t('thisWeek.counter.short', { day: MONDAY, date: 'Wed, Nov 18' })).toBe(
      "A short week happens. Monday's call can't read it. Weigh in most mornings and calls start Wed, Nov 18 at the earliest.",
    );
    expect(t('thisWeek.counter.shortFoot')).toBe('Training goes on as planned');
  });
});
