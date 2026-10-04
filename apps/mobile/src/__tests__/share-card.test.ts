/**
 * The share card's words (K-612, L3 Y5): a record and a call, never a body — the weeks on track, the latest call, a lift's
 * estimated max from its real values (K-604), and the weight trend only when the user turns it on (off by default). No
 * body-fat number (U4), no before/after, no blame (U7). Every word is the app's copy (en.json).
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { type CardFacts, cardText, strengthFact, wrap } from '@/share/card';
import type { Session } from '@/train/history';
import type { Move } from '@/train/trainData';

import en from '../../../../data/copy/en.json';
import forbidden from '../../../../data/copy/forbidden-phrases.json';
import shareForbidden from '../../../../data/copy/share-forbidden.json';

type Schemas = components['schemas'];
const consistency = (onTrack: number, counted: number, forgiven = 0): Schemas['Consistency'] =>
  ({
    weekOf: '2026-09-28',
    training: { done: 2, planned: 3 },
    protein: { done: 5, planned: 7 },
    steps: { done: 5, planned: 7 },
    weighIns: { done: 6, planned: 7 },
    planned: 24,
    done: 18,
    record: { onTrackWeeks: onTrack, countedWeeks: counted, currentRun: 4, forgivenWeeks: forgiven },
  }) as Schemas['Consistency'];
const call = (type: string, copyKey: string): Schemas['Decision'] =>
  ({ action: { type }, copyKey, reasons: [{ rule: copyKey.split('.').pop(), source: 'x' }] }) as unknown as Schemas['Decision'];
const FULL: CardFacts = {
  consistency: consistency(11, 12, 1),
  latestCall: call('CHANGE_MOVEMENT', 'decision.change_movement.bmr_floor'),
  strength: { move: 'Bench press', fromKg: 92.5, toKg: 100, since: '2026-07-13' },
  weight: { fromKg: 84.2, toKg: 81.6, since: '2026-07-14' },
};

test('the record, the latest call, the lift — and no weight unless turned on', () => {
  const card = cardText(FULL, 'METRIC', false);

  expect(card.heading).toBe(t('share.card.heading'));
  expect(card.lines).toEqual([
    t('share.card.record', { onTrack: 11, counted: 12 }),
    t('share.card.forgiven', { count: 1 }),
    t('share.card.call', { call: t('decision.change_movement.bmr_floor.title') }),
    t('share.card.strength', { move: 'Bench press', date: 'Jul 13', from: '92.5 kg', to: '100 kg' }),
  ]);
  expect(card.lines.join(' ')).not.toContain('84.2');
});

test('the weight trend, turned on: its real values, in the user unit', () => {
  const card = cardText(FULL, 'IMPERIAL', true);

  expect(card.lines).toContain(t('share.card.weight', { date: 'Jul 14', from: '185.6 lb', to: '179.9 lb' }));
});

test('no forgiven week: no line for it; "not yet" is no call to share', () => {
  const card = cardText({ ...FULL, consistency: consistency(3, 3), latestCall: call('NO_DECISION_YET', 'decision.no_decision_yet.observing') }, 'METRIC', false);

  expect(card.lines).toEqual([t('share.card.record', { onTrack: 3, counted: 3 }), t('share.card.strength', { move: 'Bench press', date: 'Jul 13', from: '92.5 kg', to: '100 kg' })]);
});

test('nothing yet: no lines (the screen offers nothing to share)', () => {
  expect(cardText({ consistency: consistency(0, 0), latestCall: null, strength: null, weight: null }, 'METRIC', true).lines).toEqual([]);
});

test('the lift in pounds in pounds', () => {
  expect(cardText(FULL, 'IMPERIAL', false).lines).toContain(t('share.card.strength', { move: 'Bench press', date: 'Jul 13', from: '203.9 lb', to: '220.5 lb' }));
});

test('two forgiven weeks, said as two; the footer is the app\'s', () => {
  const card = cardText({ ...FULL, consistency: consistency(10, 12, 2) }, 'METRIC', false);
  expect(card.lines).toContain(t('share.card.forgivenMany', { count: 2 }));
  expect(card.footer).toBe(t('share.card.footer'));
});

test.each(['low_energy_safety', 'rapid_loss', 'loss_rate_cap', 'low_energy_availability', 'low_fat_floor'])(
  'a call resting on %s is left off the card (ADR-054 §4, provisional)',
  (rule) => {
    const safety = { ...call('INCREASE_CALORIES', 'decision.increase_calories.rapid_loss'), reasons: [{ rule, source: 'x' }] } as unknown as Schemas['Decision'];
    expect(cardText({ ...FULL, latestCall: safety }, 'METRIC', false).lines.join(' ')).not.toContain(t('share.card.call', { call: '' }).trim());
  },
);

test('the hard stop (safety) is left off whatever its words', () => {
  const stop = { ...call('CHANGE_PHASE', 'decision.change_phase.bulk_ceiling'), safety: true } as unknown as Schemas['Decision'];
  expect(cardText({ ...FULL, latestCall: stop }, 'METRIC', false).lines.some((l) => l.startsWith(t('share.card.call', { call: '' }).trim()))).toBe(false);
});

test('a line is wrapped at words to fit the card', () => {
  expect(wrap('abcd efgh', 9)).toEqual(['abcd efgh']);
  expect(wrap('Latest call: keep the calories and train as planned', 20)).toEqual(['Latest call: keep', 'the calories and', 'train as planned']);
  expect(wrap('short', 20)).toEqual(['short']);
  expect(wrap('Supercalifragilisticexpialidocious move', 10)).toEqual(['Supercalifragilisticexpialidocious', 'move']);
});

describe('the lift', () => {
  const bench: Move = {
    id: 'bench_press',
    nameKey: 'exercises.bench_press.name',
    kind: 'COMPOUND',
    muscles: [],
    alternatives: [],
    load: 'EXTERNAL',
    equipment: 'BARBELL',
    unilateral: false,
    setupFields: [],
  };
  const session = (day: string, kg: number, reps: number): Session => ({
    clientId: day,
    startedAt: `${day}T17:00:00Z`,
    endedAt: `${day}T18:00:00Z`,
    sets: [{ clientId: `${day}-1`, exerciseId: 'bench_press', setType: 'WORKING', loadKg: kg, reps, rir: 2 }],
  });

  test("the chart's own lift (the most weeks), its first and last week's best estimated max and the first week's date", () => {
    const squat: Move = { ...bench, id: 'squat', nameKey: 'exercises.squat.name' };
    const squatSession = (day: string): Session => ({ ...session(day, 100, 5), sets: [{ ...session(day, 100, 5).sets[0], exerciseId: 'squat' }] });
    const sessions = [session('2026-08-03', 85, 8), session('2026-08-24', 80, 8), session('2026-09-28', 90, 8), squatSession('2026-08-03'), squatSession('2026-09-28')];

    const fact = strengthFact(new Map([['bench_press', bench], ['squat', squat]]), sessions, '2026-10-04');

    expect(fact).toMatchObject({ move: t('exercises.bench_press.name'), since: '2026-08-03' });
    expect(fact!.fromKg).toBeCloseTo(85 * (1 + 10 / 30), 1); // the first week, not the lowest (week 2 was lighter)
    expect(fact!.toKg).toBeCloseTo(90 * (1 + 10 / 30), 1);
  });

  test('one week only: no change to tell', () => {
    expect(strengthFact(new Map([['bench_press', bench]]), [session('2026-09-28', 85, 8)], '2026-10-04')).toBeNull();
  });
});

describe('no forbidden phrase on a card', () => {
  type Rule = { id: string; pattern: string; examples: string[]; nonExamples: string[] };
  const rules: Rule[] = [...(forbidden.rules as Rule[]), ...(shareForbidden.rules as Rule[])];
  const caught = (text: string) => rules.filter((r) => new RegExp(r.pattern, 'i').test(text)).map((r) => r.id);

  test.each((shareForbidden.rules as Rule[]).flatMap((r) => r.examples.map((e) => [r.id, e])))('%s catches "%s"', (_, example) => {
    expect(caught(example)).not.toEqual([]);
  });

  test.each((shareForbidden.rules as Rule[]).flatMap((r) => r.nonExamples.map((e) => [r.id, e])))('%s lets "%s" through', (id, text) => {
    expect(caught(text)).not.toContain(id);
  });

  test('every call title a card could carry', () => {
    const decisions = (en as { decision: Record<string, Record<string, { title?: string }>> }).decision;
    const titles = Object.values(decisions).flatMap((group) => Object.values(group).flatMap((v) => (typeof v === 'object' && v.title ? [v.title] : [])));
    expect(titles.length).toBeGreaterThan(10);
    expect(titles.flatMap((text) => caught(text).map((id) => `${id}: ${text}`))).toEqual([]);
  });

  test('every share text, and a full card in both units', () => {
    // The words only: a key such as "failed" is not text anyone reads.
    const values = (tree: object): string[] => Object.values(tree).flatMap((v) => (typeof v === 'string' ? [v] : values(v as object)));
    const share = values((en as { share: object }).share);
    const cards = [cardText(FULL, 'METRIC', true), cardText(FULL, 'IMPERIAL', true)].flatMap((c) => [c.heading, ...c.lines, c.footer]);

    expect(share.flatMap((text) => caught(text).map((id) => `${id}: ${text}`))).toEqual([]);
    expect(cards.flatMap((text) => caught(text).map((id) => `${id}: ${text}`))).toEqual([]);
  });
});
