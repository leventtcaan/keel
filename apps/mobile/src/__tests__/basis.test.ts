/**
 * "Why this call"'s data (K-502, K-519, Ö-25): the rows the call read, as the server kept them — nothing counted or
 * estimated on the phone. Weights rounded once, in the user's units (ADR-029); a row the call did not read is absent.
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { basisRows } from '@/today/basis';
import { formatWeight } from '@/units/units';

type Basis = components['schemas']['DecisionBasis'];

const READ: Basis = {
  phase: 'CUT',
  weeks: [
    { ends: '2026-09-20', kg: 82.34 },
    { ends: '2026-09-27', kg: 81.91 },
  ],
  changeKgPerWeek: -0.43,
  adherence: 0.847,
  answers: { look: 'WORSE', training: 'STABLE', recovery: 'GOOD' },
};

const row = (rows: { label: string; value: string }[], label: string) => rows.find((r) => r.label === t(label))?.value;

test('the trend from the window’s first week to its latest, its rate a week, the plan followed rounded down', () => {
  const rows = basisRows(READ, 'METRIC');
  expect(row(rows, 'why.row.trend')).toBe(t('why.value.trend', { from: formatWeight(82.34, 'METRIC'), to: formatWeight(81.91, 'METRIC') }));
  expect(row(rows, 'why.row.rate')).toBe(t('why.value.rateDown', { weight: formatWeight(0.43, 'METRIC') }));
  // 84.7 %: never claims more than was done.
  expect(row(rows, 'why.row.adherence')).toBe(t('why.value.adherence', { percent: 84 }));
});

test('in pounds for a user on pounds, rounded once', () => {
  const rows = basisRows(READ, 'IMPERIAL');
  expect(row(rows, 'why.row.trend')).toBe(t('why.value.trend', { from: formatWeight(82.34, 'IMPERIAL'), to: formatWeight(81.91, 'IMPERIAL') }));
  expect(row(rows, 'why.row.rate')).toContain(t('units.lb', { value: '0.9' }));
});

test('up, or too little to show at the display’s rounding: said as it is', () => {
  expect(row(basisRows({ ...READ, changeKgPerWeek: 0.2 }, 'METRIC'), 'why.row.rate')).toBe(t('why.value.rateUp', { weight: formatWeight(0.2, 'METRIC') }));
  expect(row(basisRows({ ...READ, changeKgPerWeek: -0.04 }, 'METRIC'), 'why.row.rate')).toBe(t('why.value.rateFlat'));
});

test('one week read: its weight alone, no arrow from nothing', () => {
  expect(row(basisRows({ ...READ, weeks: [{ ends: '2026-09-27', kg: 81.91 }] }, 'METRIC'), 'why.row.trend')).toBe(formatWeight(81.91, 'METRIC'));
});

test('the check-in answers given, in the words they were asked in; one left open is absent', () => {
  const rows = basisRows(READ, 'METRIC');
  expect(row(rows, 'why.row.look')).toBe(t('why.answer.look.worse'));
  expect(row(rows, 'why.row.training')).toBe(t('checkIn.choice.training.stable'));
  expect(row(rows, 'why.row.recovery')).toBe(t('checkIn.choice.recovery.good'));
  expect(row(rows, 'why.row.waist')).toBeUndefined();
  const more = basisRows({ ...READ, answers: { waist: 'FLAT', appetite: 'GONE' } }, 'METRIC');
  expect(row(more, 'why.row.waist')).toBe(t('why.answer.waist.flat'));
  expect(row(more, 'why.row.appetite')).toBe(t('checkIn.choice.appetite.gone'));
});

test('where training stood, only what says something; a paused week by its state', () => {
  const rows = basisRows(
    {
      ...READ,
      training: { stalledSessions: 3, weeksLoadHeld: 0, monthsStalled: 0, restedLastWeek: true, loadsBelowLastWeek: false, weeksPlanMissed: 2 },
      pausedBy: 'SICK',
    },
    'METRIC',
  );
  expect(row(rows, 'why.row.stalled')).toBe('3');
  expect(row(rows, 'why.row.planMissed')).toBe('2');
  expect(row(rows, 'why.row.rested')).toBe(t('why.value.yes'));
  expect(row(rows, 'why.row.loadHeld')).toBeUndefined();
  expect(row(rows, 'why.row.loadsBelow')).toBeUndefined();
  expect(row(rows, 'why.row.paused')).toBe(t('state.kind.sick.title'));
});

test('a call that stopped before the window read nothing of it: no rows', () => {
  expect(basisRows({ phase: 'BULK', weeks: [], answers: {} }, 'METRIC')).toEqual([]);
});

test('the plan followed is the server’s whole percent, never a point low from floating point', () => {
  // 29 of 50: 0.58 × 100 is 57.99999999999999 in floating point.
  expect(row(basisRows({ ...READ, adherence: 0.58 }, 'METRIC'), 'why.row.adherence')).toBe(t('why.value.adherence', { percent: 58 }));
  expect(row(basisRows({ ...READ, adherence: 0.29 }, 'METRIC'), 'why.row.adherence')).toBe(t('why.value.adherence', { percent: 29 }));
  expect(row(basisRows({ ...READ, adherence: 0.999 }, 'METRIC'), 'why.row.adherence')).toBe(t('why.value.adherence', { percent: 99 }));
});

test('every answer, every state and both phases have their words: none falls back to a missing key', () => {
  const missing = /^\[missing/;
  const answers: Basis['answers'][] = [
    ...(['BETTER', 'SAME', 'WORSE'] as const).map((look) => ({ look })),
    ...(['IMPROVING', 'STABLE', 'DECLINING'] as const).map((training) => ({ training })),
    ...(['GOOD', 'POOR'] as const).map((recovery) => ({ recovery })),
    ...(['DOWN', 'FLAT', 'UP'] as const).map((waist) => ({ waist })),
    ...(['NORMAL', 'GONE'] as const).map((appetite) => ({ appetite })),
  ];
  for (const given of answers) {
    const rows = basisRows({ phase: 'CUT', weeks: [], answers: given }, 'METRIC');
    expect(rows).toHaveLength(1);
    expect(rows[0].value).not.toMatch(missing);
  }
  for (const pausedBy of ['TRAVELING', 'SICK', 'PAIN', 'BUSY', 'NEW_GYM'] as const) {
    expect(row(basisRows({ phase: 'CUT', weeks: [], answers: {}, pausedBy }, 'METRIC'), 'why.row.paused')).not.toMatch(missing);
  }
  for (const phase of ['CUT', 'BULK'] as const) expect(t(`why.phase.${phase}`)).not.toMatch(missing);
});

test('each training figure under its own label', () => {
  const rows = basisRows(
    { ...READ, training: { stalledSessions: 3, weeksLoadHeld: 2, monthsStalled: 4, weeksPlanMissed: 1, restedLastWeek: false, loadsBelowLastWeek: true } },
    'METRIC',
  );
  expect(row(rows, 'why.row.stalled')).toBe('3');
  expect(row(rows, 'why.row.loadHeld')).toBe('2');
  expect(row(rows, 'why.row.monthsStalled')).toBe('4');
  expect(row(rows, 'why.row.planMissed')).toBe('1');
  expect(row(rows, 'why.row.loadsBelow')).toBe(t('why.value.yes'));
  expect(row(rows, 'why.row.rested')).toBeUndefined();
});
