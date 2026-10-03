/**
 * The week's short coach note (K-517, L3 Y8; ADR-043: always a template, no model): the call's words, the leading rule's
 * sentence and the week's one focus — every number in it the call's own, as the call holds it (faithfulness).
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { weeklyNote } from '@/coach/note';

type Schemas = components['schemas'];
type Action = Schemas['Decision']['action'];

const call = (action: Record<string, unknown>, extra: Partial<Schemas['Decision']> = {}): Schemas['Decision'] => ({
  id: 'd1',
  madeOn: '2026-10-05',
  action: action as Action,
  reasons: [
    { rule: 'not_toward_goal', source: { tag: 'EXPERIENCE' } },
    { rule: 'cut_step', source: { tag: 'LITERATURE' } },
  ],
  confidence: 'MEDIUM',
  nextReview: '2026-10-12',
  copyKey: 'decision.adjust_calories.not_toward_goal',
  application: { state: 'PENDING' },
  ...extra,
});

test("three sentences: the call's words, its leading rule's, the week's one focus", () => {
  expect(weeklyNote(call({ type: 'ADJUST_CALORIES', kcalPerDay: -250 }))).toEqual([
    { key: 'decision.adjust_calories.not_toward_goal.title' },
    { key: 'decision.rule.not_toward_goal' },
    { key: 'coach.note.focus.adjust_calories.less', values: { kcal: '250' } },
  ]);
});

test.each([
  [{ type: 'ADJUST_CALORIES', kcalPerDay: -350 }, 'coach.note.focus.adjust_calories.less', { kcal: '350' }],
  [{ type: 'ADJUST_CALORIES', kcalPerDay: 150 }, 'coach.note.focus.adjust_calories.more', { kcal: '150' }],
  [{ type: 'INCREASE_CALORIES', kcalPerDay: 200 }, 'coach.note.focus.increase_calories', { kcal: '200' }],
  [{ type: 'DELOAD', setsFactor: 0.6 }, 'coach.note.focus.deload', { percent: '60' }],
  // 0.57 × 100 is 56.99999999999999 in floating point: the percent the call holds is 57.
  [{ type: 'DELOAD', setsFactor: 0.57 }, 'coach.note.focus.deload', { percent: '57' }],
  [{ type: 'MINI_CUT', minWeeks: 2, maxWeeks: 4 }, 'coach.note.focus.mini_cut', { min: '2', max: '4' }],
  [{ type: 'CHANGE_PHASE', to: 'CUT' }, 'coach.note.focus.change_phase.cut', undefined],
  [{ type: 'CHANGE_PHASE', to: 'BULK' }, 'coach.note.focus.change_phase.bulk', undefined],
])('the focus carries the call’s own numbers, as it holds them: %j', (action, key, values) => {
  const focus = weeklyNote(call(action)).at(-1);
  expect(focus).toEqual(values === undefined ? { key } : { key, values });
});

test('every number the note says is one the call holds (faithfulness, U1)', () => {
  const actions: Record<string, unknown>[] = [
    { type: 'ADJUST_CALORIES', kcalPerDay: -350 },
    { type: 'INCREASE_CALORIES', kcalPerDay: 200 },
    { type: 'DELOAD', setsFactor: 0.6 },
    { type: 'MINI_CUT', minWeeks: 2, maxWeeks: 4 },
  ];
  for (const action of actions) {
    const held = Object.values(action).filter((v): v is number => typeof v === 'number').flatMap((v) => [Math.abs(v), Math.round(Math.abs(v) * 100)]);
    const said = weeklyNote(call(action)).map((line) => t(line.key, line.values)).join(' ');
    for (const number of said.match(/\d+/g) ?? []) expect(held).toContain(Number(number));
  }
});

test.each(['NO_DECISION_YET', 'CONTINUE', 'CHANGE_MOVEMENT', 'FIX_TRAINING', 'FIX_RECOVERY', 'FIX_ADHERENCE', 'STOP_LOAD_INCREASE', 'FULL_REST_WEEK'])(
  'every kind of call has its focus, with no number of its own: %s',
  (type) => {
    const focus = weeklyNote(call({ type })).at(-1);
    expect(focus?.key).toBe(`coach.note.focus.${type.toLowerCase()}`);
    expect(t(focus?.key ?? '')).not.toMatch(/\d|\[missing/);
  },
);

test('a safety call: its general words and focus, nothing of why (ADR-028 #24)', () => {
  const note = weeklyNote(
    call({ type: 'CHANGE_PHASE', to: 'BULK' }, { safety: true, copyKey: 'decision.change_phase.low_energy_safety', reasons: [{ rule: 'low_energy_safety', source: { tag: 'LITERATURE' } }] }),
  );
  expect(note).toEqual([{ key: 'decision.change_phase.low_energy_safety.title' }, { key: 'coach.note.focus.change_phase.bulk' }]);
});

test('a leading rule without its sentence is not said', () => {
  expect(weeklyNote(call({ type: 'CONTINUE' }, { reasons: [{ rule: 'no_such_rule', source: { tag: 'PRODUCT' } }] })).map((line) => line.key)).toEqual([
    'decision.adjust_calories.not_toward_goal.title',
    'coach.note.focus.continue',
  ]);
});
