/**
 * What the coach says (K-509, ADR-043 #76): the server sends a topic and the call's rule, or the key of the engine's own
 * words — the phone says them from the copy, nothing else. A topic not about the call says only itself (U6: a doctor
 * comes first). A chip from the day is answered on the phone, without the model (no quota, nothing sent).
 */
import type { components } from '@/api/schema';
import { chipAnswer, linesOf } from '@/coach/conversation';
import { has } from '@/copy';

type Schemas = components['schemas'];
const CALL = { decisionId: 'd1', copyKey: 'decision.adjust_calories.not_toward_goal', nextReview: '2026-10-12' };
const date = (day: string) => `on ${day}`;

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
  };

  test("'Why this call?': every rule's sentence and that the call stands, with the call", () => {
    expect(chipAnswer('today.chips.why', decision, date)).toEqual({
      lines: [{ key: 'decision.rule.toward_goal' }, { key: 'decision.rule.energy_floor' }, { key: 'coach.answer.stands', values: { date: 'on 2026-10-12' } }],
      call: { decisionId: 'd1', copyKey: 'decision.continue.toward_goal', nextReview: '2026-10-12' },
    });
  });

  test('a safety call says nothing of why: its general change only (ADR-028 #24)', () => {
    const safety = { ...decision, safety: true, reasons: [{ rule: 'low_energy_safety', source: { tag: 'LITERATURE' as const } }] };
    expect(chipAnswer('today.chips.why', safety, date).lines).toEqual([{ key: 'coach.answer.stands', values: { date: 'on 2026-10-12' } }]);
  });

  test("without a call, 'Why this call?' says there is none yet", () => {
    expect(chipAnswer('today.chips.why', null, date)).toEqual({ lines: [{ key: 'coach.answer.no_call' }] });
  });

  test.each([
    ['today.chips.weighIn', 'coach.chip.weighIn'],
    ['today.chips.start', 'coach.chip.start'],
    ['today.chips.swap', 'coach.chip.swap'],
  ])('%s is answered in its own words', (chip, key) => {
    expect(chipAnswer(chip, decision, date).lines).toEqual([{ key }]);
    expect(has(key)).toBe(true);
  });

  test("the swap leads on to the session, where swapping is done", () => {
    expect(chipAnswer('today.chips.swap', decision, date).open).toEqual({ key: 'coach.chip.openWorkout', path: '/workout' });
  });
});
