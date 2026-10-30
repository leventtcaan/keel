/**
 * What the person eats, without typing (K-980, ADR-018 Ek 1 and 3, K-1063; Evre 7 A, ADR-090 Ek 6): on the empty search one list with
 * sections — a past meal of this meal as one row ("Same as yesterday's lunch"), Favorites, "Usually at lunch" (the server filters by meal),
 * Recent (this meal's own foods) — every row with one calorie number, its macros as marks, a heart and a plus that logs it in one tap. A
 * tap keeps the meal on the phone and the screen stays open: the tray grows and a light "Added · Undo" stands above the foot. The first
 * day has nothing to offer, so nothing is shown.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { Alert } from 'react-native';

import type { components } from '@/api/schema';
import MealScreen from '@/app/meal';
import { t } from '@/copy';
import { foodParams } from '@/food/params';
import { ThemeProvider } from '@/theme/theme';

import { WithSaved, banner, undoButton } from './support/saved';

type Schemas = components['schemas'];
type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown): Answer => ({ data, response: new Response(null, { status: 200 }) });
const refused = (status: number): Answer => ({ error: { code: 'X', message: 'x' }, response: new Response(null, { status }) });
const R = (low: number, high: number) => ({ low, high });
const single = (low: number, high: number) => t('food.single.kcal', { value: Math.round((low + high) / 2) });
const at = (day: number, hour: number) => new Date(2026, 8, day, hour, 10).toISOString();

const item = (foodId: string, name: string, unit: string, quantity: number, kcal: [number, number]) => ({
  foodId,
  name,
  amount: { quantity, unit } as never,
  kcal: R(...kcal),
  proteinG: R(10, 12),
});
const BOWL = item('f1', 'Chicken rice bowl', 'bowl', 1, [610, 720]);
const YESTERDAY_LUNCH: Schemas['Meal'] = { id: 'm-lunch', clientId: 'c-lunch', eatenAt: at(28, 12), slot: 'LUNCH', items: [BOWL], kcal: R(610, 720), proteinG: R(40, 50) };
const YESTERDAY_DINNER: Schemas['Meal'] = { ...YESTERDAY_LUNCH, id: 'm-dinner', clientId: 'c-dinner', slot: 'DINNER', eatenAt: at(28, 19) };
const THREE_DAYS_AGO_LUNCH: Schemas['Meal'] = { ...YESTERDAY_LUNCH, id: 'm-old', clientId: 'c-old', eatenAt: at(26, 12) };
const sug = (foodId: string, name: string, quantity: number, unit: string, kcal: [number, number], protein: [number, number]): Schemas['Suggestion'] => ({
  foodId,
  name,
  amount: { quantity, unit, certainty: 'ESTIMATED' } as never,
  kcal: R(...kcal),
  proteinG: R(...protein),
  carbsG: R(10, 14),
  fatG: R(2, 4),
});
const YOGURT = sug('fdc-yogurt', 'Greek yogurt', 170, 'g', [150, 170], [15, 17]);
const BANANA = sug('fdc-banana', 'Banana', 120, 'g', [100, 115], [1, 2]);
const OATS = sug('fdc-oats', 'Oats', 60, 'g', [220, 235], [7, 8]);
const FAVORITE: Schemas['Food'] = {
  id: 'fdc-egg',
  name: 'Egg, whole',
  per100g: { kcal: R(130, 160), proteinG: R(12, 13), carbsG: R(0, 1), fatG: R(9, 11) },
  portions: [{ unit: '1 large', label: '1 large', kind: 'PIECE', grams: 50, kcal: 72, proteinG: 6.3, carbsG: 0.4, fatG: 4.8 }],
  defaultAmount: { quantity: 1, unit: '1 large' },
};

let mockGranted = true;
let mockHistory: Schemas['Meal'][] = [];
let mockToday: Schemas['Meal'][] = [];
let mockUsual: Schemas['Suggestion'][] | Answer = [];
let mockRecent: Schemas['Suggestion'][] | Answer = [];
let mockFavorites: Schemas['Food'][] = [];
let mockLocal: unknown[] = [];
const mockRecord = jest.fn(async (record: unknown) => {
  const { body } = record as { body: { clientId: string } };
  mockLocal.push({ seq: mockLocal.length, clientId: body.clientId, kind: 'meal', parentClientId: null, body, state: 'PENDING', serverId: null, serverBody: null, errorCode: null });
  return true;
});
// The real take-back is tested on its own (sync-take-back.test.ts): here it only runs the server delete it is given.
const mockTakeBack = jest.fn(async (_clientId: string, remove: (serverId: string) => Promise<number>) => {
  const status = await remove('srv-meal-1');
  return status === 204 || status === 404 ? ('taken' as const) : status === 409 ? ('conflict' as const) : ('offline' as const);
});
const mockBack = jest.fn();
const mockGET = jest.fn(async (path: string, init?: { params?: { query?: { day?: string; from?: string; slot?: string } } }) => {
  const query = init?.params?.query;
  if (path === '/v1/meals') return ok(query?.day === undefined ? mockHistory : mockToday);
  if (path === '/v1/foods/frequent') return Array.isArray(mockUsual) ? ok(mockUsual) : mockUsual;
  if (path === '/v1/foods/recent') return Array.isArray(mockRecent) ? ok(mockRecent) : mockRecent;
  if (path === '/v1/foods/favorites') return ok(mockFavorites);
  return refused(404);
});
const mockPUT = jest.fn(async (_path: string, _init?: unknown) => ({ response: new Response(null, { status: 204 }) }));
const mockDELETE = jest.fn(async (_path: string, _init?: unknown) => ({ response: new Response(null, { status: 204 }) }));
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
jest.mock('expo-router', () => ({ router: { back: () => mockBack(), push: jest.fn(), dismissTo: jest.fn() }, useLocalSearchParams: () => ({}) }));
const mockServices = {
  api: { GET: mockGET, POST: jest.fn(async () => refused(404)), PUT: mockPUT, DELETE: mockDELETE },
  queue: { record: mockRecord, drain: jest.fn(async () => {}) },
  takeBack: mockTakeBack,
  consents: { granted: async () => mockGranted, remember: jest.fn(async () => {}) },
  mealRecords: async () => mockLocal,
  // The same read the app does: the server's recent foods, the meal's own first.
  recentFoods: async (slot: Schemas['MealSlot']) => {
    const answer = await mockGET('/v1/foods/recent', { params: { query: { slot } } });
    return 'data' in answer && Array.isArray(answer.data) ? (answer.data as Schemas['Suggestion'][]) : [];
  },
  forgetRecord: jest.fn(async () => {}),
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => 'METRIC' }));

beforeAll(() => {
  // Tuesday 29 Sep 2026, 13:00 on the phone: lunch.
  jest.useFakeTimers({
    now: new Date(2026, 8, 29, 13, 0),
    doNotFake: ['hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
  });
});
afterAll(() => jest.useRealTimers());

const alerted = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
beforeEach(() => {
  jest.clearAllMocks();
  alerted.mockClear();
  mockGranted = true;
  mockLocal = [];
  mockHistory = [YESTERDAY_LUNCH, YESTERDAY_DINNER];
  mockToday = [];
  mockUsual = [];
  mockRecent = [YOGURT, BANANA, OATS];
  mockFavorites = [];
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <WithSaved>
        <MealScreen />
      </WithSaved>
    </ThemeProvider>,
  );
  await act(async () => {});
}
const press = async (name: string | RegExp) => {
  await fireEvent.press(screen.getByRole('button', { name }));
  await act(async () => {});
};
const againLabel = (slot: Schemas['MealSlot'] = 'LUNCH', items = 'Chicken rice bowl') => t('meal.again.spoken', { slot: t(`food.slot.${slot}`).toLowerCase(), items });
const logName = (name: string) => t('food.suggestions.log', { name });
/** A food of the recent list is in Recent only when the meal's own history has it. */
const eatenAtLunch = (...foods: Schemas['Suggestion'][]): Schemas['Meal'] => ({
  ...YESTERDAY_LUNCH,
  id: 'm-hist',
  clientId: 'c-hist',
  eatenAt: at(27, 12),
  items: foods.map((food) => item(food.foodId, food.name, 'g', 1, [100, 120])),
});

