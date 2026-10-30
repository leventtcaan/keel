/**
 * The meal screen on the component system (K-1046, ADR-070 Ek 2 #1 and #5, prototype yeniden-yapim.html §7): a picked food's
 * amount is the one Stepper (typed with a comma or a dot, stepped from food.json); its units are a track of their own, not the
 * same chips as the slots (K-1063: they are portion chips inside the item's card now); Scan and Remove are words (text and
 * destructive), "Log it" is the screen's one primary; the search results and the recent foods are rows with their single kcal
 * number, opening the portion step on a press and logging at once by their plus.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import MealScreen from '@/app/meal';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { readMealStart, readRecentFoods } from '@/food/mealStart';
import { foodParams } from '@/food/params';
import { ThemeProvider } from '@/theme/theme';
import { palettes, tokens } from '@/theme/tokens';

import { WithSaved } from './support/saved';

type Schemas = components['schemas'];
type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown, status = 200): Answer => ({ data, response: new Response(null, { status }) });
const refused = (status: number, code: string): Answer => ({ error: { code, message: 'x' }, response: new Response(null, { status }) });
const R = (low: number, high: number) => ({ low, high });
const p = palettes.light;

const RICE: Schemas['Food'] = {
  id: 'fdc-3',
  name: 'Rice, white, cooked',
  per100g: { kcal: R(120, 140), proteinG: R(2, 3), carbsG: R(26, 30), fatG: R(0, 1) },
  servings: [{ name: '1 bowl', grams: 158 }],
};
const PORTIONED: Schemas['Food'] = {
  id: 'fdc-12',
  name: 'Egg, large',
  per100g: { kcal: R(130, 160), proteinG: R(12, 14), carbsG: R(0, 1), fatG: R(9, 11) },
  portions: [
    { unit: '1 large', label: '1 large', kind: 'PIECE', grams: 50, kcal: 72, proteinG: 6.3, carbsG: 0.4, fatG: 4.8 },
    { unit: 'g', label: 'g', kind: 'WEIGHT', grams: 1, kcal: 1.44, proteinG: 0.126, carbsG: 0.008, fatG: 0.096 },
    { unit: 'oz', label: 'oz', kind: 'WEIGHT', grams: 28.3495, kcal: 40.8, proteinG: 3.6, carbsG: 0.2, fatG: 2.7 },
  ],
  defaultAmount: { quantity: 1, unit: '1 large' },
};
const EGG: Schemas['Food'] = {
  id: 'fdc-9',
  name: 'Egg, whole, raw',
  brand: 'Farm',
  per100g: { kcal: R(130, 160), proteinG: R(12, 14), carbsG: R(0, 1), fatG: R(9, 11) },
};
const YOGURT: Schemas['Suggestion'] = { foodId: 'fdc-yogurt', name: 'Greek yogurt', amount: { quantity: 170, unit: 'g', certainty: 'ESTIMATED' } as never, kcal: R(150, 170), proteinG: R(15, 17) };
const YESTERDAY_LUNCH: Schemas['Meal'] = {
  id: 'm-lunch',
  clientId: 'c-lunch',
  eatenAt: new Date(2026, 8, 28, 12, 10).toISOString(),
  slot: 'LUNCH',
  items: [{ foodId: 'f1', name: 'Chicken rice bowl', amount: { quantity: 1, unit: 'bowl' } as never, kcal: R(610, 720), proteinG: R(40, 50) }],
  kcal: R(610, 720),
  proteinG: R(40, 50),
};

const estimateOf = (request: Schemas['FoodEstimateRequest']): Schemas['FoodEstimate'] => ({
  items: request.items.map((item) => ({
    foodId: item.foodId,
    name: item.foodId === RICE.id ? RICE.name : EGG.name,
    amount: item.amount,
    kcal: R(170, 240),
    proteinG: R(3, 5),
  })),
  kcal: R(380, 530),
  proteinG: R(40, 52),
});

/**
 * A server whose range for a portioned food is built around the portion's own numbers (the value's error, floor and ceiling as the
 * server does), so the number the sheet shows once the server has answered is the portion's times the quantity (one number, Evre 7).
 */
