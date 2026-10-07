/**
 * The Food tab's day (K-409): what is left of today's budget as a range (U5), and the targets the calls set (K-216) —
 * carbs and fat only when a split fits (no number made up), and without a calorie target only steps and training.
 */
import { router } from 'expo-router';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import FoodScreen from '@/app/food';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { takeMeal } from '@/food/handoff';
import { ThemeProvider } from '@/theme/theme';

type Schemas = components['schemas'];
type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown): Answer => ({ data, response: new Response(null, { status: 200 }) });
const refused = (status: number, code: string): Answer => ({ error: { code, message: 'x' }, response: new Response(null, { status }) });

const BUDGET = (low: number, high: number): Schemas['DayBudget'] => ({
  day: '2026-09-29',
  targetKcal: 2300,
  eaten: {
    kcal: { low: 1350, high: 1520 },
    proteinG: { low: 80, high: 96 },
    carbsG: { low: 100, high: 130 },
    fatG: { low: 40, high: 55 },
  },
  left: { kcal: { low, high }, proteinG: { low: 64, high: 80 } },
});
const TARGETS: Schemas['Targets'] = { targetKcal: 2300, proteinG: 160, carbsG: 250, fatG: 70, stepsPerDay: 8000, trainingSessionsPerWeek: 3 };

let mockAnswers: Record<string, Answer> = {};
const mockGET = jest.fn(async (path: string, _init?: unknown) => mockAnswers[path] ?? refused(404, 'NOT_FOUND'));
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
  queue: { drain: async () => {}, record: async () => true },
  mealRecords: async () => [],
  consents: { granted: async () => true },
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
  mockAnswers = { '/v1/days/{day}/budget': ok(BUDGET(780, 950)), '/v1/targets': ok(TARGETS) };
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <FoodScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const range = (low: number, high: number, unit: string) => `${t('format.range', { low, high })} ${unit}`;

test("today's day is asked for, on the phone's calendar", async () => {
  await show();
  expect(mockGET).toHaveBeenCalledWith('/v1/days/{day}/budget', { params: { path: { day: '2026-09-29' } } });
});

test('what is left, as ranges (U5)', async () => {
  await show();
  expect(screen.getByText(range(780, 950, t('food.budget.kcalUnit')))).toBeOnTheScreen();
  expect(screen.getByText(range(64, 80, t('food.budget.proteinUnit')))).toBeOnTheScreen();
});

test('nothing logged yet: what is left is the target itself, one number, not a range of two equal ends (K-409 review)', async () => {
  mockAnswers['/v1/days/{day}/budget'] = ok({ ...BUDGET(2300, 2300), left: { kcal: { low: 2300, high: 2300 }, proteinG: { low: 160, high: 160 } } });
  await show();
  expect(screen.getByText(t('food.budget.single', { value: '2,300', unit: t('food.budget.kcalUnit') }))).toBeOnTheScreen();
  expect(screen.getByText(t('food.budget.single', { value: '160', unit: t('food.budget.proteinUnit') }))).toBeOnTheScreen();
  expect(screen.queryByText(range(2300, 2300, t('food.budget.kcalUnit')))).toBeNull();
});

test('past the target it says so plainly, by how much, and asks nothing back (U7)', async () => {
  mockAnswers['/v1/days/{day}/budget'] = ok(BUDGET(-400, -150));
  await show();
  expect(screen.getByText(t('food.budget.over'))).toBeOnTheScreen();
  expect(screen.getByText(range(150, 400, t('food.budget.kcalUnit')))).toBeOnTheScreen();
});

test('across zero, about at the target', async () => {
  mockAnswers['/v1/days/{day}/budget'] = ok(BUDGET(-120, 90));
  await show();
  expect(screen.getByText(t('food.budget.around'))).toBeOnTheScreen();
});

test('the targets the calls set: calories, protein, carbs, fat, steps, training', async () => {
  await show();
  for (const text of [
    t('food.targets.kcal', { kcal: '2,300' }),
    t('food.targets.protein', { g: 160 }),
    t('food.targets.carbs', { g: 250 }),
    t('food.targets.fat', { g: 70 }),
    t('food.targets.steps', { steps: '8,000' }),
    t('food.targets.training', { count: 3 }),
  ]) {
    expect(screen.getByText(text)).toBeOnTheScreen();
  }
  expect(screen.queryByText(t('food.targets.noSplit'))).toBeNull();
});