describe("a past meal of this meal as one row (\"Same as yesterday's lunch\")", () => {
  test("yesterday's lunch, its foods and one calorie number; one tap logs it again as it was, and the screen stays open", async () => {
    await show();
    expect(screen.getByText(t('meal.again.yesterday', { slot: t('food.slot.LUNCH').toLowerCase() }))).toBeOnTheScreen();
    expect(screen.getByText('Chicken rice bowl')).toBeOnTheScreen();
    expect(screen.getByText(single(610, 720))).toBeOnTheScreen();

    await press(againLabel());

    expect(mockRecord).toHaveBeenCalledWith({
      kind: 'meal',
      body: { clientId: expect.any(String), eatenAt: expect.any(String), slot: 'LUNCH', repeatOf: 'm-lunch' },
    });
    expect(mockBack).not.toHaveBeenCalled();
    expect(screen.getByText(t('meal.toast.added'))).toBeOnTheScreen();
    expect(within(screen.getByTestId('tray')).getByText('Chicken rice bowl')).toBeOnTheScreen();
  });

  test('a meal that is not from yesterday says its day', async () => {
    mockHistory = [THREE_DAYS_AGO_LUNCH];
    await show();
    expect(screen.getByText(t('meal.again.other', { slot: t('food.slot.LUNCH').toLowerCase(), day: 'Sat, Sep 26' }))).toBeOnTheScreen();
  });

  test('only the meal being logged: the dinner of yesterday is not offered at lunch', async () => {
    await show();
    expect(screen.queryByRole('button', { name: againLabel('DINNER') })).toBeNull();
  });

  test('changing the meal changes the offer', async () => {
    await show();
    await press(/^Dinner/);
    expect(screen.getByRole('button', { name: againLabel('DINNER') })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: againLabel('LUNCH') })).toBeNull();
  });

  test('a meal that already holds something today does not offer it: the row is for an empty meal', async () => {
    mockToday = [{ ...YESTERDAY_LUNCH, id: 'today-lunch', clientId: 'c-today', eatenAt: at(29, 9) }];
    await show();
    expect(screen.queryByRole('button', { name: againLabel() })).toBeNull();
  });

  test('every log of that day and meal is one meal to log again: one record each, one Undo for all', async () => {
    const second: Schemas['Meal'] = { ...YESTERDAY_LUNCH, id: 'm-lunch-2', clientId: 'c-lunch-2', eatenAt: at(28, 13), items: [item('f2', 'Apple', 'g', 150, [70, 90])], kcal: R(70, 90) };
    mockHistory = [YESTERDAY_LUNCH, second];
    await show();
    await press(againLabel('LUNCH', 'Chicken rice bowl; Apple').replace('Chicken rice bowl; Apple', 'Apple; Chicken rice bowl'));
    expect(mockRecord.mock.calls.map(([record]) => (record as { body: { repeatOf: string } }).body.repeatOf).sort()).toEqual(['m-lunch', 'm-lunch-2']);
    await press(t('undoBanner.undo'));
    expect(mockTakeBack).toHaveBeenCalledTimes(2);
  });

  test('the first day has nothing: nothing is offered', async () => {
    mockHistory = [];
    mockRecent = [];
    await show();
    expect(screen.queryByTestId('browse')).toBeNull();
    expect(screen.queryByText(t('meal.home.recent'))).toBeNull();
    expect(screen.getByLabelText(t('meal.search.label'))).toBeOnTheScreen();
    // Evre 7 final walk: below Quick add / Create food the sheet was blank; now one line says how to start.
    expect(screen.getByTestId('browse-empty')).toBeOnTheScreen();
    expect(screen.getByText(t('meal.home.empty'))).toBeOnTheScreen();
  });

  test('two taps at once log one meal', async () => {
    await show();
    const button = screen.getByRole('button', { name: againLabel() });
    await act(async () => {
      void fireEvent.press(button);
      void fireEvent.press(button);
    });
    expect(mockRecord).toHaveBeenCalledTimes(1);
  });
});

