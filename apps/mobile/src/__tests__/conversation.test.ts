/**
 * What the coach says (K-509, ADR-043 #76): the server sends a topic and the call's rule, or the key of the engine's own
 * words — the phone says them from the copy, nothing else. A topic not about the call says only itself (U6: a doctor
 * comes first). A chip from the day is answered on the phone, without the model (no quota, nothing sent).
 */
import type { components } from '@/api/schema';
import { MEAL_CHIP, chipAnswer, coachChips, linesOf } from '@/coach/conversation';
import type { TodayData } from '@/today/today';
import { has } from '@/copy';

type Schemas = components['schemas'];
const CALL = { decisionId: 'd1', copyKey: 'decision.adjust_calories.not_toward_goal', nextReview: '2026-10-12' };
const date = (day: string) => `on ${day}`;

test("why this call, when the server answered the subscription's 403 (it never should — the call needs none): one more call not read", () => {
  expect(chipAnswer('today.chips.why', { state: 'subscription' }, date)).toEqual({ lines: [{ key: 'coach.chip.unread' }] });
});

describe('linesOf', () => {
  test("a classified message: the topic's sentence, the rule's sentence, and that the call stands until its next look", () => {
    const answer: Schemas['CoachAnswer'] = { mode: 'MODEL', topic: 'HUNGER', rule: 'cut_step', call: CALL };
    expect(linesOf(answer, date)).toEqual([
      { key: 'coach.topic.hunger' },
      { key: 'decision.rule.cut_step' },
      { key: 'coach.answer.stands', values: { date: 'on 2026-10-12' } },
    ]);
  });

  test.each(['HEALTH', 'OFF_TOPIC'] as const)('a topic not about the call (%s) says only itself — no call standing', (topic) => {
    expect(linesOf({ mode: 'MODEL', topic, call: CALL }, date)).toEqual([{ key: `coach.topic.${topic.toLowerCase()}` }]);
  });

  test("a rule the copy has no sentence for is not said; the call still stands", () => {
    expect(linesOf({ mode: 'MODEL', topic: 'WHY', rule: 'no_such_rule', call: CALL }, date)).toEqual([
      { key: 'coach.topic.why' },
      { key: 'coach.answer.stands', values: { date: 'on 2026-10-12' } },
    ]);
  });

  test.each(['HEALTH', 'OFF_TOPIC'] as const)('%s with a rule anyway: still only itself (U6, whatever the server sent)', (topic) => {
    expect(linesOf({ mode: 'MODEL', topic, rule: 'cut_step', call: CALL }, date)).toEqual([{ key: `coach.topic.${topic.toLowerCase()}` }]);
  });

  test("the engine's own words without a key: the call as it stands, never an empty answer", () => {
    expect(linesOf({ mode: 'DETERMINISTIC', call: CALL }, date)).toEqual([{ key: 'coach.answer.call' }]);
  });

  test("the engine's own words: its key, nothing added", () => {
    expect(linesOf({ mode: 'DETERMINISTIC', copyKey: 'coach.answer.daily_limit', call: CALL }, date)).toEqual([{ key: 'coach.answer.daily_limit' }]);
    expect(linesOf({ mode: 'DETERMINISTIC', copyKey: 'coach.answer.no_call' }, date)).toEqual([{ key: 'coach.answer.no_call' }]);
  });

  test('every topic the contract allows has its sentence', () => {
    const topics: Schemas['CoachAnswer']['topic'][] = ['LESS', 'MORE', 'LATER', 'HUNGER', 'DOUBTS_DATA', 'FEELS_FINE', 'WORRY', 'FRUSTRATED', 'HEALTH', 'WHY', 'OFF_TOPIC'];
    for (const topic of topics) expect(has(`coach.topic.${String(topic).toLowerCase()}`)).toBe(true);
  });
});