test('no split of carbs and fat fits: it says so, and makes up no number', async () => {
  mockAnswers['/v1/targets'] = ok({ ...TARGETS, carbsG: undefined, fatG: undefined });
  await show();
  expect(screen.getByText(t('food.targets.noSplit'))).toBeOnTheScreen();
  expect(screen.queryByText(t('food.targets.carbs', { g: 250 }))).toBeNull();
  expect(screen.getByText(t('food.targets.protein', { g: 160 }))).toBeOnTheScreen();
});

test('half a split is no split: carbs without fat shows neither number', async () => {
  mockAnswers['/v1/targets'] = ok({ ...TARGETS, fatG: undefined });
  await show();
  expect(screen.getByText(t('food.targets.noSplit'))).toBeOnTheScreen();
  expect(screen.queryByText(t('food.targets.carbs', { g: 250 }))).toBeNull();
});

test('no calorie target yet: only the steps and the training days', async () => {
  mockAnswers['/v1/targets'] = ok({ stepsPerDay: 8000, trainingSessionsPerWeek: 3 });
  mockAnswers['/v1/days/{day}/budget'] = refused(404, 'NOT_FOUND');
  await show();
  expect(screen.getByText(t('food.targets.steps', { steps: '8,000' }))).toBeOnTheScreen();
  expect(screen.getByText(t('food.targets.training', { count: 3 }))).toBeOnTheScreen();
  expect(screen.queryByText(t('food.targets.noSplit'))).toBeNull();
  expect(screen.queryByText(t('food.targets.kcal', { kcal: '2,300' }))).toBeNull();
  expect(screen.getByText(t('food.budget.none'))).toBeOnTheScreen();
});

test('without the health data consent: one line and the way to Settings', async () => {
  mockAnswers = { '/v1/days/{day}/budget': refused(403, 'CONSENT_REQUIRED'), '/v1/targets': refused(403, 'CONSENT_REQUIRED') };
  await show();
  expect(screen.getByText(t('food.consent'))).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: t('today.consent.open') })).toBeOnTheScreen();
});

test('a meal from a photo is one tap from the Food tab, beside logging by name (K-408)', async () => {
  await show();
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('food.photo') })));
  expect(jest.mocked(router.push)).toHaveBeenCalledWith('/meal-photo');
});

test('without the health data consent there is no photo either', async () => {
  mockAnswers = { '/v1/days/{day}/budget': refused(403, 'CONSENT_REQUIRED'), '/v1/targets': refused(403, 'CONSENT_REQUIRED') };
  await show();
  expect(screen.queryByRole('button', { name: t('food.photo') })).toBeNull();
});

describe('what the day can still hold (K-507)', () => {
  const RICE: Schemas['Suggestion'] = {
    foodId: 'fdc-3',
    name: 'Rice, white, cooked',
    amount: { quantity: 150, unit: 'g', certainty: 'ESTIMATED' },
    kcal: { low: 170, high: 240 },
    proteinG: { low: 3, high: 5 },
  };

  test("the user's own foods in their usual amounts, each with its range from the database (U1, U5) — today's day asked", async () => {
    mockAnswers['/v1/days/{day}/suggestions'] = ok([RICE]);
    await show();
    expect(mockGET).toHaveBeenCalledWith('/v1/days/{day}/suggestions', { params: { path: { day: '2026-09-29' } } });
    expect(screen.getByText(t('food.suggestions.title'))).toBeOnTheScreen();
    expect(screen.getByText(t('food.suggestions.item', { name: RICE.name, quantity: '150', unit: 'g' }))).toBeOnTheScreen();
    expect(screen.getByText(range(170, 240, t('food.budget.kcalUnit')))).toBeOnTheScreen();
  });

  test('one tap: the meal screen with that food and amount, handed over in memory (V3)', async () => {
    mockAnswers['/v1/days/{day}/suggestions'] = ok([RICE]);
    await show();
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('food.suggestions.log', { name: RICE.name }) })));
    expect(jest.mocked(router.push)).toHaveBeenCalledWith('/meal');
    expect(takeMeal()).toEqual([{ foodId: 'fdc-3', name: RICE.name, quantity: 150, unit: 'g' }]);
  });

  test('nothing fits, or no answer: no section, and no word of it (U7)', async () => {
    mockAnswers['/v1/days/{day}/suggestions'] = ok([]);
    await show();
    expect(screen.queryByText(t('food.suggestions.title'))).toBeNull();
  });
});