describe('usually at this meal, and recent', () => {
  test('"Usually at lunch" asks the server for the meal and lists its answer, most often first; the plus logs one', async () => {
    mockUsual = [YOGURT, BANANA];
    await show();
    expect(mockGET).toHaveBeenCalledWith('/v1/foods/frequent', { params: { query: { slot: 'LUNCH' } } });
    expect(screen.getByText(t('meal.home.usual', { slot: t('food.slot.LUNCH').toLowerCase() }))).toBeOnTheScreen();
    const rows = within(screen.getByTestId('browse-usual')).getAllByRole('button', { name: /^Log / });
    expect(rows.map((row) => row.props.accessibilityLabel)).toEqual([logName('Greek yogurt'), logName('Banana')]);

    await press(logName('Greek yogurt'));

    expect(mockRecord).toHaveBeenCalledWith({
      kind: 'meal',
      body: {
        clientId: expect.any(String),
        eatenAt: expect.any(String),
        slot: 'LUNCH',
        items: [{ foodId: 'fdc-yogurt', amount: { quantity: 170, unit: 'g', certainty: 'ESTIMATED' } }],
      },
    });
    expect(mockBack).not.toHaveBeenCalled();
  });

  test('it really follows the meal: another meal asks again and shows its own foods, never the first meal\'s under the new name', async () => {
    mockUsual = [YOGURT];
    await show();
    mockUsual = [OATS];
    await press(/^Snack/);
    expect(mockGET).toHaveBeenCalledWith('/v1/foods/frequent', { params: { query: { slot: 'SNACK' } } });
    expect(screen.getByText(t('meal.home.usual', { slot: t('food.slot.SNACK').toLowerCase() }))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: logName('Greek yogurt') })).toBeNull();
    expect(screen.getByRole('button', { name: logName('Oats') })).toBeOnTheScreen();
  });

  test('a meal nobody ate in has no "Usually at" section at all', async () => {
    mockUsual = [];
    await show();
    expect(screen.queryByText(t('meal.home.usual', { slot: t('food.slot.LUNCH').toLowerCase() }))).toBeNull();
  });

  test("Recent is the meal's own: a food last had at breakfast is not under Snack", async () => {
    mockHistory = [{ ...eatenAtLunch(YOGURT), slot: 'BREAKFAST' }, { ...eatenAtLunch(BANANA), id: 'm-snack', clientId: 'c-snack', slot: 'SNACK' }];
    mockRecent = [YOGURT, BANANA];
    await show();
    await press(/^Snack/);
    const recent = within(screen.getByTestId('browse-recent'));
    expect(recent.getByRole('button', { name: logName('Banana') })).toBeOnTheScreen();
    expect(recent.queryByRole('button', { name: logName('Greek yogurt') })).toBeNull();
  });

  test('a food is in the highest section it belongs to, once: the usual one is not Recent again', async () => {
    mockHistory = [eatenAtLunch(YOGURT, BANANA)];
    mockUsual = [YOGURT];
    mockRecent = [YOGURT, BANANA];
    await show();
    expect(screen.getAllByRole('button', { name: logName('Greek yogurt') })).toHaveLength(1);
    expect(within(screen.getByTestId('browse-recent')).getByRole('button', { name: logName('Banana') })).toBeOnTheScreen();
  });

  test('a row says its amount, one calorie number and the macros as marks; a row opens the portion step in the amount of its last time instead of logging', async () => {
    mockHistory = [eatenAtLunch(YOGURT)];
    await show();
    const row = within(screen.getByTestId('recent-fdc-yogurt'));
    expect(row.getByText('170 g')).toBeOnTheScreen();
    expect(screen.getByTestId('recent-fdc-yogurt-kcal')).toHaveTextContent(single(150, 170));
    expect(row.getByText('P 16')).toBeOnTheScreen();
    expect(row.getByText('C 12')).toBeOnTheScreen();
    expect(row.getByText('F 3')).toBeOnTheScreen();

    await press(t('meal.search.add', { name: 'Greek yogurt' }));
    expect(mockRecord).not.toHaveBeenCalled();
    expect(screen.getByLabelText(t('meal.item.amount', { name: 'Greek yogurt' })).props.value).toBe('170');
  });

  test('a few first, the rest on "Show more", never more than quick_recent_max', async () => {
    const many = Array.from({ length: 14 }, (_, i) => ({ ...YOGURT, foodId: `fdc-${i}`, name: `Food ${i}` }));
    mockHistory = [eatenAtLunch(...many)];
    mockRecent = many;
    await show();
    expect(screen.getAllByRole('button', { name: /^Log Food / })).toHaveLength(foodParams.browseRecentMax);
    await press(t('meal.home.showMore'));
    expect(screen.getAllByRole('button', { name: /^Log Food / })).toHaveLength(foodParams.quickRecentMax);
  });

  test('a recent list read from an older server (no carbs, no fat) shows protein alone, never zeros', async () => {
    mockHistory = [eatenAtLunch(YOGURT)];
    mockRecent = [{ ...YOGURT, carbsG: undefined, fatG: undefined } as Schemas['Suggestion']];
    await show();
    const row = within(screen.getByTestId('recent-fdc-yogurt'));
    expect(row.getByText('P 16')).toBeOnTheScreen();
    expect(row.queryByText(/^C /)).toBeNull();
  });

  test('one number, in a neutral colour: no word or colour that judges the number (ADR-090 #5, U7)', async () => {
    mockHistory = [eatenAtLunch(YOGURT)];
    await show();
    expect(screen.queryByText(/over|under|good|bad|too (much|many)/i)).toBeNull();
    const kcal = screen.getByTestId('recent-fdc-yogurt-kcal');
    expect(kcal).not.toHaveStyle({ color: '#D12F1F' });
  });

  test('a serving whose name starts with its count is said once: "1 medium", "2 × 1 medium"; a named one keeps its quantity', async () => {
    const potato = (quantity: number, unit: string) => ({ ...sug('fdc-potato', 'Potato, baked', quantity, unit, [150, 170], [3, 5]) });
    mockHistory = [eatenAtLunch(potato(1, '1 medium'))];
    mockRecent = [potato(2, '1 medium'), sug('a', 'Bowl', 1, 'bowl', [610, 720], [40, 50])];
    mockHistory = [eatenAtLunch(potato(1, '1 medium'), sug('a', 'Bowl', 1, 'bowl', [610, 720], [40, 50]))];
    await show();
    expect(screen.getByText('2 × 1 medium')).toBeOnTheScreen();
    expect(screen.getByText('1 bowl')).toBeOnTheScreen();
    expect(screen.queryByText(/1 1 medium/)).toBeNull();
  });
});

