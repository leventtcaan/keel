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
let mockRecords: LocalRecord[] = [];
let mockGranted = true;
const mockRecord = jest.fn(async (_record: unknown) => true);
const mockDrain = jest.fn(async () => {
  calls.push('drain');
});
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(effect, [effect]);
  },
}));
const mockServices = {
  api: { GET: mockGET },
  queue: { record: mockRecord, drain: mockDrain },
  mealRecords: async () => mockRecords,
  consents: { granted: async () => mockGranted },
  report: () => {},
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
  expect(mockRecord).toHaveBeenCalledTimes(1);
  expect(mockRecord).toHaveBeenCalledWith({
    kind: 'meal',
    body: { clientId: expect.any(String), eatenAt: new Date(2026, 8, 29, 13, 0).toISOString(), slot: 'LUNCH', repeatOf: 'y2' },
  });
  expect(mockGET.mock.calls.length).toBeGreaterThan(readsBefore); // read again, so the meal shows
});

test('without the consent on the phone a repeat is not kept (ADR-030 #25)', async () => {
  mockGranted = false;
  await show();
  const lunch = screen.getByRole('button', { name: t('food.repeat.spoken', { slot: t('food.slot.LUNCH'), items: 'Rice; Chicken' }) });
  await act(async () => fireEvent.press(lunch));
  expect(mockRecord).not.toHaveBeenCalled();
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
