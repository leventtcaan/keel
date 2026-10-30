/**
 * The weigh-in (K-402, K-980, K-1044): the day's one required ten seconds. The last weight is filled in the shared Stepper and
 * moves a tenth at a time (or is typed), in the user's unit, kept in kg, saved on the phone first (K-304); saved, the sheet
 * closes and the app's one banner says "Saved" with Undo (ADR-070 Ek 2 #6) — there is no Saved page. The health data consent
 * is asked before anything is typed when it is not given — nothing health is kept on the phone without it (ADR-030 #25). The
 * trend is drawn only when the server says it is ready (7 weigh-in days, K-1018); before that the screen counts the weigh-ins
 * toward it ("3 of 7"). Apple Health is asked under the entry, once (ADR-018 Ek 1).
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { AccessibilityInfo, Alert, StyleSheet } from 'react-native';

import type { components } from '@/api/schema';
import WeighInScreen from '@/app/weigh-in';
import { t } from '@/copy';
import { parseWeightKg } from '@/units/units';
import { createHealthAsk } from '@/health/justInTime';
import { NoAnswer, type SendResult, createSyncQueue } from '@/sync/queue';
import { openRecordStore } from '@/sync/store';
import { createTakeBack } from '@/sync/takeBack';
import { ThemeProvider } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { nodeSqlite } from './support/nodeSqlite';
import { WithSaved, banner, undoButton } from './support/saved';

type Schemas = components['schemas'];
type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown): Answer => ({ data, response: new Response(null, { status: 200 }) });

let mockGranted = true;
let mockUnits: 'METRIC' | 'IMPERIAL' = 'METRIC';
let mockAnswers: Record<string, Answer> = {};
let mockHealthAvailable = false;
let mockHealthWrite: 'off' | 'on' | 'refused' = 'off';
const mockBack = jest.fn();
const mockKept = new Map<string, string>();
const mockRequestRead = jest.fn(async () => {});
const mockServices = {
  api: {
    GET: jest.fn(
      async (path: string, _init?: unknown) =>
        mockAnswers[path] ?? { error: { code: 'NOT_FOUND', message: 'x' }, response: new Response(null, { status: 404 }) },
    ),
    PUT: jest.fn(async (_path: string, _init?: unknown) => ok({ status: 'GRANTED' })),
    DELETE: jest.fn(async (_path: string, _init?: unknown) => ({ response: new Response(null, { status: 204 }) })),
  },
  queue: { record: jest.fn(async (_record: unknown) => true) },
  // Taking back: the delete on the server is the screen's to say; the held queue and the phone's copy are the service's.
  takeBack: jest.fn(async (_clientId: string, remove: (serverId: string) => Promise<number>, _known?: string): Promise<'taken' | 'conflict' | 'offline'> => {
    await remove('srv-1');
    return 'taken';
  }),
  consents: {
    granted: jest.fn(async (kind: string) => (kind === 'APPLE_HEALTH' ? false : mockGranted)),
    remember: jest.fn(async (_kind: string, _status: string) => {}),
  },
  report: jest.fn(),
  // Apple Health writing (K-412): the switch decides inside; the screen only says a weigh-in was typed.
  healthWriting: { weighInSaved: jest.fn(async (_weighIn: unknown) => {}), shown: jest.fn((_which: string) => mockHealthWrite) },
  // Apple Health asked under the first weigh-in (K-980): off in the tests that are not about it.
  get health() {
    return { available: mockHealthAvailable, requestRead: mockRequestRead };
  },
  healthAsk: createHealthAsk({
    kv: {
      getItemAsync: async (key: string) => mockKept.get(key) ?? null,
      setItemAsync: async (key: string, value: string) => void mockKept.set(key, value),
      removeItemAsync: async (key: string) => void mockKept.delete(key),
    },
  }),
};
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
jest.mock('expo-router', () => ({ router: { back: () => mockBack(), push: jest.fn() } }));
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => mockUnits }));

beforeAll(() => {
  jest.useFakeTimers({
    now: new Date('2026-10-01T05:30:00Z'),
    doNotFake: [
      'hrtime',
      'nextTick',
      'performance',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
    ],
  });
});
afterAll(() => jest.useRealTimers());

beforeEach(() => {
  jest.clearAllMocks();
  alerted.mockClear();
  mockGranted = true;
  mockUnits = 'METRIC';
  mockAnswers = {};
  mockHealthAvailable = false;
  mockHealthWrite = 'off';
  mockKept.clear();
});

// The day before the fake today (1 Oct 2026, 05:30Z), at midday so the phone's calendar agrees in any zone.
const LAST: Schemas['WeighIn'] = { id: 'w0', clientId: 'w0', measuredAt: '2026-09-30T12:00:00Z', kg: 80.4, source: 'MANUAL' };
const lastLine = (value = '80.4') => t('weighIn.lastOn', { value: t('units.kg', { value }), date: 'Sep 30' });
/** The server's word on the weigh screen's "Last" and on whether the trend is shown (K-1018). */
const summary = (over: Partial<Schemas['WeighInSummary']> = {}): Answer =>
  ok({ last: LAST, weighInCount: 3, trendMinWeighIns: 7, trendReady: false, ...over });