describe('Favorites and the heart', () => {
  test('a favorite is a row with a filled heart and its portion; the plus logs it and the heart takes it out', async () => {
    mockFavorites = [FAVORITE];
    await show();
    expect(screen.getByText(t('meal.home.favorites'))).toBeOnTheScreen();
    const row = within(screen.getByTestId('fav-fdc-egg'));
    expect(row.getByText('1 large')).toBeOnTheScreen();
    expect(screen.getByTestId('fav-fdc-egg-kcal')).toHaveTextContent('72 kcal');

    await press(t('meal.search.logNow', { name: 'Egg, whole' }));
    expect(mockRecord).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ items: [{ foodId: 'fdc-egg', amount: { quantity: 1, unit: '1 large', certainty: 'ESTIMATED' } }] }) }));

    mockFavorites = [];
    await press(t('meal.favorite.remove', { name: 'Egg, whole' }));
    expect(mockDELETE).toHaveBeenCalledWith('/v1/foods/{id}/favorite', { params: { path: { id: 'fdc-egg' } } });
    expect(screen.queryByTestId('fav-fdc-egg')).toBeNull();
  });

  test('a heart on a recent food stars it at once (before the server answers) and puts it under Favorites', async () => {
    mockHistory = [eatenAtLunch(YOGURT)];
    let release: () => void = () => {};
    mockPUT.mockImplementationOnce(() => new Promise((resolve) => (release = () => resolve({ response: new Response(null, { status: 204 }) }))));
    await show();
    await fireEvent.press(screen.getByRole('button', { name: t('meal.favorite.add', { name: 'Greek yogurt' }) }));
    await act(async () => {});
    expect(screen.getByRole('button', { name: t('meal.favorite.remove', { name: 'Greek yogurt' }) })).toBeOnTheScreen();
    mockFavorites = [{ ...FAVORITE, id: 'fdc-yogurt', name: 'Greek yogurt' }];
    await act(async () => release());
    expect(mockPUT).toHaveBeenCalledWith('/v1/foods/{id}/favorite', { params: { path: { id: 'fdc-yogurt' } } });
    expect(screen.getByTestId('fav-fdc-yogurt')).toBeOnTheScreen();
  });

  test('a heart the server did not take goes back', async () => {
    mockHistory = [eatenAtLunch(YOGURT)];
    mockPUT.mockResolvedValueOnce({ response: new Response(null, { status: 500 }) });
    await show();
    await press(t('meal.favorite.add', { name: 'Greek yogurt' }));
    expect(screen.getByRole('button', { name: t('meal.favorite.add', { name: 'Greek yogurt' }) })).toBeOnTheScreen();
  });

  test('with none, one short line says how to get one (the heart), while there is something else on offer', async () => {
    mockHistory = [eatenAtLunch(YOGURT)];
    await show();
    expect(screen.getByTestId('favorites-empty')).toBeOnTheScreen();
    expect(screen.getByText(t('meal.home.favoritesEmpty'))).toBeOnTheScreen();
  });

  test('more than four are four and "Show all"', async () => {
    mockFavorites = Array.from({ length: 6 }, (_, i) => ({ ...FAVORITE, id: `fav-${i}`, name: `Favorite ${i}` }));
    await show();
    expect(within(screen.getByTestId('browse-favorites')).getAllByRole('button', { name: /^Log Favorite / })).toHaveLength(foodParams.browseFavoritesMax);
    await press(t('meal.home.showAll', { count: 6 }));
    expect(within(screen.getByTestId('browse-favorites')).getAllByRole('button', { name: /^Log Favorite / })).toHaveLength(6);
  });
});

