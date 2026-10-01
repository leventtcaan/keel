/**
 * The weigh-in (K-402): the day's one required ten seconds. Typed in the user's unit and kept in kg, saved on the phone
 * first (K-304); the health data consent is asked before anything is typed when it is not given — nothing health is
 * kept on the phone without it (ADR-030 #25). Below, the raw weigh-ins faint and the 7-day trend clear, and in the first
 * 14 days no word on the trend (U8).
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import WeighInScreen from '@/app/weigh-in';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';

type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown): Answer => ({ data, response: new Response(null, { status: 200 }) });

let mockGranted = true;
let mockUnits: 'METRIC' | 'IMPERIAL' = 'METRIC';
let mockAnswers: Record<string, Answer> = {};
const mockBack = jest.fn();
const mockServices = {
  api: {
    GET: jest.fn(async (path: string, _init?: unknown) => mockAnswers[path] ?? { error: { code: 'NOT_FOUND', message: 'x' }, response: new Response(null, { status: 404 }) }),
    PUT: jest.fn(async (_path: string, _init?: unknown) => ok({ status: 'GRANTED' })),
  },
  queue: { record: jest.fn(async (_record: unknown) => true) },
  consents: { granted: jest.fn(async (_kind: string) => mockGranted), remember: jest.fn(async (_kind: string, _status: string) => {}) },
  report: jest.fn(),
};
jest.mock('expo-router', () => ({ router: { back: () => mockBack(), push: jest.fn() } }));
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => mockUnits }));

beforeAll(() => {
  jest.useFakeTimers({
    now: new Date('2026-10-01T05:30:00Z'),
    doNotFake: ['hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback',
      'cancelIdleCallback', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
  });
});
afterAll(() => jest.useRealTimers());

beforeEach(() => {
  jest.clearAllMocks();
  mockGranted = true;
  mockUnits = 'METRIC';
  mockAnswers = {};
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <WeighInScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const press = async (name: string) => {
  await fireEvent.press(screen.getByRole('button', { name }));
  await act(async () => {});
};
const type = async (text: string) => {
  await fireEvent.changeText(screen.getByLabelText(t('weighIn.label', { unit: t(mockUnits === 'METRIC' ? 'units.kgUnit' : 'units.lbUnit') })), text);
};

test('typed in kg, kept in kg, saved on the phone as a manual weigh-in of now; then back', async () => {
  await show();
  await type('82,4');
  await press(t('weighIn.save'));
  expect(mockServices.queue.record).toHaveBeenCalledWith({
    kind: 'weighIn',
    body: { clientId: expect.any(String), measuredAt: '2026-10-01T05:30:00.000Z', kg: 82.4, source: 'MANUAL' },
  });
  expect(mockBack).toHaveBeenCalled();
});

test('typed in lb, kept in kg at the precision the server keeps', async () => {
  mockUnits = 'IMPERIAL';
  await show();
  await type('180');
  await press(t('weighIn.save'));
  expect(mockServices.queue.record).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ kg: 81.65 }) }));
});

test.each(['', 'abc', '0', '900'])('"%s" is not a weight: it says so and keeps nothing', async (text) => {
  await show();
  await type(text);
  await press(t('weighIn.save'));
  expect(screen.getByText(t('weighIn.invalid'))).toBeOnTheScreen();
  expect(mockServices.queue.record).not.toHaveBeenCalled();
});

test('without the health data consent: the consent first, nothing to type, nothing kept (ADR-030 #25)', async () => {
  mockGranted = false;
  await show();
  expect(screen.getByText(t('consent.health_data.body'))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('weighIn.save') })).toBeNull();

  await press(t('weighIn.consent.allow'));

  expect(mockServices.api.PUT).toHaveBeenCalledWith('/v1/consents/{kind}', {
    params: { path: { kind: 'HEALTH_DATA' } },
    body: { textVersion: t('consent.health_data.version') },
  });
  expect(mockServices.consents.remember).toHaveBeenCalledWith('HEALTH_DATA', 'GRANTED');
  expect(screen.getByRole('button', { name: t('weighIn.save') })).toBeOnTheScreen();
});

test('not now: back, nothing kept', async () => {
  mockGranted = false;
  await show();
  await press(t('weighIn.consent.notNow'));
  expect(mockBack).toHaveBeenCalled();
  expect(mockServices.queue.record).not.toHaveBeenCalled();
});

test('a consent that could not be recorded says so, and still nothing to type', async () => {
  mockGranted = false;
  mockServices.api.PUT.mockResolvedValueOnce({ error: { code: 'INTERNAL', message: 'x' }, response: new Response(null, { status: 500 }) } as never);
  await show();
  await press(t('weighIn.consent.allow'));
  expect(screen.getByText(t('weighIn.consent.failed'))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('weighIn.save') })).toBeNull();
});

test('the chart: every weigh-in faint, the 7-day trend clear; in the first 14 days a note and no word on the trend (U8)', async () => {
  mockAnswers = {
    '/v1/weigh-ins': ok([
      { id: 'a', clientId: 'a', measuredAt: '2026-09-25T05:00:00Z', kg: 82.6, source: 'MANUAL' },
      { id: 'b', clientId: 'b', measuredAt: '2026-09-28T05:00:00Z', kg: 82.0, source: 'MANUAL' },
      { id: 'c', clientId: 'c', measuredAt: '2026-09-30T05:00:00Z', kg: 82.3, source: 'APPLE_HEALTH' },
    ]),
    '/v1/weight-trend': ok([
      { day: '2026-09-25', kg: 82.6 },
      { day: '2026-09-28', kg: 82.3 },
      { day: '2026-09-30', kg: 82.3 },
    ]),
  };
  await show();
  expect(screen.getAllByTestId('raw-point')).toHaveLength(3);
  expect(screen.getAllByTestId('trend-point')).toHaveLength(3);
  expect(screen.getByText(t('weighIn.earlyNote'))).toBeOnTheScreen();
});

test('after 14 days of weigh-ins, no early note', async () => {
  mockAnswers = {
    '/v1/weigh-ins': ok([{ id: 'a', clientId: 'a', measuredAt: '2026-09-10T05:00:00Z', kg: 82.6, source: 'MANUAL' }]),
    '/v1/weight-trend': ok([{ day: '2026-09-10', kg: 82.6 }]),
  };
  await show();
  expect(screen.queryByText(t('weighIn.earlyNote'))).toBeNull();
});
