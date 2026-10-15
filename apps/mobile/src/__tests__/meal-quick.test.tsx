/**
 * A meal in two or three taps (K-980, ADR-018 Ek 1, prototype `#meal`): "Same as yesterday" for the slot, and the foods the
 * user usually eats, each one tap, ranges only (U5) and no colour that judges (neutral). The offers are the ones the Food tab
 * has: yesterday's meals for a slot today has nothing in (`repeatOffers`) and `GET /v1/days/{day}/suggestions`. The first
 * day has neither, so nothing is shown. The full form (search, barcode, amounts) is below, as it was.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { components } from '@/api/schema';
import MealScreen from '@/app/meal';
import { t } from '@/copy';
import { readMealStart } from '@/food/mealStart';
import { foodParams } from '@/food/params';
import { ThemeProvider } from '@/theme/theme';
import { palettes } from '@/theme/tokens';

type Schemas = components['schemas'];
type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown): Answer => ({ data, response: new Response(null, { status: 200 }) });
const refused = (status: number): Answer => ({ error: { code: 'X', message: 'x' }, response: new Response(null, { status }) });
const R = (low: number, high: number) => ({ low, high });

const YESTERDAY_LUNCH: Schemas['Meal'] = {
  id: 'm-lunch',
  clientId: 'c-lunch',
  eatenAt: '2026-09-28T10:10:00Z',
  slot: 'LUNCH',
  items: [{ foodId: 'f1', name: 'Chicken rice bowl', amount: { quantity: 1, unit: 'bowl' } as never, kcal: R(610, 720), proteinG: R(40, 50) }],
  kcal: R(610, 720),
  proteinG: R(40, 50),
};
const YESTERDAY_DINNER: Schemas['Meal'] = { ...YESTERDAY_LUNCH, id: 'm-dinner', clientId: 'c-dinner', slot: 'DINNER', eatenAt: '2026-09-28T17:00:00Z' };
const YOGURT: Schemas['Suggestion'] = { foodId: 'fdc-yogurt', name: 'Greek yogurt', amount: { quantity: 170, unit: 'g', certainty: 'ESTIMATED' } as never, kcal: R(150, 170), proteinG: R(15, 17) };
const BANANA: Schemas['Suggestion'] = { foodId: 'fdc-banana', name: 'Banana', amount: { quantity: 120, unit: 'g', certainty: 'ESTIMATED' } as never, kcal: R(100, 115), proteinG: R(1, 2) };
const OATS: Schemas['Suggestion'] = { foodId: 'fdc-oats', name: 'Oats', amount: { quantity: 60, unit: 'g', certainty: 'ESTIMATED' } as never, kcal: R(220, 235), proteinG: R(7, 8) };

let mockGranted = true;
let mockEdit: string | undefined;
let mockYesterday: Schemas['Meal'][] | Answer = [YESTERDAY_LUNCH, YESTERDAY_DINNER];
let mockToday: Schemas['Meal'][] = [];
let mockSuggestions: Schemas['Suggestion'][] | Answer = [YOGURT, BANANA, OATS];
const mockRecord = jest.fn(async (_record: unknown) => true);
const mockBack = jest.fn();
const mockGET = jest.fn(async (path: string, init?: { params?: { query?: { day?: string } } }) => {
  if (path === '/v1/meals') {
    const day = init?.params?.query?.day;
    if (day === '2026-09-28') return Array.isArray(mockYesterday) ? ok(mockYesterday) : mockYesterday;
    return ok(mockToday);
  }
  if (path === '/v1/days/{day}/suggestions') return Array.isArray(mockSuggestions) ? ok(mockSuggestions) : mockSuggestions;
  return refused(404);
});
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), push: jest.fn() },
  useLocalSearchParams: () => (mockEdit === undefined ? {} : { edit: mockEdit, day: '2026-09-29' }),
}));
const mockServices = {
  api: { GET: mockGET, POST: jest.fn(async () => refused(404)), PUT: jest.fn(), DELETE: jest.fn() },
  queue: { record: mockRecord },
  consents: { granted: async () => mockGranted, remember: jest.fn(async () => {}) },
  // The real read, over this test's server: what is offered is what the Food tab's pieces make of these answers.
  mealStart: (day: string) => readMealStart({ api: mockServices.api as never, mealRecords: async () => [] }, day),
  forgetRecord: jest.fn(async () => {}),
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => 'METRIC' }));

beforeAll(() => {
  // Tuesday 29 Sep 2026, 13:00 on the phone: lunch.
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
  mockGranted = true;
  mockEdit = undefined;
  mockYesterday = [YESTERDAY_LUNCH, YESTERDAY_DINNER];
  mockToday = [];
  mockSuggestions = [YOGURT, BANANA, OATS];
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <MealScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const press = async (name: string | RegExp) => {
  await fireEvent.press(screen.getByRole('button', { name }));
  await act(async () => {});
};

describe('Same as yesterday', () => {
  test('yesterday\'s meal of this slot, with its range, and one tap logs it again as it was', async () => {
    await show();
    expect(screen.getByText(t('food.repeat.title'))).toBeOnTheScreen();
    expect(screen.getByText('Chicken rice bowl')).toBeOnTheScreen();
    expect(screen.getByText(`${t('format.range', { low: 610, high: 720 })} ${t('food.budget.kcalUnit')}`)).toBeOnTheScreen();

    await press(t('food.repeat.spoken', { slot: t('food.slot.LUNCH'), items: 'Chicken rice bowl' }));

    expect(mockRecord).toHaveBeenCalledWith({
      kind: 'meal',
      body: { clientId: expect.any(String), eatenAt: expect.any(String), slot: 'LUNCH', repeatOf: 'm-lunch' },
    });
    expect(mockBack).toHaveBeenCalled();
  });

  test('only the slot being logged: the dinner of yesterday is not offered at lunch', async () => {
    await show();
    expect(screen.queryByRole('button', { name: t('food.repeat.spoken', { slot: t('food.slot.DINNER'), items: 'Chicken rice bowl' }) })).toBeNull();
  });

  test('changing the slot changes the offer', async () => {
    await show();
    await press(t('food.slot.DINNER'));
    expect(screen.getByRole('button', { name: t('food.repeat.spoken', { slot: t('food.slot.DINNER'), items: 'Chicken rice bowl' }) })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('food.repeat.spoken', { slot: t('food.slot.LUNCH'), items: 'Chicken rice bowl' }) })).toBeNull();
  });

  test('a slot already logged today is not offered again', async () => {
    mockToday = [{ ...YESTERDAY_LUNCH, id: 'today-lunch', clientId: 'c-today', eatenAt: '2026-09-29T09:30:00Z' }];
    await show();
    expect(screen.queryByText(t('food.repeat.title'))).toBeNull();
  });

  test('the first day has no yesterday: nothing offered', async () => {
    mockYesterday = [];
    mockSuggestions = [];
    await show();
    expect(screen.queryByText(t('food.repeat.title'))).toBeNull();
    expect(screen.queryByText(t('meal.quick.usual'))).toBeNull();
  });

  test('two taps at once log one meal', async () => {
    await show();
    const name = t('food.repeat.spoken', { slot: t('food.slot.LUNCH'), items: 'Chicken rice bowl' });
    await fireEvent.press(screen.getByRole('button', { name }));
    await fireEvent.press(screen.getByRole('button', { name }));
    await act(async () => {});
    expect(mockRecord).toHaveBeenCalledTimes(1);
  });
});

describe('the foods the user usually eats', () => {
  test('a few, each with its amount and range; one tap logs it in the slot', async () => {
    await show();
    expect(screen.getByText(t('meal.quick.usual'))).toBeOnTheScreen();
    expect(screen.getByText(t('food.suggestions.item', { name: 'Greek yogurt', quantity: '170', unit: 'g' }))).toBeOnTheScreen();
    expect(screen.getByText(`${t('format.range', { low: 150, high: 170 })} ${t('food.budget.kcalUnit')}`)).toBeOnTheScreen();

    await press(t('food.suggestions.log', { name: 'Greek yogurt' }));

    expect(mockRecord).toHaveBeenCalledWith({
      kind: 'meal',
      body: {
        clientId: expect.any(String),
        eatenAt: expect.any(String),
        slot: 'LUNCH',
        items: [{ foodId: 'fdc-yogurt', amount: { quantity: 170, unit: 'g', certainty: 'ESTIMATED' } }],
      },
    });
    expect(mockBack).toHaveBeenCalled();
  });

  test('no more than the screen has room for (food.json › quick_usual_max)', async () => {
    await show();
    const rows = [YOGURT, BANANA, OATS].filter((s) => screen.queryByRole('button', { name: t('food.suggestions.log', { name: s.name }) }) !== null);
    expect(rows).toHaveLength(foodParams.quickUsualMax);
    expect(rows.map((s) => s.name)).toEqual([YOGURT, BANANA, OATS].slice(0, foodParams.quickUsualMax).map((s) => s.name));
  });

  test('the slot chosen is the slot logged', async () => {
    await show();
    await press(t('food.slot.SNACK'));
    await press(t('food.suggestions.log', { name: 'Greek yogurt' }));
    expect(mockRecord).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ slot: 'SNACK' }) }));
  });

  test('ranges only, in the text colour: no word or colour that judges the number (U5, U7)', async () => {
    await show();
    expect(screen.queryByText(/over|under|good|bad|too (much|many)/i)).toBeNull();
    const range = screen.getByText(`${t('format.range', { low: 150, high: 170 })} ${t('food.budget.kcalUnit')}`);
    expect(range).toHaveStyle({ color: palettes.light.text });
    expect(range).not.toHaveStyle({ color: palettes.light.warn });
  });
});

describe('where it is not shown', () => {
  test('unread (offline, a server that did not answer): the form alone, no error', async () => {
    mockYesterday = refused(500);
    mockSuggestions = refused(500);
    await show();
    expect(screen.queryByText(t('food.repeat.title'))).toBeNull();
    expect(screen.queryByText(t('meal.quick.usual'))).toBeNull();
    expect(screen.getByLabelText(t('meal.search.label'))).toBeOnTheScreen();
  });

  test('without the health data consent: the consent first, nothing offered', async () => {
    mockGranted = false;
    await show();
    expect(screen.getByText(t('consent.health_data.body'))).toBeOnTheScreen();
    expect(screen.queryByText(t('food.repeat.title'))).toBeNull();
  });

  test('correcting a logged meal: no quick adds', async () => {
    mockEdit = 'm-1';
    await show();
    expect(screen.queryByText(t('food.repeat.title'))).toBeNull();
    expect(screen.queryByText(t('meal.quick.usual'))).toBeNull();
  });

  test('once a food is being put together by hand, the quick adds step aside', async () => {
    await show();
    mockServices.api.POST.mockResolvedValueOnce(ok([{ id: 'fdc-3', name: 'Rice, white, cooked', per100g: { kcal: R(120, 140), proteinG: R(2, 3), carbsG: R(26, 30), fatG: R(0, 1) } }]) as never);
    await fireEvent.changeText(screen.getByLabelText(t('meal.search.label')), 'rice');
    await press(t('meal.search.go'));
    await press(t('meal.search.add', { name: 'Rice, white, cooked' }));
    expect(screen.queryByText(t('food.repeat.title'))).toBeNull();
    expect(screen.queryByText(t('meal.quick.usual'))).toBeNull();
  });
});

test('a meal that could not be kept on the phone says so and does not leave', async () => {
  mockRecord.mockRejectedValueOnce(Object.assign(new Error('disk'), { name: 'StoreFailed' }));
  await show();
  await press(t('food.repeat.spoken', { slot: t('food.slot.LUNCH'), items: 'Chicken rice bowl' }));
  expect(screen.getByText(t('food.repeat.failed'))).toBeOnTheScreen();
  expect(mockBack).not.toHaveBeenCalled();
});