describe('logged: the light confirmation, with Undo (K-1029, K-1044)', () => {
  const clientIdOfLast = () => (mockRecord.mock.calls.at(-1)?.[0] as { body: { clientId: string } }).body.clientId;
  beforeEach(() => {
    mockHistory = [eatenAtLunch(YOGURT)];
  });

  test('a recent food: the screen stays, the confirmation says Added with the food, the plus shows a check, the tray has it', async () => {
    await show();
    await press(logName('Greek yogurt'));
    expect(mockBack).not.toHaveBeenCalled();
    expect(screen.getByText(t('meal.toast.added'))).toBeOnTheScreen();
    expect(within(banner() as never).getByText('Greek yogurt')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('meal.row.added') })).toBeOnTheScreen();
    expect(within(screen.getByTestId('tray')).getByText('Greek yogurt')).toBeOnTheScreen();
    expect(undoButton()).toBeOnTheScreen();
  });

  test('the confirmation never covers the primary: it stands in the column above Done, not over the list', async () => {
    await show();
    await press(logName('Greek yogurt'));
    expect(banner()).toHaveStyle({ position: 'relative' });
    expect(screen.getByRole('button', { name: /^Done/ })).toBeOnTheScreen();
  });

  test('Undo takes the food back through the existing delete (by the clientId it was logged with), the banner goes and the tray is empty again', async () => {
    await show();
    await press(logName('Greek yogurt'));
    const logged = clientIdOfLast();
    mockLocal = [];
    await press(t('undoBanner.undo'));

    expect(mockTakeBack).toHaveBeenCalledWith(logged, expect.any(Function));
    expect(mockServices.api.DELETE).toHaveBeenCalledWith('/v1/meals/{id}', { params: { path: { id: 'srv-meal-1' } } });
    expect(banner()).toBeNull();
    expect(within(screen.getByTestId('tray')).queryByText('Greek yogurt')).toBeNull();
  });

  test('a food logged again after Undo is a new meal (a new clientId)', async () => {
    await show();
    await press(logName('Greek yogurt'));
    const first = clientIdOfLast();
    await press(t('undoBanner.undo'));
    await press(logName('Greek yogurt'));
    expect(clientIdOfLast()).not.toBe(first);
  });

  test('offline: Undo says so in an alert, changes nothing, and the banner is back to try again', async () => {
    mockTakeBack.mockResolvedValueOnce('offline');
    await show();
    await press(logName('Greek yogurt'));
    await press(t('undoBanner.undo'));
    expect(alerted).toHaveBeenCalledWith(t('meal.quick.undoOffline'));
  });

  test('a refused delete says it could not be taken back', async () => {
    mockTakeBack.mockResolvedValueOnce('conflict');
    await show();
    await press(logName('Greek yogurt'));
    await press(t('undoBanner.undo'));
    expect(alerted).toHaveBeenCalledWith(t('meal.quick.undoFailed'));
  });

  test('it is said aloud (VoiceOver): the banner says the save, the take-back says itself', async () => {
    const { AccessibilityInfo } = jest.requireActual<typeof import('react-native')>('react-native');
    const announced = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    await show();
    await press(logName('Greek yogurt'));
    expect(announced).toHaveBeenCalledWith(t('undoBanner.announceLead', { lead: t('meal.toast.added'), detail: 'Greek yogurt' }));
  });

  test('trying a food again after a failure is the same meal: one clientId; another food after a failure is a new one', async () => {
    mockRecord.mockRejectedValueOnce(Object.assign(new Error('disk'), { name: 'StoreFailed' }));
    mockRecent = [YOGURT, BANANA];
    mockHistory = [eatenAtLunch(YOGURT, BANANA)];
    await show();
    await press(logName('Greek yogurt'));
    expect(screen.getByText(t('food.repeat.failed'))).toBeOnTheScreen();
    expect(banner()).toBeNull();
    await press(logName('Greek yogurt'));
    await press(logName('Banana'));
    const ids = mockRecord.mock.calls.map(([record]) => (record as { body: { clientId: string } }).body.clientId);
    expect(ids).toHaveLength(3);
    expect(ids[1]).toBe(ids[0]);
    expect(ids[2]).not.toBe(ids[0]);
  });

  test('the same failure twice is said twice (K-815)', async () => {
    const { AccessibilityInfo } = jest.requireActual<typeof import('react-native')>('react-native');
    const announced = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    const failure = Object.assign(new Error('disk'), { name: 'StoreFailed' });
    mockRecord.mockRejectedValueOnce(failure).mockRejectedValueOnce(failure);
    await show();
    await press(logName('Greek yogurt'));
    await press(logName('Greek yogurt'));
    expect(announced.mock.calls.filter(([words]) => words === t('food.repeat.failed'))).toHaveLength(2);
  });
});