const ready = { weighInCount: 9, trendReady: true };

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <WithSaved>
        <WeighInScreen />
      </WithSaved>
    </ThemeProvider>,
  );
  await act(async () => {});
}
const alerted = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
const stepLabel = (direction: 'increase' | 'decrease') => t(`stepper.${direction}`, { label: unitLabel() });
const unitLabel = () => t('weighIn.label', { unit: t(mockUnits === 'METRIC' ? 'units.kgUnit' : 'units.lbUnit') });
const press = async (name: string) => {
  await fireEvent.press(screen.getByRole('button', { name }));
  await act(async () => {});
};
const type = async (text: string) => {
  await fireEvent.changeText(screen.getByLabelText(unitLabel()), text);
};
const field = () => screen.getByLabelText(unitLabel()).props.value as string;

test('typed in kg, kept in kg, saved on the phone as a manual weigh-in of now; the sheet closes and the banner says so (K-402, K-980, K-1044)', async () => {
  await show();
  await type('82,4');
  await press(t('weighIn.save'));
  expect(mockServices.queue.record).toHaveBeenCalledWith({
    kind: 'weighIn',
    body: { clientId: expect.any(String), measuredAt: '2026-10-01T05:30:00.000Z', kg: 82.4, source: 'MANUAL' },
  });
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(screen.getByText(t('undoBanner.saved'))).toBeOnTheScreen();
  expect(screen.getByText(t('units.kg', { value: '82.4' }))).toBeOnTheScreen();
  expect(undoButton()).toBeOnTheScreen();
});

test('nothing kept (not a weight, or the phone could not keep it): the sheet stays, no banner', async () => {
  await show();
  await type('abc');
  await press(t('weighIn.save'));
  expect(mockBack).not.toHaveBeenCalled();
  expect(banner()).toBeNull();
  mockServices.queue.record.mockRejectedValueOnce(Object.assign(new Error('disk'), { name: 'StoreFailed' }));
  await type('82,4');
  await press(t('weighIn.save'));
  expect(mockBack).not.toHaveBeenCalled();
  expect(banner()).toBeNull();
});

test('two taps on Save while the sheet goes keep one weigh-in (the lock stays on once it is kept)', async () => {
  await show();
  await type('82,4');
  const save = screen.getByRole('button', { name: t('weighIn.save') });
  await fireEvent.press(save);
  await fireEvent.press(save);
  await act(async () => {});
  expect(mockServices.queue.record).toHaveBeenCalledTimes(1);
  expect(mockBack).toHaveBeenCalledTimes(1);
});

