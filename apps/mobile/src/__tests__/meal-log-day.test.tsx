/**
 * Logging food on the meal screen with the least filling in (K-1063, ADR-090 Ek 3): into the day asked for (a past one too), on the
 * slots of the user's own day, from Recent, Frequent, Favorites or a past meal to log again, with a star on a food, a quick add of
 * calories, and a food of one's own — each a tap or two.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

import MealScreen from '@/app/meal';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { foodParams } from '@/food/params';
import { ThemeProvider } from '@/theme/theme';

import { WithSaved, banner } from './support/saved';

type Schemas = components['schemas'];
type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown, status = 200): Answer => ({ data, response: new Response(null, { status }) });
const refused = (status: number): Answer => ({ error: { code: 'X', message: 'x' }, response: new Response(null, { status }) });
const R = (low: number, high: number) => ({ low, high });

const EGG: Schemas['Food'] = {
  id: 'fdc-egg',
  name: 'Egg, whole',
  per100g: { kcal: R(130, 160), proteinG: R(12, 14), carbsG: R(0, 1), fatG: R(9, 11) },
  portions: [
    { unit: '1 large', label: '1 large', kind: 'PIECE', grams: 50, kcal: 72, proteinG: 6.3, carbsG: 0.4, fatG: 4.8 },
    { unit: 'g', label: 'g', kind: 'WEIGHT', grams: 1, kcal: 1.44, proteinG: 0.126, carbsG: 0.008, fatG: 0.096 },
  ],
  defaultAmount: { quantity: 1, unit: '1 large' },
};
const OATS: Schemas['Suggestion'] = { foodId: 'fdc-oats', name: 'Oats', amount: { quantity: 60, unit: 'g' }, kcal: R(220, 240), proteinG: R(7, 9) };
const RICE: Schemas['Suggestion'] = { foodId: 'fdc-rice', name: 'Rice', amount: { quantity: 150, unit: 'g' }, kcal: R(180, 200), proteinG: R(3, 4) };
const meal = (id: string, daysAgo: number, slot: Schemas['MealSlot'], name: string): Schemas['Meal'] => ({
  id,
  clientId: `c-${id}`,
  eatenAt: new Date(2026, 8, 29 - daysAgo, 12, 0).toISOString(),
  slot,
  items: [{ foodId: `f-${name}`, name, amount: { quantity: 1, unit: 'bowl' }, kcal: R(300, 340), proteinG: R(10, 14) }],
  kcal: R(300, 340),
  proteinG: R(10, 14),
});

let mockParams: Record<string, string> = {};
let mockHistory: Schemas['Meal'][] = [];
let mockFrequent: Schemas['Suggestion'][] = [];
let mockFavorites: Schemas['Food'][] = [];
let mockLocal: unknown[] = [];
const mockRecord = jest.fn(async (record: unknown) => {
  const { body } = record as { body: { clientId: string } };
  mockLocal.push({ seq: mockLocal.length, clientId: body.clientId, kind: 'meal', parentClientId: null, body, state: 'PENDING', serverId: null, serverBody: null, errorCode: null });
  return true;
});
const mockBack = jest.fn();
const mockGET = jest.fn(async (path: string, init?: { params?: { query?: { day?: string } } }) => {
  if (path === '/v1/meals') return ok(init?.params?.query?.day === undefined ? mockHistory : []);
  if (path === '/v1/foods/frequent') return ok(mockFrequent);
  if (path === '/v1/foods/favorites') return ok(mockFavorites);
  if (path === '/v1/foods/recent') return ok([OATS]);
  if (path === '/v1/foods/{id}') return ok(EGG);
  return refused(404);
});
const mockPUT = jest.fn(async (_path: string, _init?: unknown) => ({ response: new Response(null, { status: 204 }) }));
const mockDELETE = jest.fn(async (_path: string, _init?: unknown) => ({ response: new Response(null, { status: 204 }) }));
const mockPOST = jest.fn(async (path: string, _init?: unknown) => {
  if (path === '/v1/foods/search') return ok([EGG]);
  if (path === '/v1/food-estimates') return ok({ items: [], kcal: R(1, 2), proteinG: R(0, 1) });
  return refused(404);
});
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
jest.mock('expo-router', () => ({ router: { back: () => mockBack(), push: jest.fn(), dismissTo: jest.fn() }, useLocalSearchParams: () => mockParams }));
const mockServices = {
  api: { GET: mockGET, POST: mockPOST, PUT: mockPUT, DELETE: mockDELETE },
  queue: { record: mockRecord, drain: jest.fn(async () => {}) },
  mealRecords: async () => mockLocal,
  takeBack: jest.fn(),
  consents: { granted: async () => true, remember: jest.fn() },
  mealStart: async () => ({ offers: [] }),
  recentFoods: async () => [OATS],
  forgetRecord: jest.fn(),
  report: jest.fn(),
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
  mockParams = {};
  mockLocal = [];
  mockHistory = [];
  mockFrequent = [RICE];
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
const search = async (text: string) => {
  await fireEvent.changeText(screen.getByLabelText(t('meal.search.label')), text);
  await act(async () => fireEvent(screen.getByLabelText(t('meal.search.label')), 'submitEditing'));
};
const lastMeal = () => (mockRecord.mock.calls.at(-1)?.[0] as { body: Record<string, unknown> }).body;

describe('into a day', () => {
  test('a past day: the tray says so, and a meal is given that day, at the slot\'s usual hour; the screen stays open', async () => {
    mockParams = { day: '2026-09-25' };
    await show();
    expect(screen.getByText(t('meal.tray.title', { slot: t('food.slot.LUNCH'), day: 'Fri, Sep 25' }))).toBeOnTheScreen();
    await press(t('food.suggestions.log', { name: 'Rice' }));
    expect(lastMeal()).toMatchObject({ slot: 'LUNCH', eatenAt: new Date(2026, 8, 25, foodParams.pastDaySlotHours.LUNCH).toISOString() });
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockGET).toHaveBeenCalledWith('/v1/meals', { params: { query: { day: '2026-09-25' } } });
  });

  test('today is the default and says Today; a meal is given the moment it is logged', async () => {
    await show();
    expect(screen.getByText(t('meal.tray.title', { slot: t('food.slot.LUNCH'), day: t('food.day.today') }))).toBeOnTheScreen();
    await press(t('food.suggestions.log', { name: 'Rice' }));
    expect(lastMeal()).toMatchObject({ eatenAt: new Date(2026, 8, 29, 13, 0).toISOString() });
  });

  test('the slot asked for is the slot chosen', async () => {
    mockParams = { day: '2026-09-29', slot: 'DINNER' };
    await show();
    expect(screen.getByTestId('slot-DINNER')).toBeSelected();
  });

  test('a food from the portion step is given the day too', async () => {
    mockParams = { day: '2026-09-25', slot: 'BREAKFAST' };
    await show();
    await search('egg');
    await press(t('meal.search.add', { name: EGG.name }));
    await press(/^Add to /);
    expect(lastMeal()).toMatchObject({
      slot: 'BREAKFAST',
      eatenAt: new Date(2026, 8, 25, foodParams.pastDaySlotHours.BREAKFAST).toISOString(),
      items: [{ foodId: 'fdc-egg', amount: { quantity: 1, unit: '1 large', certainty: 'ESTIMATED' } }],
    });
  });

  test('a past day is offered the meals of other days, never its own', async () => {
    mockParams = { day: '2026-09-28' };
    mockHistory = [meal('a', 1, 'LUNCH', 'Chicken bowl'), meal('b', 2, 'LUNCH', 'Rice bowl')];
    await show();
    expect(screen.queryByRole('button', { name: t('meal.again.spoken', { slot: t('food.slot.LUNCH').toLowerCase(), items: 'Chicken bowl' }) })).toBeNull();
    expect(screen.getByRole('button', { name: t('meal.again.spoken', { slot: t('food.slot.LUNCH').toLowerCase(), items: 'Rice bowl' }) })).toBeOnTheScreen();
  });
});

describe('the meals of the user\'s own day', () => {
  // K1 (Evre 7 A): the slots shown followed the user's pattern ("three meals a day sees three" and an "Other" chip); the four meals are one
  // segmented control now, always whole, and the pattern chooses which one is open.
  test('all four are always there, with no "Other"', async () => {
    await show();
    for (const slot of ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as const) expect(screen.getByTestId(`slot-${slot}`)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('meal.slots.moreSpoken') })).toBeNull();
  });

  test('the pattern chooses the open meal: someone who has lunch at 15:00 gets Lunch at 14:30, where the clock says Dinner is after 16', async () => {
    const at = (day: number, hour: number, minute: number): string => new Date(2026, 8, day, hour, minute).toISOString();
    mockHistory = [28, 27, 26].map((day) => ({ ...meal(`l${day}`, 29 - day, 'LUNCH', 'Rice'), eatenAt: at(day, 15, 0) }));
    jest.setSystemTime(new Date(2026, 8, 29, 14, 30));
    try {
      await show();
      expect(screen.getByTestId('slot-LUNCH')).toBeSelected();
    } finally {
      jest.setSystemTime(new Date(2026, 8, 29, 13, 0));
    }
  });

  test('the clock chooses without a pattern', async () => {
    jest.setSystemTime(new Date(2026, 8, 29, 18, 0));
    try {
      await show();
      expect(screen.getByTestId('slot-DINNER')).toBeSelected();
    } finally {
      jest.setSystemTime(new Date(2026, 8, 29, 13, 0));
    }
  });

  test('each meal shows what it holds on the day, as one number', async () => {
    mockLocal = [];
    await show();
    await press(t('food.suggestions.log', { name: 'Rice' }));
    expect(screen.getByRole('button', { name: t('meal.picker.spoken', { slot: t('food.slot.LUNCH'), kcal: t('food.single.kcal', { value: 190 }) }) })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('meal.picker.spokenEmpty', { slot: t('food.slot.DINNER') }) })).toBeOnTheScreen();
  });

  test('a meal with nothing in it shows its name and nothing else, no dash (Evre 7)', async () => {
    mockLocal = [];
    await show();
    const dinner = screen.getByTestId('slot-DINNER');
    expect(within(dinner).queryByText('-')).toBeNull();
    expect(within(dinner).getAllByText(/./)).toHaveLength(1);
  });
});

describe('what can be logged without typing', () => {
  test('Usually at lunch: the most logged foods in their usual amount, the plus logs one', async () => {
    await show();
    expect(screen.getByText(t('meal.home.usual', { slot: t('food.slot.LUNCH').toLowerCase() }))).toBeOnTheScreen();
    expect(screen.getByText('Rice')).toBeOnTheScreen();
    await press(t('food.suggestions.log', { name: 'Rice' }));
    expect(lastMeal()).toMatchObject({ items: [{ foodId: 'fdc-rice', amount: { quantity: 150, unit: 'g' } }] });
  });

  test('Favorites: the starred foods with their portion and numbers; the row opens the portion step', async () => {
    mockFavorites = [EGG];
    await show();
    expect(screen.getByText('1 large')).toBeOnTheScreen();
    expect(screen.getByTestId('fav-fdc-egg-kcal')).toHaveTextContent('72 kcal');
    await press(t('meal.search.add', { name: EGG.name }));
    expect(screen.getByLabelText(t('meal.item.amount', { name: EGG.name })).props.value).toBe('1');
    expect(screen.getByTestId('numbers-0')).toHaveTextContent('72');
  });

  test('Favorites with none says how to get one: one short line, not a dead tab', async () => {
    await show();
    expect(screen.getByText(t('meal.home.favoritesEmpty'))).toBeOnTheScreen();
  });

  test('Log again: the freshest past meal of the meal, one of each kind, one tap into the slot and day', async () => {
    mockHistory = [meal('a', 1, 'LUNCH', 'Chicken bowl'), meal('b', 2, 'LUNCH', 'Chicken bowl'), meal('c', 3, 'DINNER', 'Soup')];
    await show();
    expect(screen.getAllByText(/Chicken bowl/)).toHaveLength(1);
    await press(/^Dinner/);
    await press(t('meal.again.spoken', { slot: t('food.slot.DINNER').toLowerCase(), items: 'Soup' }));
    expect(lastMeal()).toMatchObject({ repeatOf: 'c', slot: 'DINNER' });
    expect(screen.getByText(t('meal.toast.added'))).toBeOnTheScreen();
    expect(banner()).toBeOnTheScreen();
  });
});

describe('the plus of a past meal (Evre 7, issue 684: "I press the plus on Log again and it never logs")', () => {
  test('the plus at the end of the row logs the meal, as the row does: the plus is part of the row, not a picture beside it', async () => {
    mockHistory = [meal('a', 1, 'LUNCH', 'Chicken bowl')];
    await show();
    await fireEvent.press(screen.getByTestId('again-2026-09-28-log'));
    await act(async () => {});
    expect(lastMeal()).toMatchObject({ repeatOf: 'a' });
    expect(mockRecord).toHaveBeenCalledTimes(1);
    expect(mockBack).not.toHaveBeenCalled();
    expect(banner()).toBeOnTheScreen();
  });
});

describe('a heart on a food in the portion step', () => {
  test('a food can be hearted and unhearted; the server is told, and the heart follows its answer', async () => {
    await show();
    await search('egg');
    await press(t('meal.search.add', { name: EGG.name }));
    expect(screen.getByTestId('favorite-0')).toBeOnTheScreen();
    mockFavorites = [EGG];
    await press(t('meal.favorite.add', { name: EGG.name }));
    expect(mockPUT).toHaveBeenCalledWith('/v1/foods/{id}/favorite', { params: { path: { id: 'fdc-egg' } } });
    expect(within(screen.getByTestId('portion-sheet')).getByRole('button', { name: t('meal.favorite.remove', { name: EGG.name }) })).toBeSelected();
    mockFavorites = [];
    await fireEvent.press(within(screen.getByTestId('portion-sheet')).getByRole('button', { name: t('meal.favorite.remove', { name: EGG.name }) }));
    await act(async () => {});
    expect(mockDELETE).toHaveBeenCalledWith('/v1/foods/{id}/favorite', { params: { path: { id: 'fdc-egg' } } });
    expect(within(screen.getByTestId('portion-sheet')).getByRole('button', { name: t('meal.favorite.add', { name: EGG.name }) })).not.toBeSelected();
  });
});

describe('quick add', () => {
  test('calories, and the macros if known: one item, no food behind it, logged as typed', async () => {
    await show();
    await press(t('meal.quickAdd.open'));
    await act(async () => fireEvent.changeText(screen.getByLabelText(t('meal.quickAdd.kcal')), '350'));
    await act(async () => fireEvent.changeText(screen.getByLabelText(t('meal.quickAdd.protein')), '25'));
    await press(/^Add to /);
    expect(lastMeal()).toMatchObject({ items: [{ foodId: 'quick', amount: { quantity: 1, unit: 'serving' }, quick: { kcal: 350, proteinG: 25 } }] });
    expect(within(screen.getByTestId('tray')).getByText(t('meal.quickAdd.name'))).toBeOnTheScreen();
  });

  test('without calories nothing can be logged: the button waits, and nothing else is locked', async () => {
    await show();
    await press(t('meal.quickAdd.open'));
    expect(screen.getByRole('button', { name: /^Add to / })).toBeDisabled();
    await act(async () => fireEvent.press(screen.getByTestId('sheet-close')));
    // K1 (Evre 7 walk finding): an empty quick add card used to lock "Log it" for the food beside it; now it is a sheet that closes.
    expect(screen.queryByTestId('portion-sheet')).toBeNull();
    expect(screen.getByLabelText(t('meal.search.label'))).toBeOnTheScreen();
  });
});

describe('a correction opened on one item', () => {
  test('the item tapped is the one open; the others are lines', async () => {
    mockParams = { edit: 'm1', day: '2026-09-29', item: '1' };
    const logged: Schemas['Meal'] = {
      ...meal('m1', 0, 'LUNCH', 'Bowl'),
      items: [
        { foodId: 'fdc-egg', name: 'Egg, whole', amount: { quantity: 2, unit: '1 large' }, kcal: R(130, 150), proteinG: R(11, 13) },
        { foodId: 'fdc-rice', name: 'Rice', amount: { quantity: 150, unit: 'g' }, kcal: R(180, 200), proteinG: R(3, 4) },
      ],
    };
    mockGET.mockImplementation(async (path: string) => {
      if (path === '/v1/meals') return ok([logged]);
      if (path === '/v1/foods/{id}') return ok(EGG);
      if (path === '/v1/foods/frequent' || path === '/v1/foods/favorites') return ok([]);
      return refused(404);
    });
    await show();
    expect(screen.getByLabelText(t('meal.item.amount', { name: 'Rice' })).props.value).toBe('150');
    expect(screen.queryByLabelText(t('meal.item.amount', { name: 'Egg, whole' }))).toBeNull();
    // The egg's food was read for its portions: tapping it opens the portion step with the 1 large chip.
    await press(t('meal.item.open', { name: 'Egg, whole' }));
    expect(screen.getByRole('button', { name: t('meal.item.unitSpoken', { name: 'Egg, whole', unit: '1 large' }) })).toBeSelected();
    // Still at the amount it was logged in: the day's own number for it (the middle of 130-150), not the portion's 72 twice.
    expect(screen.getByTestId('numbers-0')).toHaveTextContent('140');
    await press(t('meal.item.quantitySpoken', { quantity: 3 }));
    expect(screen.getByTestId('numbers-0')).toHaveTextContent('216'); // changed: the portion's numbers, three times
  });
});
