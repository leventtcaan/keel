/**
 * The Food page's day (K-409, K-1063): what is left of today's budget as one number (ADR-090 #5); the targets themselves are in Settings
 * and This week, not here (Evre 7 final walk).
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
  targetProteinG: 140,
  eaten: {
    kcal: { low: 1350, high: 1520 },
    proteinG: { low: 80, high: 96 },
    carbsG: { low: 100, high: 130 },
    fatG: { low: 40, high: 55 },
  },
  left: { kcal: { low, high }, proteinG: { low: 64, high: 80 } },
});
const TARGETS: Schemas['Targets'] = { targetKcal: 2300, proteinG: 160, carbsG: 250, fatG: 70, stepsPerDay: 8000, trainingSessionsPerWeek: 3 };

jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
let mockAnswers: Record<string, Answer> = {};
const mockRecord = jest.fn(async (_record: unknown) => true);
const mockGET = jest.fn(async (path: string, _init?: unknown) => mockAnswers[path] ?? refused(404, 'NOT_FOUND'));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(effect, [effect]);
  },
}));
const mockServices = {
  api: { GET: mockGET },
  queue: { drain: async () => {}, record: mockRecord },
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

// K1 (ADR-090 #5, K-1063): the day's numbers are single ones where a person logs; the ranges moved into "Details". Each test below
// keeps its question (what is left; the first day; past the target; across zero) and asks it of the single number.
test('what is left is one number, the middle of the server range; protein, carbs and fat are eaten over target (U5 as amended)', async () => {
  await show();
  expect(screen.getByText(t('food.totals.left', { value: '865', unit: t('food.budget.kcalUnit') }))).toBeOnTheScreen();
  expect(screen.getByText('88 / 140 g')).toBeOnTheScreen();
  // The carbs and fat targets are the plan's (Targets): 250 and 70.
  expect(screen.getByText('115 / 250 g')).toBeOnTheScreen();
  expect(screen.getByText('48 / 70 g')).toBeOnTheScreen();
  expect(screen.queryByText(range(780, 950, t('food.budget.kcalUnit')))).toBeNull();
});

test('the ranges the numbers are the middle of open under Details, and close again', async () => {
  await show();
  await act(async () => fireEvent.press(screen.getByTestId('totals-detail')));
  expect(screen.getByText(/1,350-1,520 kcal/)).toBeOnTheScreen();
  expect(screen.getByText(/Left: 780-950 kcal/)).toBeOnTheScreen();
  await act(async () => fireEvent.press(screen.getByTestId('totals-detail')));
  expect(screen.queryByText(/1,350-1,520 kcal/)).toBeNull();
});

test('nothing logged yet: what is left is the target itself, one number (K-409 review)', async () => {
  mockAnswers['/v1/days/{day}/budget'] = ok({
    ...BUDGET(2300, 2300),
    eaten: { kcal: { low: 0, high: 0 }, proteinG: { low: 0, high: 0 }, carbsG: { low: 0, high: 0 }, fatG: { low: 0, high: 0 } },
    left: { kcal: { low: 2300, high: 2300 }, proteinG: { low: 160, high: 160 } },
  });
  await show();
  expect(screen.getByText(t('food.totals.left', { value: '2,300', unit: t('food.budget.kcalUnit') }))).toBeOnTheScreen();
  expect(screen.getByText('0 / 140 g')).toBeOnTheScreen();
});

test('past the target it says so plainly, by how much, and asks nothing back (U7)', async () => {
  mockAnswers['/v1/days/{day}/budget'] = ok(BUDGET(-400, -150));
  await show();
  expect(screen.getByText(t('food.budget.over'))).toBeOnTheScreen();
  expect(screen.getByText(t('food.budget.single', { value: '275', unit: t('food.budget.kcalUnit') }))).toBeOnTheScreen();
});

test('across zero, about at the target', async () => {
  mockAnswers['/v1/days/{day}/budget'] = ok(BUDGET(-120, 90));
  await show();
  expect(screen.getByText(t('food.budget.around'))).toBeOnTheScreen();
});

// K1 (Evre 7 final walk, review §C): the page ended with a "Your targets" card of six prose lines; the targets are in Settings and This week.
// Its four tests (the lines, no split, half a split, no calorie target) go with the card; the question left is whether the page still
// shows no targets and, without a calorie target, says the budget comes with the first one.
test('the page ends with the meals: no card of targets, with or without a split', async () => {
  await show();
  expect(screen.queryByTestId('targets')).toBeNull();
  expect(screen.queryByText('Your targets')).toBeNull();
  expect(screen.queryByText(/steps a day/)).toBeNull();
  expect(screen.queryByText(/training sessions a week/)).toBeNull();
});

test('no calorie target yet: the budget comes with the first one, and no targets are listed', async () => {
  mockAnswers['/v1/targets'] = ok({ stepsPerDay: 8000, trainingSessionsPerWeek: 3 });
  mockAnswers['/v1/days/{day}/budget'] = refused(404, 'NOT_FOUND');
  await show();
  expect(screen.getByText(t('food.budget.none'))).toBeOnTheScreen();
  expect(screen.queryByTestId('targets')).toBeNull();
});

test('without the health data consent: one line and the way to Settings', async () => {
  mockAnswers = { '/v1/days/{day}/budget': refused(403, 'CONSENT_REQUIRED'), '/v1/targets': refused(403, 'CONSENT_REQUIRED') };
  await show();
  expect(screen.getByText(t('food.consent'))).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: t('today.consent.open') })).toBeOnTheScreen();
});

test("today's food: the title, the day's budget and the way to log a meal into today (ADR-086, K-1063)", async () => {
  await show();
  expect(screen.getByRole('header', { name: t('screens.food.title') })).toBeOnTheScreen();
  expect(screen.getByText(t('food.totals.left', { value: '865', unit: t('food.budget.kcalUnit') }))).toBeOnTheScreen();
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('food.log') })));
  expect(jest.mocked(router.push)).toHaveBeenCalledWith({ pathname: '/meal', params: { day: '2026-09-29' } });
});

test('the way back is the system header\'s, as on the other screens opened from a screen: the screen draws no Back of its own', async () => {
  await show();
  expect(screen.queryByRole('button', { name: /^(‹ )?(Back|This week)$/ })).toBeNull();
  expect(jest.mocked(router.back)).not.toHaveBeenCalled();
});

test('the AI is off on this surface (ADR-069 #3, K-909): no coach bar, no meal from a photo, no recipes; each led to a retired screen', async () => {
  await show();
  expect(screen.queryByRole('button', { name: t('coach.entry') })).toBeNull();
  expect(screen.queryByText(t('coach.entry'))).toBeNull();
  expect(screen.queryByRole('button', { name: t('food.photo') })).toBeNull();
  expect(screen.queryByRole('button', { name: t('food.recipes') })).toBeNull();
});

test('without the health data consent there is nothing to log: one line and the way to Settings', async () => {
  mockAnswers = { '/v1/days/{day}/budget': refused(403, 'CONSENT_REQUIRED'), '/v1/targets': refused(403, 'CONSENT_REQUIRED') };
  await show();
  expect(screen.queryByRole('button', { name: t('food.log') })).toBeNull();
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
    // K1 (Evre 7 walk finding): the section is the same food row as everywhere (name, the amount under it, one calorie number, a plus).
    expect(screen.getByText(RICE.name)).toBeOnTheScreen();
    expect(screen.getByText('150 g')).toBeOnTheScreen();
    // K1 (ADR-090 #5): the middle of the range, one number.
    expect(screen.getByTestId('fit-fdc-3-kcal')).toHaveTextContent(t('food.single.kcal', { value: 205 }));
    expect(screen.getByTestId('fit-fdc-3-log')).toBeOnTheScreen();
  });

  // K1 (Evre 7 walk finding): a row of "Fits what's left today" had no plus and handed the food to the meal screen; its plus logs it in its usual
  // amount into the meal the clock says, with the app's banner and Undo.
  test('one tap logs that food in its usual amount (the plus of the row), with nothing handed over', async () => {
    mockAnswers['/v1/days/{day}/suggestions'] = ok([RICE]);
    mockRecord.mockClear();
    await show();
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('food.suggestions.log', { name: RICE.name }) })));
    expect(mockRecord).toHaveBeenCalledWith({
      kind: 'meal',
      body: { clientId: expect.any(String), eatenAt: new Date(2026, 8, 29, 13, 0).toISOString(), slot: 'LUNCH', items: [{ foodId: 'fdc-3', amount: { quantity: 150, unit: 'g', certainty: 'ESTIMATED' } }] },
    });
    expect(jest.mocked(router.push)).not.toHaveBeenCalledWith('/meal');
    expect(takeMeal()).toBeNull();
  });

  test('nothing fits, or no answer: no section, and no word of it (U7)', async () => {
    mockAnswers['/v1/days/{day}/suggestions'] = ok([]);
    await show();
    expect(screen.queryByText(t('food.suggestions.title'))).toBeNull();
  });
});
