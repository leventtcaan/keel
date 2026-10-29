/**
 * A meal in two or three taps (K-980, ADR-018 Ek 1 and 3, prototype `#meal`): "Same as yesterday" for the slot, and the foods
 * eaten lately ("Recent", `GET /v1/foods/recent?slot=`, K-1025), each one tap, ranges only (U5) and no colour that judges
 * (neutral). "Same as yesterday" is yesterday's meal for a slot today has nothing in (`repeatOffers`). The first day has
 * neither, so nothing is shown. The full form (search, barcode, amounts) is below, as it was.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { components } from '@/api/schema';
import MealScreen from '@/app/meal';
import { t } from '@/copy';
import { readMealStart, readRecentFoods } from '@/food/mealStart';
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
let mockRecent: Schemas['Suggestion'][] | Answer = [YOGURT, BANANA, OATS];
const mockRecord = jest.fn(async (_record: unknown) => true);
// The real take-back is tested on its own (sync-take-back.test.ts): here it only runs the server delete it is given.
const mockTakeBack = jest.fn(async (_clientId: string, remove: (serverId: string) => Promise<number>) => {
  const status = await remove('srv-meal-1');
  return status === 204 || status === 404 ? ('taken' as const) : status === 409 ? ('conflict' as const) : ('offline' as const);
});
const mockBack = jest.fn();
const mockGET = jest.fn(async (path: string, init?: { params?: { query?: { day?: string; slot?: string } } }) => {
  if (path === '/v1/meals') {
    const day = init?.params?.query?.day;
    if (day === '2026-09-28') return Array.isArray(mockYesterday) ? ok(mockYesterday) : mockYesterday;
    return ok(mockToday);
  }
  if (path === '/v1/foods/recent') return Array.isArray(mockRecent) ? ok(mockRecent) : mockRecent;
  return refused(404);
});
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), push: jest.fn() },
  useLocalSearchParams: () => (mockEdit === undefined ? {} : { edit: mockEdit, day: '2026-09-29' }),
}));
const mockServices = {
  api: { GET: mockGET, POST: jest.fn(async () => refused(404)), PUT: jest.fn(), DELETE: jest.fn(async (_path: string, _init?: unknown) => ({ response: new Response(null, { status: 204 }) })) },
  queue: { record: mockRecord },
  takeBack: mockTakeBack,
  consents: { granted: async () => mockGranted, remember: jest.fn(async () => {}) },
  // The real read, over this test's server: what is offered is what the Food tab's pieces make of these answers.
  mealStart: (day: string) => readMealStart({ api: mockServices.api as never, mealRecords: async () => [] }, day),
  recentFoods: (slot: Schemas['MealSlot']) => readRecentFoods({ api: mockServices.api as never }, slot),
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
  mockRecent = [YOGURT, BANANA, OATS];
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
    expect(mockBack).not.toHaveBeenCalled(); // the confirmation first (K-1029): Done leaves
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
    mockRecent = [];
    await show();
    expect(screen.queryByText(t('food.repeat.title'))).toBeNull();
    expect(screen.queryByText(t('meal.quick.recent'))).toBeNull();
  });

  test('two taps at once log one meal', async () => {
    await show();
    const name = t('food.repeat.spoken', { slot: t('food.slot.LUNCH'), items: 'Chicken rice bowl' });
    // Both taps land before the first log has finished (no await between them): only the guard stands between them and two meals.
    const button = screen.getByRole('button', { name });
    await act(async () => {
      void fireEvent.press(button);
      void fireEvent.press(button);
    });
    expect(mockRecord).toHaveBeenCalledTimes(1);
  });
});

describe('the foods eaten lately', () => {
  test('a few, each with its amount and range; one tap logs it in the slot', async () => {
    await show();
    expect(screen.getByText(t('meal.quick.recent'))).toBeOnTheScreen();
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
    expect(mockBack).not.toHaveBeenCalled(); // the confirmation first (K-1029): Done leaves
  });

  test('no more than the screen has room for (food.json › quick_recent_max)', async () => {
    await show();
    const rows = [YOGURT, BANANA, OATS].filter((s) => screen.queryByRole('button', { name: t('food.suggestions.log', { name: s.name }) }) !== null);
    expect(rows).toHaveLength(foodParams.quickRecentMax);
    expect(rows.map((s) => s.name)).toEqual([YOGURT, BANANA, OATS].slice(0, foodParams.quickRecentMax).map((s) => s.name));
  });

  test('the slot chosen is the slot logged', async () => {
    await show();
    await press(t('food.slot.SNACK'));
    await press(t('food.suggestions.log', { name: 'Greek yogurt' }));
    expect(mockRecord).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ slot: 'SNACK' }) }));
  });

  test('asks the server for the slot being logged, and again when the slot changes; the order is the server\'s', async () => {
    await show();
    expect(mockGET).toHaveBeenCalledWith('/v1/foods/recent', { params: { query: { slot: 'LUNCH' } } });

    mockRecent = [BANANA, YOGURT, OATS];
    await press(t('food.slot.SNACK'));

    expect(mockGET).toHaveBeenCalledWith('/v1/foods/recent', { params: { query: { slot: 'SNACK' } } });
    const shown = screen.getAllByRole('button', { name: /^Log / }).map((row) => row.props.accessibilityLabel as string);
    expect(shown[0]).toBe(t('food.suggestions.log', { name: 'Banana' }));
    expect(shown[1]).toBe(t('food.suggestions.log', { name: 'Greek yogurt' }));
  });

  test('trying a recent food again after a failure is the same meal: one clientId', async () => {
    mockRecord.mockRejectedValueOnce(Object.assign(new Error('disk'), { name: 'StoreFailed' }));
    await show();
    await press(t('food.suggestions.log', { name: 'Greek yogurt' }));
    await press(t('food.suggestions.log', { name: 'Greek yogurt' }));
    const ids = mockRecord.mock.calls.map(([record]) => (record as { body: { clientId: string } }).body.clientId);
    expect(ids).toHaveLength(2);
    expect(ids[1]).toBe(ids[0]);
  });

  test('ranges only, in the text colour: no word or colour that judges the number (U5, U7)', async () => {
    await show();
    expect(screen.queryByText(/over|under|good|bad|too (much|many)/i)).toBeNull();
    const range = screen.getByText(`${t('format.range', { low: 150, high: 170 })} ${t('food.budget.kcalUnit')}`);
    expect(range).toHaveStyle({ color: palettes.light.text });
    expect(range).not.toHaveStyle({ color: palettes.light.warn });
  });
});

describe('logged, with Undo (K-1029, Tour 4 B9)', () => {
  const clientIdOfLast = () => (mockRecord.mock.calls.at(-1)?.[0] as { body: { clientId: string } }).body.clientId;

  test('a recent food: the sheet stays and says it is logged, with Undo and Done; it does not close by itself', async () => {
    await show();
    await press(t('food.suggestions.log', { name: 'Greek yogurt' }));
    expect(screen.getByText(t('meal.quick.logged', { slot: t('food.slot.LUNCH') }))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('meal.quick.undoLabel') })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('food.suggestions.log', { name: 'Banana' }) })).toBeNull(); // the list steps aside: no second tap by accident
    expect(mockBack).not.toHaveBeenCalled();

    await press(t('meal.quick.done'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('same as yesterday: the same confirmation', async () => {
    await show();
    await press(t('food.repeat.spoken', { slot: t('food.slot.LUNCH'), items: 'Chicken rice bowl' }));
    expect(screen.getByText(t('meal.quick.logged', { slot: t('food.slot.LUNCH') }))).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
  });

  test('Undo takes the meal back through the existing delete (by the clientId it was logged with), and the list is offered again', async () => {
    await show();
    await press(t('food.suggestions.log', { name: 'Greek yogurt' }));
    const logged = clientIdOfLast();
    await press(t('meal.quick.undoLabel'));

    expect(mockTakeBack).toHaveBeenCalledWith(logged, expect.any(Function));
    expect(mockServices.api.DELETE).toHaveBeenCalledWith('/v1/meals/{id}', { params: { path: { id: 'srv-meal-1' } } });
    expect(screen.queryByText(t('meal.quick.logged', { slot: t('food.slot.LUNCH') }))).toBeNull();
    expect(screen.getByRole('button', { name: t('food.suggestions.log', { name: 'Greek yogurt' }) })).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
  });

  test('after Undo, logging the same food again is a new meal (a new clientId)', async () => {
    await show();
    await press(t('food.suggestions.log', { name: 'Greek yogurt' }));
    const first = clientIdOfLast();
    await press(t('meal.quick.undoLabel'));
    await press(t('food.suggestions.log', { name: 'Greek yogurt' }));
    expect(clientIdOfLast()).not.toBe(first);
  });

  test('offline: Undo says so, changes nothing, and can be tried again', async () => {
    mockTakeBack.mockResolvedValueOnce('offline');
    await show();
    await press(t('food.suggestions.log', { name: 'Greek yogurt' }));
    await press(t('meal.quick.undoLabel'));
    expect(screen.getByText(t('meal.quick.undoOffline'))).toBeOnTheScreen();
    expect(screen.getByText(t('meal.quick.logged', { slot: t('food.slot.LUNCH') }))).toBeOnTheScreen();
    await press(t('meal.quick.undoLabel'));
    expect(screen.queryByText(t('meal.quick.logged', { slot: t('food.slot.LUNCH') }))).toBeNull();
  });

  test('a refused delete says it could not be taken back', async () => {
    mockTakeBack.mockResolvedValueOnce('conflict');
    await show();
    await press(t('food.suggestions.log', { name: 'Greek yogurt' }));
    await press(t('meal.quick.undoLabel'));
    expect(screen.getByText(t('meal.quick.undoFailed'))).toBeOnTheScreen();
    expect(screen.getByText(t('meal.quick.logged', { slot: t('food.slot.LUNCH') }))).toBeOnTheScreen();
  });

  test('while it shows Logged, the rest of the sheet is away: no chips, no form, no Save (a second Save would be a second meal)', async () => {
    await show();
    expect(screen.getByLabelText(t('meal.search.label'))).toBeOnTheScreen();
    await press(t('food.suggestions.log', { name: 'Greek yogurt' }));

    expect(screen.queryByRole('button', { name: t('food.slot.DINNER') })).toBeNull();
    expect(screen.queryByLabelText(t('meal.search.label'))).toBeNull();
    expect(screen.queryByRole('button', { name: t('meal.save') })).toBeNull();
    expect(screen.getByRole('button', { name: t('meal.quick.undoLabel') })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('meal.quick.done') })).toBeOnTheScreen();

    await press(t('meal.quick.undoLabel')); // taken back: the sheet is whole again
    expect(screen.getByRole('button', { name: t('food.slot.DINNER') })).toBeOnTheScreen();
    expect(screen.getByLabelText(t('meal.search.label'))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('meal.save') })).toBeOnTheScreen();
  });

  test('it is said aloud (VoiceOver)', async () => {
    const { AccessibilityInfo } = jest.requireActual<typeof import('react-native')>('react-native');
    const announced = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    await show();
    await press(t('food.suggestions.log', { name: 'Greek yogurt' }));
    expect(announced).toHaveBeenCalledWith(t('meal.quick.loggedSaid', { slot: t('food.slot.LUNCH') }));
  });
});

describe('the amount reads clearly (K-1029, Tour 4 B10)', () => {
  test('a serving whose name starts with its count is not run together with the quantity: "Potato, baked · 1 medium"', async () => {
    mockRecent = [{ foodId: 'fdc-potato', name: 'Potato, baked', amount: { quantity: 1, unit: '1 medium', certainty: 'ESTIMATED' } as never, kcal: R(150, 170), proteinG: R(3, 5) }];
    await show();
    expect(screen.getByText('Potato, baked · 1 medium')).toBeOnTheScreen();
    expect(screen.queryByText(/1 1 medium/)).toBeNull();
  });

  test('two of such a serving: "2 × 1 medium"', async () => {
    mockRecent = [{ foodId: 'fdc-potato', name: 'Potato, baked', amount: { quantity: 2, unit: '1 medium', certainty: 'ESTIMATED' } as never, kcal: R(300, 340), proteinG: R(6, 10) }];
    await show();
    expect(screen.getByText('Potato, baked · 2 × 1 medium')).toBeOnTheScreen();
  });

  test('a serving named without a count keeps the quantity before it; grams stay as they are', async () => {
    mockRecent = [
      { foodId: 'a', name: 'Chicken rice bowl', amount: { quantity: 1, unit: 'bowl' } as never, kcal: R(610, 720), proteinG: R(40, 50) },
      YOGURT,
    ];
    await show();
    expect(screen.getByText('Chicken rice bowl · 1 bowl')).toBeOnTheScreen();
    expect(screen.getByText('Greek yogurt · 170 g')).toBeOnTheScreen();
  });
});

describe('where it is not shown', () => {
  test('unread (offline, a server that did not answer): the form alone, no error', async () => {
    mockYesterday = refused(500);
    mockRecent = refused(500);
    await show();
    expect(screen.queryByText(t('food.repeat.title'))).toBeNull();
    expect(screen.queryByText(t('meal.quick.recent'))).toBeNull();
    expect(screen.getByLabelText(t('meal.search.label'))).toBeOnTheScreen();
  });

  test('without the health data consent: the consent first, nothing offered', async () => {
    mockGranted = false;
    await show();
    expect(screen.getByText(t('consent.health_data.points.collected'))).toBeOnTheScreen();
    expect(screen.queryByText(t('food.repeat.title'))).toBeNull();
  });

  test('correcting a logged meal: no quick adds', async () => {
    mockEdit = 'm-1';
    await show();
    expect(screen.queryByText(t('food.repeat.title'))).toBeNull();
    expect(screen.queryByText(t('meal.quick.recent'))).toBeNull();
  });

  test('once a food is being put together by hand, the quick adds step aside', async () => {
    await show();
    mockServices.api.POST.mockResolvedValueOnce(ok([{ id: 'fdc-3', name: 'Rice, white, cooked', per100g: { kcal: R(120, 140), proteinG: R(2, 3), carbsG: R(26, 30), fatG: R(0, 1) } }]) as never);
    await fireEvent.changeText(screen.getByLabelText(t('meal.search.label')), 'rice');
    await act(async () => fireEvent(screen.getByLabelText(t('meal.search.label')), 'submitEditing'));
    await press(t('meal.search.add', { name: 'Rice, white, cooked' }));
    expect(screen.queryByText(t('food.repeat.title'))).toBeNull();
    expect(screen.queryByText(t('meal.quick.recent'))).toBeNull();
  });
});

test('trying again after a failure is the same meal: one clientId, so a try that was kept after all is not logged twice', async () => {
  mockRecord.mockRejectedValueOnce(Object.assign(new Error('disk'), { name: 'StoreFailed' }));
  await show();
  const name = t('food.repeat.spoken', { slot: t('food.slot.LUNCH'), items: 'Chicken rice bowl' });
  await press(name);
  await press(name);
  const ids = mockRecord.mock.calls.map(([record]) => (record as { body: { clientId: string } }).body.clientId);
  expect(ids).toHaveLength(2);
  expect(ids[1]).toBe(ids[0]);
});

test('another meal after a failure is a new one', async () => {
  mockRecord.mockRejectedValueOnce(Object.assign(new Error('disk'), { name: 'StoreFailed' }));
  await show();
  await press(t('food.repeat.spoken', { slot: t('food.slot.LUNCH'), items: 'Chicken rice bowl' }));
  await press(t('food.suggestions.log', { name: 'Greek yogurt' }));
  const ids = mockRecord.mock.calls.map(([record]) => (record as { body: { clientId: string } }).body.clientId);
  expect(ids[1]).not.toBe(ids[0]);
});

test('the same failure twice is said twice (K-815)', async () => {
  const { AccessibilityInfo } = jest.requireActual<typeof import('react-native')>('react-native');
  const announced = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  const failure = Object.assign(new Error('disk'), { name: 'StoreFailed' });
  mockRecord.mockRejectedValueOnce(failure).mockRejectedValueOnce(failure);
  await show();
  const name = t('food.repeat.spoken', { slot: t('food.slot.LUNCH'), items: 'Chicken rice bowl' });
  await press(name);
  await press(name);
  expect(announced.mock.calls.filter(([words]) => words === t('food.repeat.failed'))).toHaveLength(2);
});

test('a meal that could not be kept on the phone says so and does not leave', async () => {
  mockRecord.mockRejectedValueOnce(Object.assign(new Error('disk'), { name: 'StoreFailed' }));
  await show();
  await press(t('food.repeat.spoken', { slot: t('food.slot.LUNCH'), items: 'Chicken rice bowl' }));
  expect(screen.getByText(t('food.repeat.failed'))).toBeOnTheScreen();
  expect(mockBack).not.toHaveBeenCalled();
});