test('the detail is in the user\'s unit: pounds typed, pounds on the banner', async () => {
  mockUnits = 'IMPERIAL';
  await show();
  await type('180');
  await press(t('weighIn.save'));
  expect(screen.getByText(t('units.lb', { value: '180.0' }))).toBeOnTheScreen();
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

describe('the last weight filled in, and a tenth at a time (K-980, ADR-018 Ek 1: four taps at most)', () => {
  test('the field starts at the last weigh-in, and the last is said', async () => {
    mockAnswers = { '/v1/weigh-ins/summary': summary() };
    await show();
    expect(field()).toBe('80.4');
    expect(screen.getByText(lastLine())).toBeOnTheScreen();
  });

  test('today\'s weigh-in is "Last" without a date', async () => {
    mockAnswers = { '/v1/weigh-ins/summary': summary({ last: { ...LAST, measuredAt: '2026-10-01T05:00:00Z' } }) };
    await show();
    expect(screen.getByText(t('weighIn.last', { value: t('units.kg', { value: '80.4' }) }))).toBeOnTheScreen();
  });

  test('a weigh-in brought in from before is shown, with its date, and nothing is filled in', async () => {
    mockAnswers = { '/v1/weigh-ins/summary': summary({ last: { ...LAST, source: 'IMPORT' } }) };
    await show();
    expect(screen.getByText(lastLine())).toBeOnTheScreen();
    expect(field()).toBe('');
    expect(screen.getByRole('button', { name: stepLabel('increase') })).toBeDisabled();
  });

  test('in pounds: the last weigh-in in the user\'s unit', async () => {
    mockUnits = 'IMPERIAL';
    mockAnswers = { '/v1/weigh-ins/summary': summary({ last: { ...LAST, kg: 81.65 } }) };
    await show();
    expect(field()).toBe('180.0'); // K1 (Evre 7 final pass): the weigh-in writes its tenth, as "Last" does
  });

  test('the step is the weigh-in\'s own tenth (units.json), the same in pounds', async () => {
    mockUnits = 'IMPERIAL';
    mockAnswers = { '/v1/weigh-ins/summary': summary({ last: { ...LAST, kg: 81.65 } }) };
    await show();
    await press(stepLabel('increase'));
    expect(field()).toBe('180.1');
  });

  test('the number is a field: a tap types over it, with the decimal keyboard, a comma or a dot', async () => {
    mockAnswers = { '/v1/weigh-ins/summary': summary() };
    await show();
    expect(screen.getByLabelText(unitLabel()).props.keyboardType).toBe('decimal-pad');
    await type('79.9');
    await press(t('weighIn.save'));
    expect(mockServices.queue.record).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ kg: 79.9 }) }));
  });

  test('pounds: the field and "Last" write the same number the same way, one decimal (191.0, not 191)', async () => {
    mockUnits = 'IMPERIAL';
    mockAnswers = { '/v1/weigh-ins/summary': summary({ last: { ...LAST, kg: 86.64 } }) };
    await show();
    expect(field()).toBe('191.0');
    expect(screen.getByText(t('weighIn.lastOn', { value: t('units.lb', { value: '191.0' }), date: 'Sep 30' }))).toBeOnTheScreen();
  });

  test('pounds, a long number typed with a decimal comma: 191,46 is accepted (rounded to the tenth) and kept in kg', async () => {
    mockUnits = 'IMPERIAL';
    mockAnswers = { '/v1/weigh-ins/summary': summary() };
    await show();
    await type('191,46');
    await press(t('weighIn.save'));
    // The field keeps the weigh-in's tenth (a number typed past it is rounded to it): 191.46 lb is 191.5 lb.
    expect(mockServices.queue.record).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.objectContaining({ kg: parseWeightKg('191.5', 'IMPERIAL') }) }),
    );
  });

  test('a field cleared is no weight: Save says so rather than keeping the old number under an empty field', async () => {
    mockAnswers = { '/v1/weigh-ins/summary': summary() };
    await show();
    await type('');
    await press(t('weighIn.save'));
    expect(screen.getByText(t('weighIn.invalid'))).toBeOnTheScreen();
    expect(mockServices.queue.record).not.toHaveBeenCalled();
  });

  test('plus and minus move it a tenth, and Save keeps what the field says', async () => {
    mockAnswers = { '/v1/weigh-ins/summary': summary() };
    await show();
    await press(stepLabel('increase'));
    await press(stepLabel('increase'));
    await press(stepLabel('decrease'));
    expect(field()).toBe('80.5');
    await press(t('weighIn.save'));
    expect(mockServices.queue.record).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ kg: 80.5 }) }));
  });

  test('a weigh-in typed over the filled-in one is the one saved', async () => {
    mockAnswers = { '/v1/weigh-ins/summary': summary() };
    await show();
    await type('79,9');
    await press(t('weighIn.save'));
    expect(mockServices.queue.record).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ kg: 79.9 }) }));
  });

  test('no weigh-in yet (or the summary could not be read): an empty field, nothing to step, nothing guessed', async () => {
    await show();
    expect(field()).toBe('');
    expect(screen.queryByText(/^Last/)).toBeNull();
    expect(screen.getByRole('button', { name: stepLabel('increase') })).toBeDisabled();
    expect(screen.getByRole('button', { name: stepLabel('decrease') })).toBeDisabled();
  });

  test('the filled-in weight does not overwrite what was typed while the summary was coming', async () => {
    let release: (answer: Answer) => void = () => {};
    mockServices.api.GET.mockImplementationOnce(() => new Promise<Answer>((resolve) => (release = resolve)) as never);
    await show();
    await type('82,0');
    await act(async () => release(summary()));
    expect(field()).toBe('82,0');
  });
});

