/**
 * The share card's words (K-612, L3 Y5): a record and a call, never a body — the weeks on track, the latest call, a lift's
 * estimated max from its real values (K-604), and the weight trend only when the user turns it on (off by default). No
 * body-fat number (U4), no before/after, no blame (U7). Every word is the app's copy (en.json).
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { workoutParams } from '@/train/params';
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
const call = (type: string, copyKey: string): Schemas['Decision'] => ({ action: { type }, copyKey }) as unknown as Schemas['Decision'];
const FULL: CardFacts = {
  consistency: consistency(11, 12, 1),
  latestCall: call('CHANGE_MOVEMENT', 'decision.change_movement.bmr_floor'),
  strength: { move: 'Bench press', fromKg: 92.5, toKg: 100 },
  weight: { fromKg: 84.2, toKg: 81.6 },
};

test('the record, the latest call, the lift — and no weight unless turned on', () => {
  const card = cardText(FULL, 'METRIC', false);

  expect(card.heading).toBe(t('share.card.heading'));
  expect(card.lines).toEqual([
    t('share.card.record', { onTrack: 11, counted: 12 }),
    t('share.card.forgiven', { count: 1 }),
    t('share.card.call', { call: t('decision.change_movement.bmr_floor.title') }),
    t('share.card.strength', { move: 'Bench press', days: workoutParams.evaluationWindowDays, from: '92.5 kg', to: '100 kg' }),
  ]);
  expect(card.lines.join(' ')).not.toContain('84.2');
});

test('the weight trend, turned on: its real values, in the user unit', () => {
  const card = cardText(FULL, 'IMPERIAL', true);

  expect(card.lines).toContain(t('share.card.weight', { days: workoutParams.evaluationWindowDays, from: '185.6 lb', to: '179.9 lb' }));
});

test('no forgiven week: no line for it; "not yet" is no call to share', () => {
  const card = cardText({ ...FULL, consistency: consistency(3, 3), latestCall: call('NO_DECISION_YET', 'decision.no_decision_yet.observing') }, 'METRIC', false);

  expect(card.lines).toEqual([t('share.card.record', { onTrack: 3, counted: 3 }), t('share.card.strength', { move: 'Bench press', days: workoutParams.evaluationWindowDays, from: '92.5 kg', to: '100 kg' })]);
});

test('nothing yet: no lines (the screen offers nothing to share)', () => {
  expect(cardText({ consistency: consistency(0, 0), latestCall: null, strength: null, weight: null }, 'METRIC', true).lines).toEqual([]);
});

test('a line is wrapped at words to fit the card', () => {
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

  test("the chart's own lift, first and last week's best estimated max — the strength chart's numbers", () => {
    const fact = strengthFact(new Map([['bench_press', bench]]), [session('2026-08-03', 80, 8), session('2026-09-28', 85, 8)], '2026-10-04');

    expect(fact).not.toBeNull();
    expect(fact?.move).toBe(t('exercises.bench_press.name'));
    expect(fact!.toKg).toBeGreaterThan(fact!.fromKg);
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

  test('every share text, and a full card in both units', () => {
    // The words only: a key such as "failed" is not text anyone reads.
    const values = (tree: object): string[] => Object.values(tree).flatMap((v) => (typeof v === 'string' ? [v] : values(v as object)));
    const share = values((en as { share: object }).share);
    const cards = [cardText(FULL, 'METRIC', true), cardText(FULL, 'IMPERIAL', true)].flatMap((c) => [c.heading, ...c.lines, c.footer]);

    expect(share.flatMap((text) => caught(text).map((id) => `${id}: ${text}`))).toEqual([]);
    expect(cards.flatMap((text) => caught(text).map((id) => `${id}: ${text}`))).toEqual([]);
  });
});
