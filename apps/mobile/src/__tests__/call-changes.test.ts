/**
 * What the call changes, and why in a line (K-978 part 2, ADR-077 #3 and Ek 4). Every number is the server's
 * (Decision.changes, Reason.facts); the phone only writes it: no value is worked out here (U1), and none is made up
 * where the server said there was none.
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { changeRows } from '@/today/callChanges';
import { callReasons } from '@/today/callReasons';
import en from '../../../../data/copy/en.json';

type Schemas = components['schemas'];
const call = (extra: Partial<Schemas['Decision']> = {}): Schemas['Decision'] => ({
  id: 'd1',
  madeOn: '2026-12-28',
  action: { type: 'ADJUST_CALORIES', kcalPerDay: -250 } as Schemas['Decision']['action'],
  reasons: [{ rule: 'not_toward_goal', source: { tag: 'EXPERIENCE' } }],
  confidence: 'MEDIUM',
  nextReview: '2027-01-04',
  copyKey: 'decision.adjust_calories.not_toward_goal',
  application: { state: 'APPLIED' },
  declinable: true,
  changes: [],
  ...extra,
});

describe('the changes, old to new', () => {
  test('a calorie step: the target before and after, thousands apart', () => {
    const rows = changeRows(call({ changes: [{ what: 'CALORIES', before: { targetKcal: 2100 }, after: { targetKcal: 1850 } }] }));
    expect(rows).toEqual([
      {
        id: 'CALORIES',
        kind: 'change',
        label: 'Calories',
        from: '2,100',
        to: '1,850 kcal',
        spoken: 'Calories: was 2,100 kcal, now 1,850 kcal',
      },
    ]);
  });

  test("steps and phase in their own words; the server's order is kept", () => {
    const rows = changeRows(
      call({
        changes: [
          { what: 'STEPS', before: { stepsPerDay: 7000 }, after: { stepsPerDay: 10000 } },
          { what: 'PHASE', before: { phase: 'BULK' }, after: { phase: 'CUT' } },
        ],
      }),
    );
    expect(rows.map((r) => [r.id, r.from, r.to])).toEqual([
      ['STEPS', '7,000', '10,000 steps'],
      ['PHASE', 'Building', 'Cutting'],
    ]);
  });

  test('no target was in force (an empty before): a new target, not a change from some number', () => {
    const [row] = changeRows(call({ changes: [{ what: 'CALORIES', before: {}, after: { targetKcal: 1850 } }] }));
    expect(row).toMatchObject({ kind: 'new', label: 'Calories, new', from: null, to: '1,850 kcal', spoken: 'Calories, new: 1,850 kcal' });
  });

  test('declined or undone: the target in force, said as in force, never the one the call set', () => {
    const [kept] = changeRows(
      call({
        application: { state: 'DECLINED' },
        changes: [{ what: 'CALORIES', before: { targetKcal: 2100 }, after: { targetKcal: 1850 }, inForce: { targetKcal: 2100 } }],
      }),
    );
    expect(kept).toMatchObject({ kind: 'inForce', label: 'Calories, in force', from: null, to: '2,100 kcal' });
    expect(JSON.stringify(kept)).not.toContain('1,850');
    const [undone] = changeRows(
      call({
        application: { state: 'UNDONE' },
        changes: [{ what: 'STEPS', before: { stepsPerDay: 7000 }, after: { stepsPerDay: 10000 }, inForce: { stepsPerDay: 7000 } }],
      }),
    );
    expect(undone).toMatchObject({ kind: 'inForce', label: 'Steps, in force', to: '7,000 steps' });
  });

  test('declined with no target in force before: says so, with no number', () => {
    const [row] = changeRows(call({ application: { state: 'DECLINED' }, changes: [{ what: 'CALORIES', before: {}, after: { targetKcal: 1850 }, inForce: {} }] }));
    expect(row).toMatchObject({ kind: 'inForce', to: t('callScreen.changes.noneInForce') });
  });

  test('no changes: no rows; a change without its value is not made up', () => {
    expect(changeRows(call())).toEqual([]);
    expect(changeRows(call({ changes: [{ what: 'CALORIES', before: { targetKcal: 2100 }, after: {} }] }))).toEqual([]);
  });
});

describe('a call kept off the plan or undone with no target in force (K-978 review)', () => {
  test.each(['DECLINED', 'UNDONE'] as const)('%s with no inForce: no row, the call set a number that is not the plan\'s', (state) => {
    const rows = changeRows(call({ application: { state }, changes: [{ what: 'CALORIES', before: { targetKcal: 2100 }, after: { targetKcal: 1850 } }] }));
    expect(rows).toEqual([]);
  });

  test('an applied or pending call still shows its own after', () => {
    for (const state of ['APPLIED', 'PENDING', 'NOT_NEEDED'] as const) {
      expect(changeRows(call({ application: { state }, changes: [{ what: 'CALORIES', before: { targetKcal: 2100 }, after: { targetKcal: 1850 } }] }))).toHaveLength(1);
    }
  });
});

describe('the reasons, one line each', () => {
  test("the short template with the server's numbers: a tenth of a kilogram, the sign as read", () => {
    const [line] = callReasons(call({ reasons: [{ rule: 'not_toward_goal', source: { tag: 'EXPERIENCE' }, facts: { kgPerWeek: -0.3, weeks: 3 } }] }), 'METRIC');
    expect(line).toEqual({ text: '-0.3 kg a week over 3 weeks, not toward your goal.', tag: 'EXPERIENCE' });
  });

  test("a calorie step's size is written with its thousands; done of planned as they came", () => {
    const lines = callReasons(
      call({
        reasons: [
          { rule: 'rapid_loss', source: { tag: 'LITERATURE' }, facts: { kcal: 1200 } },
          { rule: 'adherence_low', source: { tag: 'EXPERIENCE' }, facts: { done: 2, planned: 7 } },
        ],
      }),
      'METRIC',
    );
    expect(lines.map((l) => l.text)).toEqual(['Calories up 1,200 kcal a day after a fast drop.', '2 of 7 actions happened: doing comes first.']);
  });

  test('a zero is a number the server said, not a missing one', () => {
    const [line] = callReasons(call({ reasons: [{ rule: 'adherence_partial', source: { tag: 'EXPERIENCE' }, facts: { done: 0, planned: 4 } }] }), 'METRIC');
    expect(line.text).toBe('0 of 4 planned actions happened, too few to judge.');
  });

  test('an older call without its numbers: the longer sentence, no number made up', () => {
    const [none, some] = callReasons(
      call({
        reasons: [
          { rule: 'not_toward_goal', source: { tag: 'EXPERIENCE' } },
          { rule: 'not_toward_goal', source: { tag: 'EXPERIENCE' }, facts: { kgPerWeek: -0.3 } }, // weeks missing
        ],
      }),
      'METRIC',
    );
    expect(none.text).toBe(t('decision.rule.not_toward_goal'));
    expect(some.text).toBe(t('decision.rule.not_toward_goal'));
  });

  test("the pace in the user's units, never a kilogram on a pound screen (ADR-029)", () => {
    const pace = (rule: string, units: 'METRIC' | 'IMPERIAL', kgPerWeek: number) =>
      callReasons(call({ reasons: [{ rule, source: { tag: 'EXPERIENCE' }, facts: { kgPerWeek, weeks: 3 } }] }), units)[0].text;
    // 0.3 kg is 0.66 lb: rounded once, to a tenth, as the Why screen does
    expect(pace('not_toward_goal', 'IMPERIAL', -0.3)).toBe('-0.7 lb a week over 3 weeks, not toward your goal.');
    expect(pace('toward_goal', 'IMPERIAL', 0.5)).toBe('1.1 lb a week over 3 weeks, toward your goal.');
    expect(pace('stall_window', 'IMPERIAL', 0.1)).toBe('0.2 lb a week over 3 weeks: too slow for a cut.');
    expect(pace('bulk_stall', 'IMPERIAL', 0.1)).toBe('0.2 lb a week over 3 weeks: food goes up.');
    expect(pace('not_toward_goal', 'METRIC', -0.3)).toBe('-0.3 kg a week over 3 weeks, not toward your goal.');
    expect(pace('toward_goal', 'METRIC', 0.5)).toBe('0.5 kg a week over 3 weeks, toward your goal.');
    expect(pace('stall_window', 'IMPERIAL', 0)).toBe('0.0 lb a week over 3 weeks: too slow for a cut.'); // a flat pace has no sign
    expect(JSON.stringify(pace('not_toward_goal', 'IMPERIAL', -0.3))).not.toMatch(/kg/);
  });

  test('no pace template writes a unit of its own: the unit comes with the number', () => {
    const short = (en as { decision: { ruleShort: Record<string, string> } }).decision.ruleShort;
    const paced = Object.entries(short).filter(([, line]) => line.includes('{kgPerWeek}'));
    expect(paced.map(([rule]) => rule).sort()).toEqual(['bulk_stall', 'not_toward_goal', 'stall_window', 'toward_goal']);
    for (const [, line] of paced) expect(line).not.toMatch(/\b(kg|lb)\b/);
  });

  test('a rule with no number of its own: its short line, with or without facts', () => {
    const [line] = callReasons(call({ reasons: [{ rule: 'energy_floor', source: { tag: 'PRODUCT' } }] }), 'METRIC');
    expect(line.text).toBe(t('decision.ruleShort.energy_floor'));
  });

  test('a rule with no words at all: only its kind of source', () => {
    const [line] = callReasons(call({ reasons: [{ rule: 'a_rule_nobody_wrote', source: { tag: 'EXPERIENCE' } }] }), 'METRIC');
    expect(line).toEqual({ text: null, tag: 'EXPERIENCE' });
  });

  test('a call resting on the safety net says no reason, only its kind of source (ADR-028 #24)', () => {
    const lines = callReasons(call({ safety: true, reasons: [{ rule: 'low_energy_safety', source: { tag: 'LITERATURE' }, facts: { kcal: 250 } }] }), 'METRIC');
    expect(lines).toEqual([{ text: null, tag: 'LITERATURE' }]);
  });
});