describe('the trend, only when the server says it is ready (K-1018, ADR-078 Ek 2)', () => {
  test('before the trend is ready: how many weigh-ins it has so far ("3 of 7"), and no chart is asked for', async () => {
    mockAnswers = { '/v1/weigh-ins/summary': summary() };
    await show();
    expect(screen.getByText(t('weighIn.trendCount', { count: 3, min: 7 }))).toBeOnTheScreen();
    expect(screen.getAllByTestId('trend-segment-filled')).toHaveLength(3);
    expect(screen.getAllByTestId('trend-segment-empty')).toHaveLength(4);
    expect(screen.queryByText(t('weighIn.chart.title'))).toBeNull();
    expect(mockServices.api.GET.mock.calls.map(([path]) => path)).not.toContain('/v1/weigh-ins');
  });

  test('ready: every weigh-in faint, the 7-day trend clear; in the first 14 days a short note, no word on the trend (U8)', async () => {
    mockAnswers = {
      '/v1/weigh-ins/summary': summary(ready),
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
    expect(screen.queryByText(/weigh-ins for your trend/)).toBeNull();
    expect(screen.queryByTestId('trend-segment-filled')).toBeNull();
  });

  test('the count is the server\'s: another count and another minimum are drawn as they come', async () => {
    mockAnswers = { '/v1/weigh-ins/summary': summary({ weighInCount: 6, trendMinWeighIns: 10 }) };
    await show();
    expect(screen.getByText(t('weighIn.trendCount', { count: 6, min: 10 }))).toBeOnTheScreen();
    expect(screen.getAllByTestId('trend-segment-filled')).toHaveLength(6);
    expect(screen.getAllByTestId('trend-segment-empty')).toHaveLength(4);
  });

  test('the first weigh-in: 0 of 7, all empty', async () => {
    mockAnswers = { '/v1/weigh-ins/summary': summary({ last: undefined, weighInCount: 0 }) };
    await show();
    expect(screen.getByText(t('weighIn.trendCount', { count: 0, min: 7 }))).toBeOnTheScreen();
    expect(screen.queryByTestId('trend-segment-filled')).toBeNull();
  });

  test('the summary could not be read (offline): no count, nothing made up', async () => {
    await show();
    expect(screen.queryByText(/weigh-ins for your trend/)).toBeNull();
  });

  test('after 14 days of weigh-ins, no early note', async () => {
    mockAnswers = {
      '/v1/weigh-ins/summary': summary(ready),
      '/v1/weigh-ins': ok([{ id: 'a', clientId: 'a', measuredAt: '2026-09-10T05:00:00Z', kg: 82.6, source: 'MANUAL' }]),
      '/v1/weight-trend': ok([{ day: '2026-09-10', kg: 82.6 }]),
    };
    await show();
    expect(screen.queryByText(t('weighIn.earlyNote'))).toBeNull();
  });

  test('the year: the chart reads a year back and says so; the four weeks again, four weeks (K-616)', async () => {
    mockAnswers = {
      '/v1/weigh-ins/summary': summary(ready),
      '/v1/weigh-ins': ok([{ id: 'a', clientId: 'a', measuredAt: '2026-03-02T05:00:00Z', kg: 88.1, source: 'IMPORT' }]),
      '/v1/weight-trend': ok([{ day: '2026-03-02', kg: 88.1 }]),
    };
    await show();
    expect(screen.getByText(t('weighIn.chart.title'))).toBeOnTheScreen();

    await press(t('weighIn.chart.year'));

    const asked = (n: number) => (mockServices.api.GET.mock.calls[n][1] as { params: { query: { from: string; to: string } } }).params.query;
    const last = mockServices.api.GET.mock.calls.length - 1;
    expect(asked(last)).toEqual({ from: '2025-10-02', to: '2026-10-01' }); // 365 days, today included
    expect(screen.getByText(t('weighIn.chart.yearTitle'))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('weighIn.chart.year') })).toBeSelected();

    await press(t('weighIn.chart.weeks'));
    expect(asked(mockServices.api.GET.mock.calls.length - 1)).toEqual({ from: '2026-09-04', to: '2026-10-01' });
  });

  // K-1048 (ADR-070 Ek 2 #2, #3): two exclusive ranges are one segmented control, as Light/Dark/System are, not two chips (a chip is
  // for a choice among many, or one that starts an action).
  test('the range is the segmented control: one track holding the four weeks and the year, the chosen one selected, each a full touch target', async () => {
    mockAnswers = {
      '/v1/weigh-ins/summary': summary(ready),
      '/v1/weigh-ins': ok([{ id: 'a', clientId: 'a', measuredAt: '2026-09-10T05:00:00Z', kg: 82.6, source: 'MANUAL' }]),
      '/v1/weight-trend': ok([{ day: '2026-09-10', kg: 82.6 }]),
    };
    await show();
    const track = screen.getByTestId('weigh-in-range');
    const weeks = within(track).getByRole('button', { name: t('weighIn.chart.weeks') });
    const year = within(track).getByRole('button', { name: t('weighIn.chart.year') });
    expect(weeks).toBeSelected();
    expect(year).not.toBeSelected();
    for (const segment of [weeks, year]) expect(StyleSheet.flatten(segment.props.style).minHeight).toBeGreaterThanOrEqual(tokens.size.touch);
    await press(t('weighIn.chart.year'));
    expect(within(screen.getByTestId('weigh-in-range')).getByRole('button', { name: t('weighIn.chart.year') })).toBeSelected();
    expect(within(screen.getByTestId('weigh-in-range')).getByRole('button', { name: t('weighIn.chart.weeks') })).not.toBeSelected();
  });

  test('weigh-ins brought in from before do not end the first 14 days (U8, ADR-053)', async () => {
    mockAnswers = {
      '/v1/weigh-ins/summary': summary(ready),
      '/v1/weigh-ins': ok([
        { id: 'a', clientId: 'a', measuredAt: '2026-09-10T05:00:00Z', kg: 82.6, source: 'IMPORT' },
        { id: 'b', clientId: 'b', measuredAt: '2026-09-28T05:00:00Z', kg: 82.0, source: 'MANUAL' },
      ]),
      '/v1/weight-trend': ok([{ day: '2026-09-28', kg: 82.0 }]),
    };
    await show();

    expect(screen.getByText(t('weighIn.earlyNote'))).toBeOnTheScreen();
  });
});