const estimateAround = (request: Schemas['FoodEstimateRequest']): Schemas['FoodEstimate'] => {
  const items = request.items.map((item) => {
    const portion = PORTIONED.portions?.find((one) => one.unit === item.amount.unit);
    if (item.foodId !== PORTIONED.id || portion === undefined) return estimateOf({ items: [item] }).items[0];
    const around = (value: number) => ({ low: Math.floor(value * item.amount.quantity * 0.9), high: Math.ceil(value * item.amount.quantity * 1.1) });
    return { foodId: item.foodId, name: PORTIONED.name, amount: item.amount, kcal: around(portion.kcal), proteinG: around(portion.proteinG), carbsG: around(portion.carbsG), fatG: around(portion.fatG) };
  });
  return { items, kcal: items[0].kcal, proteinG: items[0].proteinG };
};

jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  return { SymbolView: (props: { testID?: string }) => createElement('SymbolView', { ...props, testID: props.testID ?? 'symbol' }) };
});

let mockEdit: string | undefined;
let mockRecent: Schemas['Suggestion'][] = [];
let mockYesterday: Schemas['Meal'][] = [];
const post = async (path: string, init: { body: never }) => {
  if (path === '/v1/foods/search') return ok([RICE, EGG]);
  if (path === '/v1/food-estimates') return ok(estimateOf(init.body));
  return refused(404, 'NOT_FOUND');
};
const mockPOST = jest.fn(post);
const mockRecord = jest.fn(async (_record: unknown) => true);
const mockBack = jest.fn();
const mockGET = jest.fn(async (path: string, init?: { params?: { query?: { day?: string } } }) => {
  if (path === '/v1/meals') {
    // The range read (no day) is the last two weeks: what the past-meal row and Recent rest on.
    if (init?.params?.query?.day === undefined) return ok(mockYesterday);
    return ok(mockEdit === undefined ? [] : [EDITED]);
  }
  if (path === '/v1/foods/recent') return ok(mockRecent);
  return refused(404, 'NOT_FOUND');
});
const EDITED: Schemas['Meal'] = { ...YESTERDAY_LUNCH, id: 'm-edit', clientId: 'c-edit', eatenAt: '2026-09-29T10:10:00Z' };
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), push: jest.fn(), dismissTo: jest.fn() },
  useLocalSearchParams: () => (mockEdit === undefined ? {} : { edit: mockEdit, day: '2026-09-29' }),
}));
const mockServices = {
  api: { POST: mockPOST, GET: mockGET, PUT: jest.fn(), DELETE: jest.fn(async (_path: string, _init?: unknown) => ({ response: new Response(null, { status: 204 }) })) },
  queue: { record: mockRecord, drain: jest.fn(async () => {}) },
  mealRecords: async () => [],
  takeBack: jest.fn(),
  consents: { granted: async () => true, remember: jest.fn(async () => {}) },
  mealStart: (day: string) => readMealStart({ api: mockServices.api as never, mealRecords: async () => [] }, day),
  recentFoods: (slot: Schemas['MealSlot']) => readRecentFoods({ api: mockServices.api as never }, slot),
  forgetRecord: jest.fn(async () => {}),
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
  mockPOST.mockImplementation(post);
  mockEdit = undefined;
  mockRecent = [];
  mockYesterday = [];
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
async function search(text: string) {
  await fireEvent.changeText(screen.getByLabelText(t('meal.search.label')), text);
  await act(async () => fireEvent(screen.getByLabelText(t('meal.search.label')), 'submitEditing'));
}
async function add(food: Schemas['Food']) {
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.search.add', { name: food.name }) })));
}
const amountField = (food: Schemas['Food']) => screen.getByLabelText(t('meal.item.amount', { name: food.name }));
const typeAmount = (food: Schemas['Food'], text: string) => act(async () => fireEvent.changeText(amountField(food), text));
const estimates = () => mockPOST.mock.calls.filter(([path]) => path === '/v1/food-estimates');
const lastItems = () => (estimates().at(-1)?.[1] as { body: Schemas['FoodEstimateRequest'] }).body.items;
const flat = (node: { props: { style?: unknown } }) => (StyleSheet.flatten(node.props.style as never) ?? {}) as Record<string, unknown>;
const button = (name: string) => screen.getByRole('button', { name });
// K1 (ADR-090 #5, K-1063): single numbers where a food is logged — the middle of the server's range.
const single = (low: number, high: number) => t('food.single.kcal', { value: Math.round((low + high) / 2) });
/** The buttons drawn as the primary: the cta fill at the dock's height (a selected chip is filled with the same ink, but is not that tall). */
const primaries = () => screen.queryAllByRole('button').filter((node) => flat(node).backgroundColor === p.cta && flat(node).minHeight === tokens.size.primaryButton);

describe('the amount is the one Stepper', () => {
  test('a serving is typed with a comma or a dot, and the estimate follows', async () => {
    await show();
    await search('rice');
    await add(RICE);
    expect(amountField(RICE).props.accessibilityRole).toBe('adjustable'); // the Stepper's field, not a free text box
    await typeAmount(RICE, '1,5');
    expect(lastItems()).toEqual([{ foodId: 'fdc-3', amount: { quantity: 1.5, unit: '1 bowl', certainty: 'ESTIMATED' } }]);
    await typeAmount(RICE, '2.25');
    expect(lastItems()).toEqual([{ foodId: 'fdc-3', amount: { quantity: 2.25, unit: '1 bowl', certainty: 'ESTIMATED' } }]);
  });

  test('- and + step a serving by food.json › meal_amount_step_serving and grams by meal_amount_step_g', async () => {
    await show();
    await search('rice');
    await add(RICE);
    await act(async () => fireEvent.press(button(t('stepper.increase', { label: t('meal.item.amount', { name: RICE.name }) }))));
    expect(lastItems()[0].amount.quantity).toBe(1 + foodParams.amountStepServing);
    await act(async () => fireEvent.press(button(t('meal.item.unitSpoken', { name: RICE.name, unit: t('meal.item.grams') }))));
    await typeAmount(RICE, String(foodParams.defaultGrams));
    await act(async () => fireEvent.press(button(t('stepper.decrease', { label: t('meal.item.amount', { name: RICE.name }) }))));
    expect(lastItems()[0].amount).toMatchObject({ quantity: foodParams.defaultGrams - foodParams.amountStepG, unit: 'g' });
  });

  test('a food comes in with the amount ADR-085 gives it: 1 serving, or 100 g', async () => {
    await show();
    await search('egg');
    await add(EGG);
    expect(amountField(EGG).props.value).toBe(String(foodParams.defaultGrams));
    await search('rice');
    await add(RICE);
    expect(amountField(RICE).props.value).toBe('1');
  });

  test('the unit stands after the number', async () => {
    await show();
    await search('egg');
    await add(EGG);
    expect(amountField(EGG).props.accessibilityValue.text).toBe(`${foodParams.defaultGrams} ${t('meal.item.grams')}`);
  });
});

describe('units are a track of their own, not the slot chips', () => {
  test('another unit switches it, to the same weight where the portions are known, else to 100 g; the estimate is asked again at once', async () => {
    await show();
    await search('rice');
    await add(RICE);
    const asked = estimates().length;
    await act(async () => fireEvent.press(button(t('meal.item.unitSpoken', { name: RICE.name, unit: t('meal.item.grams') }))));
    expect(button(t('meal.item.unitSpoken', { name: RICE.name, unit: t('meal.item.grams') }))).toBeSelected();
    expect(button(t('meal.item.unitSpoken', { name: RICE.name, unit: '1 bowl' }))).not.toBeSelected();
    // K1: the amount used to empty ("1" of a bowl is not 1 g); it is a sensible one now, never typed (a bowl is 158 g only where the portions are known).
    expect(amountField(RICE).props.value).toBe(String(foodParams.defaultGrams));
    expect(estimates()).toHaveLength(asked + 1);
    await typeAmount(RICE, '200');
    expect(estimates()).toHaveLength(asked + 2);
    expect(lastItems()).toEqual([{ foodId: 'fdc-3', amount: { quantity: 200, unit: 'g', certainty: 'ESTIMATED' } }]);
  });

  test('with the portions known, another portion keeps the weight: 1 large egg (50 g) is 50 g, then 2 oz (rounded to the half)', async () => {
    mockPOST.mockImplementation(async (path: string, init: { body: never }) => {
      if (path === '/v1/foods/search') return ok([PORTIONED]);
      if (path === '/v1/food-estimates') return ok(estimateAround(init.body));
      return refused(404, 'NOT_FOUND');
    });
    await show();
    await search('egg');
    await add(PORTIONED);
    expect(amountField(PORTIONED).props.value).toBe('1');
    expect(screen.getByTestId('numbers-0')).toHaveTextContent('72');
    await act(async () => fireEvent.press(button(t('meal.item.unitSpoken', { name: PORTIONED.name, unit: 'g' }))));
    expect(amountField(PORTIONED).props.value).toBe('50');
    expect(screen.getByTestId('numbers-0')).toHaveTextContent('72');
    await act(async () => fireEvent.press(button(t('meal.item.unitSpoken', { name: PORTIONED.name, unit: 'oz' }))));
    expect(amountField(PORTIONED).props.value).toBe('2');
  });

  test('half, 1, 2 and 3 are one tap for a food counted in pieces; no typing for the common case', async () => {
    mockPOST.mockImplementation(async (path: string, init: { body: never }) => {
      if (path === '/v1/foods/search') return ok([PORTIONED]);
      if (path === '/v1/food-estimates') return ok(estimateAround(init.body));
      return refused(404, 'NOT_FOUND');
    });
    await show();
    await search('egg');
    await add(PORTIONED);
    await act(async () => fireEvent.press(button(t('meal.item.quantitySpoken', { quantity: 2 }))));
    expect(amountField(PORTIONED).props.value).toBe('2');
    expect(screen.getByTestId('numbers-0')).toHaveTextContent('144');
    await act(async () => fireEvent.press(button(t('meal.item.quantitySpoken', { quantity: 0.5 }))));
    expect(amountField(PORTIONED).props.value).toBe('0.5');
    expect(screen.getByTestId('numbers-0')).toHaveTextContent('36');
  });

  test('the units are the item\'s own chips, one per portion, inside its card and apart from the slot row (K-1063)', async () => {
    await show();
    await search('rice');
    await add(RICE);
    const track = screen.getByTestId('units-0');
    expect(track).toBeOnTheScreen();
    expect(within(track).getAllByRole('button')).toHaveLength(2); // 1 bowl, g
    expect(within(track).queryByRole('button', { name: t('food.slot.LUNCH') })).toBeNull();
  });

  test('a unit and a slot both say which is selected', async () => {
    await show();
    expect(screen.getByTestId('slot-LUNCH')).toBeSelected();
    await search('rice');
    await add(RICE);
    expect(button(t('meal.item.unitSpoken', { name: RICE.name, unit: '1 bowl' }))).toBeSelected();
  });

  test('weighed is a switch row, not a chip', async () => {
    await show();
    await search('egg');
    await add(EGG);
    const weighed = screen.getByRole('switch', { name: t('meal.item.weighedSpoken', { name: EGG.name }) });
    expect(weighed.props.value).toBe(false);
    await act(async () => fireEvent(weighed, 'valueChange', true));
    expect(lastItems()[0].amount.certainty).toBe('WEIGHED');
  });
});

describe('buttons by role', () => {
  // K1 (Evre 7 A): Scan was a text button with the barcode beside it; it is the barcode icon at the end of the search box, still one named button.
  test('Scan is the barcode icon in the search box: a button of its own, no fill, no outline, named for VoiceOver', async () => {
    await show();
    const scan = button(t('meal.barcode.scan'));
    expect(flat(scan).backgroundColor).toBeUndefined();
    expect(flat(scan).borderWidth ?? 0).toBe(0);
    expect(screen.getByTestId('scan-icon')).toBeOnTheScreen();
    expect(screen.queryByText(t('meal.barcode.scanShort'))).toBeNull();
  });

  test('Quick add and Create food are icon buttons on a filled pill, not text links', async () => {
    await show();
    for (const name of [t('meal.quickAdd.open'), t('meal.own.open')]) {
      const pill = button(name);
      expect(flat(pill).backgroundColor).toBe(p.surface);
      expect(flat(pill).borderWidth ?? 0).toBe(0);
    }
  });

  // K1 (Evre 7 A): Remove was the red text button of a food's card ("take the item out"); the portion step of a new food has a quiet x instead
  // (nothing was added yet, so there is nothing to remove). The destructive Remove stays in a correction's sheet (meal-edit-screen.test.tsx).
  test('the portion step\'s way out is a quiet x: no fill, no warning colour; closing adds nothing', async () => {
    await show();
    await search('rice');
    await add(RICE);
    const close = screen.getByTestId('sheet-close');
    expect(flat(close).backgroundColor).toBeUndefined();
    expect(screen.queryByText(t('meal.item.remove'))).toBeNull();
    await act(async () => fireEvent.press(close));
    expect(screen.queryByLabelText(t('meal.item.amount', { name: RICE.name }))).toBeNull();
    expect(mockRecord).not.toHaveBeenCalled();
  });

  test('"Add to Lunch" is the one primary of the portion step, and nothing else is filled or outlined', async () => {
    await show();
    await search('rice');
    await add(RICE);
    expect(primaries().map((node) => node.props.accessibilityLabel)).toEqual([expect.stringMatching(/^Add to Lunch/)]);
    // No outlined pill: the only outlined things are choices (a choice, not an action): the item's portion chips and the quantity chips.
    const outlined = screen.getAllByRole('button').filter((node) => ((flat(node).borderWidth as number | undefined) ?? 0) > 0);
    expect(outlined.map((node) => node.props.accessibilityLabel)).toEqual([
      t('meal.item.unitSpoken', { name: RICE.name, unit: '1 bowl' }),
      t('meal.item.unitSpoken', { name: RICE.name, unit: t('meal.item.grams') }),
      // The quantity chips (half, 1, 2, 3) are choices too.
      ...foodParams.quickQuantities.map((quantity) => t('meal.item.quantitySpoken', { quantity })),
    ]);
  });

  test('nothing is picked yet and nothing logged: no primary at all — the past meal is a row, not a button', async () => {
    mockYesterday = [YESTERDAY_LUNCH];
    await show();
    expect(screen.getByText(t('meal.again.yesterday', { slot: t('food.slot.LUNCH').toLowerCase() }))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Add to / })).toBeNull();
    expect(primaries()).toHaveLength(0);
  });

  test('a meal being corrected: Delete is destructive words, still one primary', async () => {
    mockEdit = 'm-edit';
    await show();
    const del = button(t('meal.edit.delete'));
    expect(flat(del).backgroundColor).toBeUndefined();
    expect(flat(screen.getByText(t('meal.edit.delete'))).color).toBe(p.warn);
    expect(primaries()).toHaveLength(1);
  });
});