describe('where it is not shown', () => {
  test('unread (offline, a server that did not answer): the search alone, no error', async () => {
    mockHistory = [];
    mockRecent = refused(500);
    mockUsual = refused(500);
    await show();
    expect(screen.queryByTestId('browse')).toBeNull();
    expect(screen.getByLabelText(t('meal.search.label'))).toBeOnTheScreen();
  });

  test('without the health data consent: the consent first, nothing offered', async () => {
    mockGranted = false;
    await show();
    expect(screen.getByText(t('consent.health_data.points.collected'))).toBeOnTheScreen();
    expect(screen.queryByTestId('browse')).toBeNull();
  });

  test('once something is typed, the offers step aside for the results', async () => {
    mockHistory = [eatenAtLunch(YOGURT)];
    mockServices.api.POST.mockResolvedValueOnce(ok([{ id: 'fdc-3', name: 'Rice, white, cooked', per100g: { kcal: R(120, 140), proteinG: R(2, 3), carbsG: R(26, 30), fatG: R(0, 1) } }]) as never);
    await show();
    expect(screen.getByTestId('browse')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText(t('meal.search.label')), 'rice');
    await act(async () => fireEvent(screen.getByLabelText(t('meal.search.label')), 'submitEditing'));
    expect(screen.queryByTestId('browse')).toBeNull();
    expect(screen.getByRole('button', { name: t('meal.search.add', { name: 'Rice, white, cooked' }) })).toBeOnTheScreen();
  });
});
