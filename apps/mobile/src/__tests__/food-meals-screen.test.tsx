/**
 * The Food tab's meals (K-407): today's meals, the server's joined with the ones not sent yet, each with its range (U5);
 * and "same as yesterday" — yesterday's meal for a slot today has nothing in, logged again with one tap (repeatOf), saved
 * on the phone first (K-304). Health data: only with the consent, never kept on the phone without it (ADR-030 #25).
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import FoodScreen from '@/app/(tabs)/food';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import type { LocalRecord } from '@/sync/store';
import { ThemeProvider } from '@/theme/theme';

type Schemas = components['schemas'];
type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown): Answer => ({ data, response: new Response(null, { status: 200 }) });
const refused = (status: number, code: string): Answer => ({ error: { code, message: 'x' }, response: new Response(null, { status }) });

const at = (h: number, day = 29) => new Date(2026, 8, day, h, 0).toISOString();
const meal = (id: string, eatenAt: string, slot: Schemas['MealSlot'], names: string[], low: number, high: number): Schemas['Meal'] => ({
  id,
  clientId: `c-${id}`,
  eatenAt,
  slot,
  items: names.map((name) => ({ foodId: name, name, amount: { quantity: 1, unit: 'g' }, kcal: { low: 1, high: 2 }, proteinG: { low: 0, high: 1 } })),
  kcal: { low, high },
  proteinG: { low: 10, high: 14 },
});

let mockAnswers: Record<string, Answer> = {};
let mockMealsByDay: Record<string, Answer> = {};
const calls: string[] = [];
const answer = async (path: string, init?: { params?: { query?: { day?: string } } }) => {
  calls.push(path);
  if (path === '/v1/meals') return mockMealsByDay[init?.params?.query?.day ?? ''] ?? ok([]);
  return mockAnswers[path] ?? refused(404, 'NOT_FOUND');
};
const mockGET = jest.fn(answer);
const mockPush = jest.fn();
let mockRecords: LocalRecord[] = [];
let mockGranted = true;
const mockRecord = jest.fn(async (_record: unknown) => true);
const mockDrain = jest.fn(async () => {
  calls.push('drain');
});
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
jest.mock('expo-router', () => ({
  router: { push: (to: unknown) => mockPush(to) },
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(effect, [effect]);
  },
}));
const mockGrantedCheck = jest.fn(async (_kind: string) => mockGranted);
const mockReport = jest.fn();
const mockServices = {
  api: { GET: mockGET },
  queue: { record: mockRecord, drain: mockDrain },
  mealRecords: async () => mockRecords,
  consents: { granted: mockGrantedCheck },
  report: mockReport,
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => 'METRIC' }));

beforeAll(() => {
  jest.useFakeTimers({
    now: new Date(2026, 8, 29, 13, 0),
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
  mockGET.mockImplementation(answer);
  calls.length = 0;
  mockAnswers = { '/v1/targets': ok({ stepsPerDay: 8000, trainingSessionsPerWeek: 3 }) };
  mockMealsByDay = {
    '2026-09-29': ok([meal('m1', at(8), 'BREAKFAST', ['Oats, rolled', 'Milk, whole'], 380, 450)]),
    '2026-09-28': ok([meal('y1', at(8, 28), 'BREAKFAST', ['Eggs'], 200, 240), meal('y2', at(13, 28), 'LUNCH', ['Rice', 'Chicken'], 610, 720)]),
  };
  mockRecords = [];
  mockGranted = true;
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <FoodScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const range = (low: number, high: number) => `${t('format.range', { low, high })} ${t('food.budget.kcalUnit')}`;

test("today's meals with what is in them and their range; what the phone holds goes to the server first", async () => {
  mockRecords = [
    {
      seq: 1,
      clientId: 'w1',
      kind: 'meal',
      parentClientId: null,
      body: { clientId: 'w1', eatenAt: at(11), slot: 'SNACK', items: [{ foodId: 'f', amount: { quantity: 1, unit: 'g' } }] },
      state: 'PENDING',
      serverId: null,
      serverBody: null,
      errorCode: null,
    },
  ];
  await show();
  expect(calls.indexOf('drain')).toBeLessThan(calls.indexOf('/v1/meals'));
  expect(mockGET).toHaveBeenCalledWith('/v1/meals', { params: { query: { day: '2026-09-29' } } });
  expect(screen.getByText(t('food.meals.title'))).toBeOnTheScreen();
  // Food names carry commas ("Oats, rolled"): each item is its own line, so none runs into the next (simulator).
  expect(screen.getByText('Oats, rolled')).toBeOnTheScreen();
  expect(screen.getByText('Milk, whole')).toBeOnTheScreen();
  expect(screen.getByText(range(380, 450))).toBeOnTheScreen();
  expect(screen.getByText(t('food.meals.waiting'))).toBeOnTheScreen();
  expect(screen.getByText(t('food.slot.SNACK'))).toBeOnTheScreen();
});

test('nothing logged today: it says so', async () => {
  mockMealsByDay['2026-09-29'] = ok([]);
  await show();
  expect(screen.getByText(t('food.meals.none'))).toBeOnTheScreen();
});

test("same as yesterday: yesterday's meal for a slot today has nothing in, one tap logs it again", async () => {
  await show();
  expect(mockGET).toHaveBeenCalledWith('/v1/meals', { params: { query: { day: '2026-09-28' } } });
  expect(screen.getByText(t('food.repeat.title'))).toBeOnTheScreen();
  // Breakfast is logged today: only lunch is offered.
  expect(screen.queryByRole('button', { name: t('food.repeat.spoken', { slot: t('food.slot.BREAKFAST'), items: 'Eggs' }) })).toBeNull();
  const lunch = screen.getByRole('button', { name: t('food.repeat.spoken', { slot: t('food.slot.LUNCH'), items: 'Rice; Chicken' }) });

  const readsBefore = mockGET.mock.calls.length;
  await act(async () => fireEvent.press(lunch));
  expect(mockGrantedCheck).toHaveBeenCalledWith('HEALTH_DATA');
  expect(mockRecord).toHaveBeenCalledTimes(1);
  expect(mockRecord).toHaveBeenCalledWith({
    kind: 'meal',
    body: { clientId: expect.any(String), eatenAt: new Date(2026, 8, 29, 13, 0).toISOString(), slot: 'LUNCH', repeatOf: 'y2' },
  });
  expect(mockGET.mock.calls.length).toBeGreaterThan(readsBefore); // read again, so the meal shows
});

test('without the consent on the phone a repeat is not kept (ADR-030 #25), and it says why (review)', async () => {
  mockGranted = false;
  await show();
  const lunch = screen.getByRole('button', { name: t('food.repeat.spoken', { slot: t('food.slot.LUNCH'), items: 'Rice; Chicken' }) });
  await act(async () => fireEvent.press(lunch));
  expect(mockRecord).not.toHaveBeenCalled();
  expect(screen.getByText(t('food.repeat.noConsent'))).toBeOnTheScreen();
});

test('a repeat tapped twice before the list is read again is logged once (review)', async () => {
  await show();
  const name = t('food.repeat.spoken', { slot: t('food.slot.LUNCH'), items: 'Rice; Chicken' });
  // The next read waits: the offer just tapped must not stay tappable meanwhile.
  let release = () => {};
  mockDrain.mockImplementationOnce(() => new Promise<void>((resolve) => (release = resolve)));
  await act(async () => fireEvent.press(screen.getByRole('button', { name })));
  const again = screen.queryByRole('button', { name });
  if (again !== null) await act(async () => fireEvent.press(again));
  expect(mockRecord).toHaveBeenCalledTimes(1);
  await act(async () => release());
});

test('a repeat hidden only until the next read: if that read has no such meal (refused, deleted), it is offered again', async () => {
  await show();
  const name = t('food.repeat.spoken', { slot: t('food.slot.LUNCH'), items: 'Rice; Chicken' });
  await act(async () => fireEvent.press(screen.getByRole('button', { name })));
  // mockRecords stays empty and the server's list has no lunch: the read that followed shows none.
  expect(screen.getByRole('button', { name })).toBeOnTheScreen();
});

test('two presses in the same moment log once (review)', async () => {
  await show();
  const lunch = screen.getByRole('button', { name: t('food.repeat.spoken', { slot: t('food.slot.LUNCH'), items: 'Rice; Chicken' }) });
  // Both in one step, before a render could disable the button: the press handler itself, twice (fireEvent would wrap
  // each press in its own act, and acts cannot overlap).
  const press = (lunch.props as { onClick: (event: object) => void }).onClick;
  await act(async () => {
    press({ nativeEvent: {} });
    press({ nativeEvent: {} });
  });
  expect(mockRecord).toHaveBeenCalledTimes(1);
});

test('a repeat the phone could not save says so, by name only in the report (V3), and can be tried again', async () => {
  const failure = new Error('INSERT meal Rice, Chicken failed');
  failure.name = 'SQLiteError';
  mockRecord.mockRejectedValueOnce(failure);
  await show();
  const name = t('food.repeat.spoken', { slot: t('food.slot.LUNCH'), items: 'Rice; Chicken' });
  await act(async () => fireEvent.press(screen.getByRole('button', { name })));
  expect(screen.getByText(t('food.repeat.failed'))).toBeOnTheScreen();
  expect(mockReport).toHaveBeenCalledWith({ name: 'SQLiteError' });
  await act(async () => fireEvent.press(screen.getByRole('button', { name })));
  expect(mockRecord).toHaveBeenCalledTimes(2);
  expect(screen.queryByText(t('food.repeat.failed'))).toBeNull();
});

test('today\'s list not read (a server error): no offers, no "nothing logged", and the way to try again (review)', async () => {
  mockAnswers['/v1/days/{day}/budget'] = ok({
    day: '2026-09-29',
    targetKcal: 2300,
    eaten: { kcal: { low: 0, high: 0 }, proteinG: { low: 0, high: 0 }, carbsG: { low: 0, high: 0 }, fatG: { low: 0, high: 0 } },
    left: { kcal: { low: 2300, high: 2300 }, proteinG: { low: 160, high: 160 } },
  });
  mockMealsByDay['2026-09-29'] = refused(500, 'INTERNAL');
  await show();
  expect(screen.queryByText(t('food.meals.none'))).toBeNull();
  expect(screen.queryByText(t('food.repeat.title'))).toBeNull();
  expect(screen.getByText(t('today.failed'))).toBeOnTheScreen();
});

test('the consent the meals list asks for is enough to show the way to Settings', async () => {
  mockMealsByDay['2026-09-29'] = refused(403, 'CONSENT_REQUIRED');
  await show();
  expect(screen.getByText(t('food.consent'))).toBeOnTheScreen();
  expect(screen.queryByText(t('food.meals.title'))).toBeNull();
});

test('what waits on the phone failing to go does not blank the tab; it is reported by name', async () => {
  mockDrain.mockRejectedValueOnce(new TypeError('x'));
  await show();
  expect(screen.getByText('Oats, rolled')).toBeOnTheScreen();
  expect(mockReport).toHaveBeenCalledWith({ name: 'TypeError' });
});

test('without the health data consent on the server: no meals and no offers, only the way to Settings', async () => {
  mockMealsByDay = { '2026-09-29': refused(403, 'CONSENT_REQUIRED'), '2026-09-28': refused(403, 'CONSENT_REQUIRED') };
  mockAnswers['/v1/days/{day}/budget'] = refused(403, 'CONSENT_REQUIRED');
  await show();
  expect(screen.getByText(t('food.consent'))).toBeOnTheScreen();
  expect(screen.queryByText(t('food.meals.title'))).toBeNull();
  expect(screen.queryByText(t('food.repeat.title'))).toBeNull();
});

test("offline: the meals the phone holds, and no offers (yesterday's list is not there)", async () => {
  mockGET.mockImplementation(async () => {
    throw new TypeError('Network request failed');
  });
  mockRecords = [
    {
      seq: 1,
      clientId: 'c-m1',
      kind: 'meal',
      parentClientId: null,
      body: { clientId: 'c-m1', eatenAt: at(8), slot: 'BREAKFAST', repeatOf: 'y1' },
      state: 'SYNCED',
      serverId: 'm1',
      serverBody: meal('m1', at(8), 'BREAKFAST', ['Eggs'], 200, 240),
      errorCode: null,
    },
  ];
  await show();
  expect(screen.getByText('Eggs')).toBeOnTheScreen();
  expect(screen.queryByText(t('food.repeat.title'))).toBeNull();
});

test('a meal is logged from here: the way to the meal screen', async () => {
  await show();
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('food.log') })));
  expect(mockPush).toHaveBeenCalledWith('/meal');
});