describe('results and recent foods are grouped list rows', () => {
  test('a result row: the name, one kcal number for its portion at its end, the macros as marks, a press opens the portion step, the plus logs it', async () => {
    await show();
    await search('egg');
    const row = button(t('meal.search.add', { name: EGG.name }));
    expect(screen.getByText(EGG.name)).toBeOnTheScreen();
    expect(screen.getByText(`Farm · ${t('meal.search.per100gShort')}`)).toBeOnTheScreen();
    expect(screen.getByTestId('result-fdc-9-kcal')).toHaveTextContent(t('food.single.kcal', { value: 145 }));
    expect(flat(row).minHeight).toBeUndefined();
    await act(async () => fireEvent.press(row));
    expect(amountField(EGG)).toBeOnTheScreen();
    expect(mockRecord).not.toHaveBeenCalled();
  });

  test('Recent: a row with its amount and one kcal number, the plus logs it, in one list with the others (no tabs)', async () => {
    mockRecent = [YOGURT];
    mockYesterday = [{ ...YESTERDAY_LUNCH, items: [{ ...YESTERDAY_LUNCH.items[0], foodId: 'fdc-yogurt', name: 'Greek yogurt' }] }];
    await show();
    expect(screen.getByText(t('meal.home.recent'))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Frequent' })).toBeNull();
    expect(screen.getByTestId('recent-fdc-yogurt-kcal')).toHaveTextContent(single(150, 170));
    const plus = button(t('food.suggestions.log', { name: 'Greek yogurt' }));
    expect(screen.getByTestId('recent-fdc-yogurt-log')).toBeOnTheScreen(); // the plus says a press adds
    await act(async () => fireEvent.press(plus));
    expect(mockRecord).toHaveBeenCalledTimes(1);
    expect(mockRecord).toHaveBeenCalledWith({
      kind: 'meal',
      body: expect.objectContaining({ items: [{ foodId: 'fdc-yogurt', amount: { quantity: 170, unit: 'g', certainty: 'ESTIMATED' } }] }),
    });
  });

  test('A past meal: a row with the foods and one kcal number, one press logs it again', async () => {
    mockYesterday = [YESTERDAY_LUNCH];
    await show();
    const row = button(t('meal.again.spoken', { slot: t('food.slot.LUNCH').toLowerCase(), items: 'Chicken rice bowl' }));
    expect(screen.getByText(single(610, 720))).toBeOnTheScreen();
    await act(async () => fireEvent.press(row));
    expect(mockRecord).toHaveBeenCalledWith({ kind: 'meal', body: expect.objectContaining({ repeatOf: 'm-lunch' }) });
  });
});

// K1 (Evre 7 A): "a second food brings the meal total" lived in the log screen, where a meal was put together item by item. One food shows its own
// numbers in its portion step (here); a meal of several items is the items screen (meal-screen.test.tsx › a meal the coach read).
describe('the portion step\'s numbers', () => {
  test('one food shows its own numbers: one kcal number and its macros as a bar and three figures', async () => {
    await show();
    await search('rice');
    await add(RICE);
    expect(screen.getByTestId('numbers-0')).toHaveTextContent('205');
    expect(screen.queryByTestId('estimate')).toBeNull();
  });

  test('a portioned food draws the bar and the three figures with their names', async () => {
    mockPOST.mockImplementation(async (path: string, init: { body: never }) => {
      if (path === '/v1/foods/search') return ok([PORTIONED]);
      if (path === '/v1/food-estimates') return ok(estimateAround(init.body));
      return refused(404, 'NOT_FOUND');
    });
    await show();
    await search('egg');
    await add(PORTIONED);
    expect(screen.getByTestId('macro-bar')).toBeOnTheScreen();
    for (const macro of ['protein', 'carbs', 'fat'] as const) expect(within(screen.getByTestId(`macro-figure-${macro}`)).getByText(t(`food.totals.${macro}`))).toBeOnTheScreen();
    expect(within(screen.getByTestId('macro-figure-protein')).getByText('6 g')).toBeOnTheScreen();
  });
});