describe('saved: the banner takes it back (K-980, K-1044, ADR-070 Ek 2 #6)', () => {
  test('the sheet closes and the banner is the one confirmation: what was kept, and Undo', async () => {
    mockAnswers = { '/v1/weigh-ins/summary': summary() };
    await show();
    await press(t('weighIn.save'));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(screen.getByText(t('undoBanner.saved'))).toBeOnTheScreen();
    expect(screen.getByText(t('units.kg', { value: '80.4' }))).toBeOnTheScreen();
    expect(undoButton()).toBeOnTheScreen();
  });

  test('Undo deletes it on the server by the id it got, through the held queue, and the banner goes', async () => {
    mockAnswers = { '/v1/weigh-ins/summary': summary() };
    await show();
    await press(stepLabel('increase'));
    await press(t('weighIn.save'));
    const [{ body }] = mockServices.queue.record.mock.calls[0] as [{ body: { clientId: string } }];

    await fireEvent.press(undoButton());
    await act(async () => {});

    expect(mockServices.takeBack).toHaveBeenCalledWith(body.clientId, expect.any(Function));
    expect(mockServices.api.DELETE).toHaveBeenCalledWith('/v1/weigh-ins/{id}', { params: { path: { id: 'srv-1' } } });
    expect(banner()).toBeNull();
  });

  test('Undo with no way to reach the server says it is the connection (aloud and in an alert), keeps the weigh-in, and the banner is back', async () => {
    const announced = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    mockAnswers = { '/v1/weigh-ins/summary': summary() };
    mockServices.takeBack.mockResolvedValueOnce('offline');
    await show();
    await press(t('weighIn.save'));
    await press(t('undoBanner.undo'));
    expect(alerted).toHaveBeenCalledWith(t('weighIn.undoOffline'));
    expect(announced).toHaveBeenCalledWith(t('weighIn.undoOffline'));
    expect(undoButton()).toBeOnTheScreen();
  });

  test('a refusal that is not the connection keeps the general words, and Undo can be tried again', async () => {
    mockAnswers = { '/v1/weigh-ins/summary': summary() };
    mockServices.takeBack.mockResolvedValueOnce('conflict');
    await show();
    await press(t('weighIn.save'));
    await press(t('undoBanner.undo'));
    expect(alerted).toHaveBeenCalledWith(t('weighIn.undoFailed'));
    await press(t('undoBanner.undo'));
    expect(mockServices.takeBack).toHaveBeenCalledTimes(2);
    expect(banner()).toBeNull();
  });

  describe('with the real queue and the real take-back (the drain starts the moment it is saved)', () => {
    const original = { queue: mockServices.queue, takeBack: mockServices.takeBack };
    afterEach(() => Object.assign(mockServices, original));

    async function realServices() {
      const store = await openRecordStore(nodeSqlite());
      let offline = true;
      const send = jest.fn(async (): Promise<SendResult> => {
        if (offline) throw new NoAnswer();
        return { status: 201, id: 'srv-7', body: {} };
      });
      const queue = createSyncQueue({ store, send, report: jest.fn() });
      Object.assign(mockServices, { queue, takeBack: createTakeBack({ store, queue }) });
      return { store, goOnline: () => (offline = false) };
    }

    test('offline: Undo says the connection, keeps the weigh-in, and works once it is back', async () => {
      const { store, goOnline } = await realServices();
      mockAnswers = { '/v1/weigh-ins/summary': summary() };
      await show();
      await press(t('weighIn.save'));

      await press(t('undoBanner.undo'));
      expect(alerted).toHaveBeenCalledWith(t('weighIn.undoOffline'));
      expect(mockServices.api.DELETE).not.toHaveBeenCalled();
      expect((await store.all()).filter((r) => r.kind === 'weighIn')).toHaveLength(1);

      goOnline();
      await press(t('undoBanner.undo'));
      expect(mockServices.api.DELETE).toHaveBeenCalledWith('/v1/weigh-ins/{id}', { params: { path: { id: 'srv-7' } } });
      expect(banner()).toBeNull();
      expect((await store.all()).filter((r) => r.kind === 'weighIn')).toHaveLength(0);
    });

    test('online, the very moment it was saved: stored, then deleted by its id', async () => {
      const { store, goOnline } = await realServices();
      goOnline();
      mockAnswers = { '/v1/weigh-ins/summary': summary() };
      await show();
      await press(t('weighIn.save'));
      await press(t('undoBanner.undo'));
      expect(mockServices.api.DELETE).toHaveBeenCalledWith('/v1/weigh-ins/{id}', { params: { path: { id: 'srv-7' } } });
      expect((await store.all()).filter((r) => r.kind === 'weighIn')).toHaveLength(0);
    });
  });

  test('taken back while Apple Health was written to: it says the Health copy stays (ADR-018 Ek 2)', async () => {
    const announced = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    mockHealthWrite = 'on';
    mockAnswers = { '/v1/weigh-ins/summary': summary() };
    await show();
    await press(t('weighIn.save'));
    await press(t('undoBanner.undo'));
    expect(announced).toHaveBeenCalledWith(t('weighIn.undoneHealth'));
  });

  test.each(['off', 'refused'] as const)('Apple Health writing %s: no word of a Health copy', async (shown) => {
    const announced = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    mockHealthWrite = shown;
    mockAnswers = { '/v1/weigh-ins/summary': summary() };
    await show();
    await press(t('weighIn.save'));
    await press(t('undoBanner.undo'));
    expect(announced).toHaveBeenCalledWith(t('weighIn.undoneSaid'));
    expect(announced).not.toHaveBeenCalledWith(t('weighIn.undoneHealth'));
  });

  test('saved and taken back are said to VoiceOver (K-815): the banner says the save, the take-back says itself', async () => {
    const announced = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    mockAnswers = { '/v1/weigh-ins/summary': summary() };
    await show();
    await press(t('weighIn.save'));
    expect(announced).toHaveBeenCalledWith(t('undoBanner.announce', { detail: t('units.kg', { value: '80.4' }) }));
    await press(t('undoBanner.undo'));
    expect(announced).toHaveBeenCalledWith(t('weighIn.undoneSaid'));
  });
});

