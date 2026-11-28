/**
 * The call screen in ADR-094's language (9c-4a, prototype gorsel-yon/y5-e2): the call on the page with no ruled line under
 * it, the date and the confidence on one line, the six weeks the call read as a small chart (the server's points, the first
 * and the latest labelled), and the call's parts under their own headings: what changes, why.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import CallScreen from '@/app/call';
import type { components } from '@/api/schema';
import { t, tp } from '@/copy';
import { ThemeProvider } from '@/theme/theme';
import { WithSaved } from './support/saved';

type Schemas = components['schemas'];
type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown): Answer => ({ data, response: new Response(null, { status: 200 }) });
const refused = (status: number, code: string): Answer => ({ error: { code, message: 'x' }, response: new Response(null, { status }) });

const decision = (extra: Partial<Schemas['Decision']> = {}): Schemas['Decision'] => ({
  id: 'd1',
  madeOn: '2026-12-28',
  action: { type: 'STOP_LOAD_INCREASE' } as Schemas['Decision']['action'],
  reasons: [
    { rule: 'plateau', source: { tag: 'EXPERIENCE' } },
    { rule: 'toward_goal', source: { tag: 'LITERATURE' } },
    { rule: 'energy_floor', source: { tag: 'PRODUCT' } },
  ],
  confidence: 'MEDIUM',
  nextReview: '2027-01-11',
  nextCallOn: '2027-01-04',
  copyKey: 'decision.stop_load_increase.plateau',
  application: { state: 'APPLIED' },
  declinable: true,
  changes: [],
  ...extra,
});

let mockAnswers: Record<string, Answer | 'offline'> = {};
const mockGET = jest.fn(async (path: string, _init?: unknown) => {
  const answer = mockAnswers[path] ?? refused(404, 'NOT_FOUND');
  if (answer === 'offline') throw new TypeError('Network request failed');
  return answer;
});
let mockPost: Answer | 'offline' = ok({});
const mockPOST = jest.fn(async (_path: string, _init?: unknown) => {
  if (mockPost === 'offline') throw new TypeError('Network request failed');
  return mockPost;
});
const mockBack = jest.fn();
const mockPush = jest.fn();
const mockDismiss = jest.fn();
let mockParams: { id?: string; from?: string } = {};
jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), push: (to: unknown) => mockPush(to), dismissTo: (to: string) => mockDismiss(to) },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
}));
jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
let mockProjectionOn = false;
const mockServices = { api: { GET: mockGET, POST: mockPOST }, report: jest.fn(), projectionSwitch: { on: () => mockProjectionOn } };
let mockUnits: 'METRIC' | 'IMPERIAL' = 'METRIC';
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => mockUnits }));

beforeEach(() => {
  jest.clearAllMocks();
  mockProjectionOn = false;
  mockParams = {};
  mockUnits = 'METRIC';
  mockPost = ok({});
  mockAnswers = { '/v1/decisions/current': ok(decision()) };
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <WithSaved>
        <CallScreen />
      </WithSaved>
    </ThemeProvider>,
  );
  await act(async () => {});
}
beforeAll(async () => {
  mockAnswers = { '/v1/decisions/current': ok(decision()) };
  await show();
  await screen.unmount();
}, 30_000);


const BASIS = (kgs: number[]): Schemas['DecisionBasis'] => ({
  phase: 'CUT',
  weeks: kgs.map((kg, i) => ({ ends: `2026-11-${String(2 + 7 * i).padStart(2, '0')}`, kg })),
  answers: {},
} as Schemas['DecisionBasis']);
const CHANGED = decision({ changes: [{ what: 'STEPS', before: { stepsPerDay: 7000 }, after: { stepsPerDay: 10000 } } as Schemas['Decision']['changes'][number]] });

describe('the call in the warm notebook (9c-4a)', () => {
  test('the date and the confidence share one line at the top', async () => {
    await show();
    const line = within(screen.getByTestId('call-date-line'));
    expect(line.getByText(t('callScreen.confidence', { level: t('callScreen.level.MEDIUM') }))).toBeOnTheScreen();
    expect(line.getByText('Mon, Dec 28')).toBeOnTheScreen();
  });

  test('no ruled line under the call', async () => {
    await show();
    const foot = screen.getByText(t('callScreen.inPlan')).parent;
    expect(StyleSheet.flatten(foot?.props.style)?.borderTopWidth).toBeUndefined();
  });

  test("the weeks the call read are drawn from the server's basis, the first and the latest labelled", async () => {
    mockAnswers['/v1/decisions/{id}/basis'] = ok(BASIS([89.6, 89.0, 88.4, 88.0, 87.7, 87.4]));
    await show();
    expect(mockGET).toHaveBeenCalledWith('/v1/decisions/{id}/basis', { params: { path: { id: 'd1' } } });
    const chart = screen.getByTestId('call-weeks');
    // The chart is as wide as its box: drawn once the box is laid out.
    await act(async () => fireEvent(chart, 'layout', { nativeEvent: { layout: { width: 360, height: 120, x: 0, y: 0 } } }));
    expect(String(within(chart).getByTestId('trend-line', { includeHiddenElements: true }).props.d).match(/[ML]/g)).toHaveLength(6);
    expect(within(chart).getByText('89.6')).toBeOnTheScreen();
    expect(within(chart).getByText('87.4 kg')).toBeOnTheScreen();
  });

  test('the weeks are one element for VoiceOver, said in words; the chart keeps its height before it is drawn', async () => {
    mockAnswers['/v1/decisions/{id}/basis'] = ok(BASIS([89.6, 89.0, 88.4, 88.0, 87.7, 87.4]));
    await show();
    expect(screen.getByLabelText(t('callScreen.weeksSpoken', { weeks: 5, first: '89.6 kg', latest: '87.4 kg' }))).toBeOnTheScreen();
    expect(StyleSheet.flatten(screen.getByTestId('call-weeks-box').props.style)).toMatchObject({ height: expect.any(Number) });
  });

  test.each([
    ['not allowed (no subscription)', refused(403, 'ENTITLEMENT_REQUIRED')],
    ['no consent', refused(403, 'CONSENT_REQUIRED')],
    ['not there', refused(404, 'NOT_FOUND')],
    ['offline', 'offline' as const],
  ])('a basis that cannot be read (%s): no chart, the call stands', async (_, answer) => {
    mockAnswers['/v1/decisions/{id}/basis'] = answer;
    await show();
    expect(screen.queryByTestId('call-weeks')).toBeNull();
    expect(screen.getByText(t('decision.stop_load_increase.label'))).toBeOnTheScreen();
  });

  test('a past call opened read only draws its own weeks', async () => {
    mockParams = { id: 'd7' };
    mockAnswers['/v1/decisions/{id}'] = ok(decision({ id: 'd7' }));
    mockAnswers['/v1/decisions/{id}/basis'] = ok(BASIS([90, 89.5]));
    await show();
    expect(mockGET).toHaveBeenCalledWith('/v1/decisions/{id}/basis', { params: { path: { id: 'd7' } } });
    expect(screen.getByTestId('call-weeks')).toBeOnTheScreen();
  });

  test('a call still waiting says its date with no confidence and no dot', async () => {
    mockAnswers['/v1/decisions/current'] = ok(
      decision({ action: { type: 'NO_DECISION_YET' } as Schemas['Decision']['action'], copyKey: 'decision.no_decision_yet.observing', reasons: [{ rule: 'observing', source: { tag: 'LITERATURE' } }] }),
    );
    await show();
    expect(within(screen.getByTestId('call-date-line')).queryByText(/Confidence/)).toBeNull();
  });

  test('no basis (not allowed, not there, one week): no chart, the rest of the call stands', async () => {
    mockAnswers['/v1/decisions/{id}/basis'] = ok(BASIS([88]));
    await show();
    expect(screen.queryByTestId('call-weeks')).toBeNull();
    expect(screen.getByText(t('decision.stop_load_increase.label'))).toBeOnTheScreen();
  });

  test('what changes and why stand under their own headings', async () => {
    mockAnswers['/v1/decisions/current'] = ok(CHANGED);
    await show();
    expect(screen.getByRole('header', { name: t('callScreen.section.change') })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: t('callScreen.section.why') })).toBeOnTheScreen();
  });

  test('no change, no "what changes" heading', async () => {
    await show();
    expect(screen.queryByRole('header', { name: t('callScreen.section.change') })).toBeNull();
  });
});

// 9c-4b (ADR-094 Ek 1, Levent): "in 8 weeks", the range of the server's scenario nearest the person's own share of planned
// days kept; only with the projection turned on (its health gate, ADR-050), only for this week's call, always a range (U5).
const PROJECTION = (on: string): Schemas['Projection'] => ({
  shown: true,
  todayKg: 87.4,
  direction: 'LOSS',
  on,
  scenarios: [
    { adherence: 0.6, lowKg: 84.6, kg: 85.4, highKg: 86.1 },
    { adherence: 0.8, lowKg: 83.7, kg: 84.6, highKg: 85.4 },
    { adherence: 0.95, lowKg: 83.0, kg: 84.0, highKg: 84.9 },
  ],
});
const withAdherence = (adherence?: number) => ({ ...BASIS([89.6, 87.4]), ...(adherence === undefined ? {} : { adherence }) });

describe('the call ahead (9c-4b)', () => {
  beforeEach(() => {
    mockProjectionOn = true;
    jest.useFakeTimers({ now: new Date('2026-12-28T10:00:00Z'), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    mockAnswers['/v1/projection'] = ok(PROJECTION('2027-02-22'));
  });
  afterEach(() => jest.useRealTimers());

  test("the range of the scenario nearest the person's own share kept, with its weeks and its share", async () => {
    mockAnswers['/v1/decisions/{id}/basis'] = ok(withAdherence(0.86));
    await show();
    const ahead = within(screen.getByTestId('call-ahead'));
    expect(ahead.getByText(tp('callScreen.ahead', 8))).toBeOnTheScreen();
    // 0.86 is nearest 0.8: its range, never its middle number alone.
    expect(ahead.getByText(/^83\.7\D+85\.4/)).toBeOnTheScreen();
    expect(ahead.queryByText(/84\.6/)).toBeNull();
    expect(ahead.getByText(t('projection.view.scenario', { pct: 80 }))).toBeOnTheScreen();
  });

  test('one week ahead is said in the singular', async () => {
    mockAnswers['/v1/projection'] = ok(PROJECTION('2027-01-04'));
    mockAnswers['/v1/decisions/{id}/basis'] = ok(withAdherence(0.86));
    await show();
    expect(within(screen.getByTestId('call-ahead')).getByText(tp('callScreen.ahead', 1))).toBeOnTheScreen();
    expect(tp('callScreen.ahead', 1)).toBe('In 1 week');
  });

  test('with no share known, the middle scenario, as the projection screen follows', async () => {
    mockAnswers['/v1/decisions/{id}/basis'] = ok(withAdherence());
    await show();
    expect(within(screen.getByTestId('call-ahead')).getByText(t('projection.view.scenario', { pct: 80 }))).toBeOnTheScreen();
  });

  test('a high share follows the 95% scenario', async () => {
    mockAnswers['/v1/decisions/{id}/basis'] = ok(withAdherence(0.97));
    await show();
    expect(within(screen.getByTestId('call-ahead')).getByText(/^83(\.0)?\D+84\.9/)).toBeOnTheScreen();
  });

  test('the projection turned off: nothing ahead, and it is not even asked for', async () => {
    mockProjectionOn = false;
    mockAnswers['/v1/decisions/{id}/basis'] = ok(withAdherence(0.86));
    await show();
    expect(screen.queryByTestId('call-ahead')).toBeNull();
    expect(mockGET).not.toHaveBeenCalledWith('/v1/projection', expect.anything());
    expect(mockGET.mock.calls.map((c) => c[0])).not.toContain('/v1/projection');
  });

  test('not shown by the server (its gates): nothing ahead', async () => {
    mockAnswers['/v1/projection'] = ok({ shown: false, reason: 'TOO_EARLY' });
    await show();
    expect(screen.queryByTestId('call-ahead')).toBeNull();
  });

  test('a past call opened read only: nothing ahead', async () => {
    mockParams = { id: 'd7' };
    mockAnswers['/v1/decisions/{id}'] = ok(decision({ id: 'd7' }));
    await show();
    expect(screen.queryByTestId('call-ahead')).toBeNull();
    expect(mockGET.mock.calls.map((c) => c[0])).not.toContain('/v1/projection');
  });
});
