/**
 * "Why this call" (K-502, prototype 3.5, Ö-25, Ö-26): the call, the data it read, the rules it applied each with its kind
 * of source, its confidence and the next review — and that the call comes from the rules. Read from the server only
 * (K-519); a safety call says nothing of why (ADR-028 #24), and a research file stays on the server.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import WhyScreen from '@/app/why';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';
import { formatWeight } from '@/units/units';

type Schemas = components['schemas'];
type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown): Answer => ({ data, response: new Response(null, { status: 200 }) });
const refused = (status: number, code: string): Answer => ({ error: { code, message: 'x' }, response: new Response(null, { status }) });

const CALL: Schemas['Decision'] = {
  id: 'd1',
  madeOn: '2026-09-28',
  action: { type: 'CONTINUE' } as Schemas['Decision']['action'],
  reasons: [
    { rule: 'toward_goal', source: { tag: 'EXPERIENCE' } },
    { rule: 'loss_rate', source: { tag: 'LITERATURE' } },
  ],
  confidence: 'HIGH',
  nextReview: '2026-10-05',
  copyKey: 'decision.continue.toward_goal',
  application: { state: 'NOT_NEEDED' },
};
const BASIS: Schemas['DecisionBasis'] = {
  phase: 'CUT',
  weeks: [
    { ends: '2026-09-20', kg: 82.3 },
    { ends: '2026-09-27', kg: 81.9 },
  ],
  changeKgPerWeek: -0.4,
  adherence: 0.84,
  answers: {},
};

let mockAnswers: Record<string, Answer | 'offline'> = {};
const mockGET = jest.fn(async (path: string, _init?: unknown) => {
  const answer = mockAnswers[path] ?? refused(404, 'NOT_FOUND');
  if (answer === 'offline') throw new TypeError('Network request failed');
  return answer;
});
const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), push: (...args: unknown[]) => mockPush(...args) },
  useLocalSearchParams: () => ({ id: 'd1' }),
}));
const mockServices = { api: { GET: mockGET }, report: () => {} };
let mockUnits = 'METRIC';
jest.mock('@/services/ServicesProvider', () => ({
  useAppServices: () => mockServices,
  useUnits: () => mockUnits,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUnits = 'METRIC';
  mockAnswers = { '/v1/decisions/{id}': ok(CALL), '/v1/decisions/{id}/basis': ok(BASIS) };
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <WhyScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const allText = () => JSON.stringify(screen.toJSON());

test('the call, the data it read, the rules each with its kind of source, its confidence, the next review', async () => {
  await show();
  expect(mockGET).toHaveBeenCalledWith('/v1/decisions/{id}', { params: { path: { id: 'd1' } } });
  expect(mockGET).toHaveBeenCalledWith('/v1/decisions/{id}/basis', { params: { path: { id: 'd1' } } });

  expect(screen.getByText(t('decision.continue.toward_goal.title'))).toBeOnTheScreen();
  expect(screen.getByText(t('why.made', { date: 'Mon, Sep 28', phase: t('why.phase.CUT') }))).toBeOnTheScreen();
  expect(screen.getByText(t('why.value.trend', { from: formatWeight(82.3, 'METRIC'), to: formatWeight(81.9, 'METRIC') }))).toBeOnTheScreen();
  expect(screen.getByText(t('why.value.adherence', { percent: 84 }))).toBeOnTheScreen();
  expect(screen.getByText(t('today.call.source.EXPERIENCE'))).toBeOnTheScreen();
  expect(screen.getByText(t('today.call.source.LITERATURE'))).toBeOnTheScreen();
  expect(screen.getByText(t('today.call.confidence.HIGH'))).toBeOnTheScreen();
  expect(screen.getByText(t('today.call.nextReview', { date: 'Mon, Oct 5' }))).toBeOnTheScreen();
  expect(screen.getByText(t('why.boundary'))).toBeOnTheScreen();
  // The research file is the server's: a path means nothing on a phone.
  expect(allText()).not.toContain('arastirma/');
});

test('every rule says its own sentence, the leading one too — words other than the call’s title, which is said once (K-522)', async () => {
  mockAnswers['/v1/decisions/{id}'] = ok({
    ...CALL,
    reasons: [
      { rule: 'toward_goal', source: { tag: 'EXPERIENCE' } },
      { rule: 'energy_floor', source: { tag: 'LITERATURE' } },
    ],
  });
  await show();
  expect(screen.getByText(t('decision.rule.toward_goal'))).toBeOnTheScreen();
  expect(screen.getByText(t('decision.rule.energy_floor'))).toBeOnTheScreen();
  expect(t('decision.rule.toward_goal')).not.toEqual(t('decision.continue.toward_goal.title'));
  expect(screen.getAllByText(t('decision.continue.toward_goal.title'))).toHaveLength(1);
});

test('in the user’s units', async () => {
  mockUnits = 'IMPERIAL';
  await show();
  expect(screen.getByText(t('why.value.trend', { from: formatWeight(82.3, 'IMPERIAL'), to: formatWeight(81.9, 'IMPERIAL') }))).toBeOnTheScreen();
});

test('a call that waits: no confidence to give; one that read no data says so', async () => {
  mockAnswers['/v1/decisions/{id}'] = ok({
    ...CALL,
    copyKey: 'decision.no_decision_yet.data_insufficient',
    action: { type: 'NO_DECISION_YET' } as Schemas['Decision']['action'],
    confidence: 'LOW',
  });
  mockAnswers['/v1/decisions/{id}/basis'] = ok({ phase: 'CUT', weeks: [], answers: {} });
  await show();
  expect(screen.queryByText(t('today.call.confidence.LOW'))).toBeNull();
  expect(screen.getByText(t('why.noData'))).toBeOnTheScreen();
});

test('a safety call: its general change, nothing of why, no research file', async () => {
  mockAnswers['/v1/decisions/{id}'] = ok({
    ...CALL,
    copyKey: 'decision.change_phase.low_energy_safety',
    action: { type: 'CHANGE_PHASE', to: 'BULK' } as Schemas['Decision']['action'],
    safety: true,
    reasons: [{ rule: 'low_energy_safety', source: { tag: 'LITERATURE' } }],
    application: { state: 'PENDING' },
  });
  await show();
  expect(screen.getByText(t('decision.change_phase.low_energy_safety.title'))).toBeOnTheScreen();
  expect(screen.queryByText(t('decision.rule.low_energy_safety'))).toBeNull();
  expect(allText()).not.toMatch(/hard.?stop|cycle|period|menstrua|amenorr/i);
  expect(allText()).not.toContain('J1-cinsiyet');
});

test('without the health data consent: one line and the way to Settings', async () => {
  mockAnswers['/v1/decisions/{id}'] = refused(403, 'CONSENT_REQUIRED');
  mockAnswers['/v1/decisions/{id}/basis'] = refused(403, 'CONSENT_REQUIRED');
  await show();
  expect(screen.getByText(t('today.consent.body'))).toBeOnTheScreen();
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('today.consent.open') })));
  expect(mockPush).toHaveBeenCalledWith('/settings');
});

test('not read: said once, with a way to try again that reads both again', async () => {
  mockAnswers['/v1/decisions/{id}/basis'] = 'offline';
  await show();
  expect(screen.getByText(t('why.failed'))).toBeOnTheScreen();
  expect(screen.queryByText(t('decision.continue.toward_goal.title'))).toBeNull();

  mockAnswers['/v1/decisions/{id}/basis'] = ok(BASIS);
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('why.retry') })));
  expect(screen.getByText(t('decision.continue.toward_goal.title'))).toBeOnTheScreen();
  expect(screen.queryByText(t('why.failed'))).toBeNull();
});

test('back goes back', async () => {
  await show();
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('why.back') })));
  expect(mockBack).toHaveBeenCalled();
});

test('what else the data says sits beside the rules, in its own words with its kind of source (K-603); none, no section', async () => {
  await show();
  expect(screen.queryByText(t('why.signals'))).toBeNull();

  mockAnswers['/v1/decisions/{id}/basis'] = ok({ ...BASIS, signals: [{ rule: 'weight_steady_waist_down', source: { tag: 'LITERATURE' } }] });
  await show();
  expect(screen.getByText(t('why.signals'))).toBeOnTheScreen();
  expect(screen.getByText(t('decision.rule.weight_steady_waist_down'))).toBeOnTheScreen();
  expect(t('decision.rule.weight_steady_waist_down')).not.toMatch(/missing|%|fat/i);
});

test('a safety call says nothing else either (ADR-028 #24)', async () => {
  mockAnswers['/v1/decisions/{id}'] = ok({ ...CALL, safety: true, reasons: [{ rule: 'low_energy_safety', source: { tag: 'LITERATURE' } }] });
  mockAnswers['/v1/decisions/{id}/basis'] = ok({ ...BASIS, signals: [{ rule: 'weight_steady_waist_down', source: { tag: 'LITERATURE' } }] });
  await show();
  expect(screen.queryByText(t('why.signals'))).toBeNull();
  expect(screen.queryByText(t('decision.rule.weight_steady_waist_down'))).toBeNull();
});