describe('Apple Health under the entry, the first time (K-980, ADR-018 Ek 1; no Saved page to put it under, K-1044)', () => {
  test('the card is under Save: Continue is Apple\'s sheet, and nothing is kept by it', async () => {
    mockHealthAvailable = true;
    mockAnswers = { '/v1/weigh-ins/summary': summary() };
    await show();
    expect(screen.getByRole('header', { name: t('health.jit.title') })).toBeOnTheScreen();
    expect(mockServices.queue.record).not.toHaveBeenCalled();

    await press(t('health.jit.continue'));

    expect(mockRequestRead).toHaveBeenCalled();
    expect(screen.queryByRole('header', { name: t('health.jit.title') })).toBeNull();
    expect(screen.getByRole('button', { name: t('weighIn.save') })).toBeOnTheScreen();
    expect(mockServices.queue.record).not.toHaveBeenCalled();
  });

  test('Not now is free, and the card does not come back on the next weigh-in', async () => {
    mockHealthAvailable = true;
    mockAnswers = { '/v1/weigh-ins/summary': summary() };
    await show();
    await press(t('health.jit.notNow'));
    expect(mockRequestRead).not.toHaveBeenCalled();
    expect(screen.queryByRole('header', { name: t('health.jit.title') })).toBeNull();
    await screen.unmount();
    await show();
    expect(screen.queryByRole('header', { name: t('health.jit.title') })).toBeNull();
  });
});