describe('chipAnswer', () => {
  const decision: Schemas['Decision'] = {
    id: 'd1',
    madeOn: '2026-10-05',
    action: { type: 'CONTINUE' } as Schemas['Decision']['action'],
    reasons: [
      { rule: 'toward_goal', source: { tag: 'EXPERIENCE' } },
      { rule: 'energy_floor', source: { tag: 'LITERATURE' } },
    ],
    confidence: 'HIGH',
    nextReview: '2026-10-12',
    copyKey: 'decision.continue.toward_goal',
    application: { state: 'NOT_NEEDED' },
    declinable: false,
    changes: [],
  };

  test("'Why this call?': every rule's sentence and that the call stands, with the call", () => {
    expect(chipAnswer('today.chips.why', { state: 'ready', value: decision }, date)).toEqual({
      lines: [{ key: 'decision.rule.toward_goal' }, { key: 'decision.rule.energy_floor' }, { key: 'coach.answer.stands', values: { date: 'on 2026-10-12' } }],
      call: { decisionId: 'd1', copyKey: 'decision.continue.toward_goal', nextReview: '2026-10-12' },
    });
  });

  test('a safety call says nothing of why: its general change only (ADR-028 #24)', () => {
    const safety = { ...decision, safety: true, reasons: [{ rule: 'low_energy_safety', source: { tag: 'LITERATURE' as const } }] };
    expect(chipAnswer('today.chips.why', { state: 'ready', value: safety }, date).lines).toEqual([{ key: 'coach.answer.stands', values: { date: 'on 2026-10-12' } }]);
  });

  test("without a call, 'Why this call?' says there is none yet", () => {
    expect(chipAnswer('today.chips.why', { state: 'none' }, date)).toEqual({ lines: [{ key: 'coach.answer.no_call' }] });
  });

  test("a call that could not be read is not 'none': it says so; without the consent, that it needs it", () => {
    for (const problem of ['NoConnection', 'ServerError'] as const) {
      expect(chipAnswer('today.chips.why', { state: 'failed', problem }, date)).toEqual({ lines: [{ key: 'coach.chip.unread' }] });
    }
    expect(chipAnswer('today.chips.why', { state: 'consent' }, date)).toEqual({ lines: [{ key: 'today.consent.body' }] });
  });

  test.each([
    ['today.chips.weighIn', 'coach.chip.weighIn'],
    ['today.chips.start', 'coach.chip.start'],
    ['today.chips.swap', 'coach.chip.swap'],
  ])('%s is answered in its own words', (chip, key) => {
    expect(chipAnswer(chip, { state: 'ready', value: decision }, date, 'a').lines).toEqual([{ key }]);
    expect(has(key)).toBe(true);
  });

  test("the swap leads on to today's session, on its program day; without a session today, nowhere", () => {
    expect(chipAnswer('today.chips.swap', { state: 'ready', value: decision }, date, 'a').open).toEqual({ key: 'coach.chip.openWorkout', day: 'a' });
    expect(chipAnswer('today.chips.swap', { state: 'ready', value: decision }, date).open).toBeUndefined();
  });
});

describe('coachChips', () => {
  const none = { state: 'none' } as const;
  const day = (parts: Partial<TodayData>): TodayData => ({ consistency: none, decision: none, program: none, weighIns: { state: 'ready', value: [] }, targets: none, budget: none, ...parts });

  test("the day's own first, two at most, then a meal in words — never more than three", () => {
    expect(coachChips(day({ decision: { state: 'ready', value: {} as Schemas['Decision'] } }), '2026-09-29')).toEqual(['today.chips.why', 'today.chips.weighIn', MEAL_CHIP]);
  });

  test('a day with nothing of its own: a meal in words and how it works', () => {
    expect(coachChips(day({ weighIns: { state: 'ready', value: [{} as Schemas['WeighIn']] } }), '2026-09-29')).toEqual([MEAL_CHIP, 'today.chips.start']);
  });

  test('one of its own: that, a meal, how it works', () => {
    expect(coachChips(day({}), '2026-09-29')).toEqual(['today.chips.weighIn', MEAL_CHIP, 'today.chips.start']);
  });
});
