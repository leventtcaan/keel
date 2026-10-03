/**
 * The first eight weeks on the phone (K-521, ADR-040, I1 F2): the week's words from the server; in the weeks that read the
 * risk, one message when the server saw a signal or the app was not opened in the week before (known only here, ADR-041 #66).
 */
import type { components } from '@/api/schema';
import { firstWeeksSay } from '@/today/firstWeeks';
import { createOpens } from '@/today/opens';

type FirstWeeks = components['schemas']['FirstWeeks'];
const week = (parts: Partial<FirstWeeks>): FirstWeeks => ({ week: 6, risk: [], readsRisk: true, training: true, ...parts });
const SIGNAL = { rule: 'no_session_last_week', source: { tag: 'PRODUCT' as const } };

describe('firstWeeksSay', () => {
  test("week one: nothing to say (H1 is quiet)", () => {
    expect(firstWeeksSay(week({ week: 1, readsRisk: false }), null, '2026-10-05')).toEqual({});
  });

  test("the week's own words, from the server's key", () => {
    expect(firstWeeksSay(week({ week: 4, contentKey: 'first_weeks.week4', readsRisk: false }), '2026-10-04', '2026-10-05')).toEqual({
      content: 'first_weeks.week4',
    });
  });

  test("a signal the server saw: the one message", () => {
    expect(firstWeeksSay(week({ risk: [SIGNAL] }), '2026-10-04', '2026-10-05').risk).toBe('first_weeks.risk');
  });

  test('the app not opened in the week before: the one message too — only from a week of days without it', () => {
    expect(firstWeeksSay(week({}), '2026-09-27', '2026-10-05').risk).toBe('first_weeks.risk'); // 8 days apart: 7 without
    expect(firstWeeksSay(week({}), '2026-09-28', '2026-10-05').risk).toBeUndefined(); // 7 apart: 6 without
    expect(firstWeeksSay(week({}), null, '2026-10-05').risk).toBeUndefined(); // the first open there is
  });

  test("outside the weeks that read the risk, neither signal says anything", () => {
    expect(firstWeeksSay(week({ readsRisk: false, risk: [] }), '2026-08-01', '2026-10-05').risk).toBeUndefined();
  });

  test("someone not training reads the risk in their own words — no 'session'", () => {
    expect(firstWeeksSay(week({ training: false, risk: [SIGNAL] }), '2026-10-04', '2026-10-05').risk).toBe('first_weeks.no_training.risk');
  });
});

describe('createOpens', () => {
  const memory = () => {
    const kept = new Map<string, string>();
    return {
      getItemAsync: async (key: string) => kept.get(key) ?? null,
      setItemAsync: async (key: string, value: string) => void kept.set(key, value),
      removeItemAsync: async (key: string) => kept.delete(key),
    };
  };

  test('the day the app was opened before today, kept on the phone: none the first time; the same day again changes nothing', async () => {
    const kv = memory();
    let today = '2026-10-01';
    const opens = createOpens({ kv, today: () => today });
    expect(await opens.previous()).toBeNull();
    expect(await opens.previous()).toBeNull();
    today = '2026-10-04';
    expect(await opens.previous()).toBe('2026-10-01');
    expect(await opens.previous()).toBe('2026-10-01');
    today = '2026-10-05';
    expect(await opens.previous()).toBe('2026-10-04');
  });

  test('forgotten: the next account on the phone starts with no open days', async () => {
    const kv = memory();
    const opens = createOpens({ kv, today: () => '2026-10-01' });
    await opens.previous();
    await opens.forget();
    expect(await createOpens({ kv, today: () => '2026-10-20' }).previous()).toBeNull();
  });
});