test('without the health data consent: the consent first, nothing to type, nothing kept (ADR-030 #25)', async () => {
  mockGranted = false;
  await show();
  // One line of what it unlocks and two buttons; the legal words are one tap away, whole (Evre 7 final pass).
  expect(screen.getByText(t('weighIn.consent.why'))).toBeOnTheScreen();
  expect(screen.queryByText(t('consent.health_data.points.collected'))).toBeNull();
  await press(t('consent.step.fullText'));
  expect(screen.getByText(t('consent.health_data.points.collected'))).toBeOnTheScreen();
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

test('a weigh-in typed and kept is handed on for Apple Health, as kept (K-412)', async () => {
  await show();
  await type('82,4');
  await press(t('weighIn.save'));
  const [{ body }] = mockServices.queue.record.mock.calls[0] as [{ body: { clientId: string; measuredAt: string; kg: number } }];
  expect(mockServices.healthWriting.weighInSaved).toHaveBeenCalledWith({ id: body.clientId, kg: 82.4, at: new Date(body.measuredAt) });
});

test('nothing kept, nothing handed on', async () => {
  await show();
  await type('abc');
  await press(t('weighIn.save'));
  expect(mockServices.healthWriting.weighInSaved).not.toHaveBeenCalled();
});

test('a weigh-in the phone could not keep is not handed on', async () => {
  mockServices.queue.record.mockRejectedValueOnce(Object.assign(new Error('disk'), { name: 'StoreFailed' }));
  await show();
  await type('82,4');
  await press(t('weighIn.save'));
  expect(mockServices.healthWriting.weighInSaved).not.toHaveBeenCalled();
});

test('a weigh-in the phone could not keep: said on screen and to VoiceOver (K-815)', async () => {
  const announced = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  mockServices.queue.record.mockRejectedValueOnce(Object.assign(new Error('disk'), { name: 'StoreFailed' }));
  await show();
  await type('82,4');
  await press(t('weighIn.save'));
  expect(screen.getByText(t('weighIn.saveFailed'))).toBeOnTheScreen();
  expect(announced).toHaveBeenCalledWith(t('weighIn.saveFailed'));
});

test('the same failure twice is said twice: the problem is cleared before each try (K-815 review)', async () => {
  const announced = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  const failure = Object.assign(new Error('disk'), { name: 'StoreFailed' });
  mockServices.queue.record.mockRejectedValueOnce(failure).mockRejectedValueOnce(failure);
  await show();
  await type('82,4');
  await press(t('weighIn.save'));
  await press(t('weighIn.save'));
  expect(announced.mock.calls.filter(([words]) => words === t('weighIn.saveFailed'))).toHaveLength(2);
});

describe('the way out and the keyboard (K-1065)', () => {
  beforeAll(() => {
    (globalThis as { __showKeyboardAccessory?: boolean }).__showKeyboardAccessory = true;
  });
  afterAll(() => {
    (globalThis as { __showKeyboardAccessory?: boolean }).__showKeyboardAccessory = false;
  });

  test('Close is on the sheet from the first moment, consent or entry, and closes it', async () => {
    mockGranted = false;
    await show();
    expect(screen.getByRole('button', { name: t('weighIn.closeLabel') })).toBeOnTheScreen();
    await screen.unmount();
    mockGranted = true;
    await show();
    await press(t('weighIn.closeLabel'));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockServices.queue.record).not.toHaveBeenCalled();
  });

  test('the number pad has its Done bar, and Save stands in a dock the keyboard lifts', async () => {
    await show();
    expect(screen.getByLabelText(unitLabel()).props.inputAccessoryViewID).toEqual(expect.stringContaining('keel-done'));
    expect(screen.getByRole('button', { name: t('keyboard.hide') })).toBeOnTheScreen();
    expect(screen.getByTestId('keyboard-frame')).toBeOnTheScreen();
    expect(within(screen.getByTestId('keyboard-frame')).getByRole('button', { name: t('weighIn.save') })).toBeOnTheScreen();
  });
});
