/**
 * The meal screen on the component system (K-1046, ADR-070 Ek 2 #1 and #5, prototype yeniden-yapim.html §7): a picked food's
 * amount is the one Stepper (typed with a comma or a dot, stepped from food.json); its units are a track of their own, not the
 * same chips as the slots; Scan and Remove are words (text and destructive), "Log it" is the screen's one primary; the search
 * results and the recent foods are grouped list rows with their kcal range and add on a press.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
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
  eatenAt: '2026-09-28T10:10:00Z',
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

jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  return { SymbolView: (props: { testID?: string }) => createElement('SymbolView', { ...props, testID: props.testID ?? 'symbol' }) };
});

let mockEdit: string | undefined;
let mockRecent: Schemas['Suggestion'][] = [];
let mockYesterday: Schemas['Meal'][] = [];
const mockPOST = jest.fn(async (path: string, init: { body: never }) => {
  if (path === '/v1/foods/search') return ok([RICE, EGG]);
  if (path === '/v1/food-estimates') return ok(estimateOf(init.body));
  return refused(404, 'NOT_FOUND');
});
const mockRecord = jest.fn(async (_record: unknown) => true);
const mockBack = jest.fn();
const mockGET = jest.fn(async (path: string, init?: { params?: { query?: { day?: string } } }) => {
  if (path === '/v1/meals') {
    if (init?.params?.query?.day === '2026-09-28') return ok(mockYesterday);
    return ok(mockEdit === undefined ? [] : [EDITED]);
  }
  if (path === '/v1/foods/recent') return ok(mockRecent);
  return refused(404, 'NOT_FOUND');
});
const EDITED: Schemas['Meal'] = { ...YESTERDAY_LUNCH, id: 'm-edit', clientId: 'c-edit', eatenAt: '2026-09-29T10:10:00Z' };
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), push: jest.fn() },
  useLocalSearchParams: () => (mockEdit === undefined ? {} : { edit: mockEdit, day: '2026-09-29' }),
}));
const mockServices = {
  api: { POST: mockPOST, GET: mockGET, PUT: jest.fn(), DELETE: jest.fn(async (_path: string, _init?: unknown) => ({ response: new Response(null, { status: 204 }) })) },
  queue: { record: mockRecord },
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
const kcal = (low: number, high: number) => `${t('format.range', { low, high })} ${t('food.budget.kcalUnit')}`;
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
  test('another unit switches it and the estimate is asked again once the amount is given', async () => {
    await show();
    await search('rice');
    await add(RICE);
    const asked = estimates().length;
    await act(async () => fireEvent.press(button(t('meal.item.unitSpoken', { name: RICE.name, unit: t('meal.item.grams') }))));
    expect(button(t('meal.item.unitSpoken', { name: RICE.name, unit: t('meal.item.grams') }))).toBeSelected();
    expect(button(t('meal.item.unitSpoken', { name: RICE.name, unit: '1 bowl' }))).not.toBeSelected();
    expect(amountField(RICE).props.value).toBe(''); // "1" of a bowl is not 1 g: nothing is converted for the user
    expect(estimates()).toHaveLength(asked);
    await typeAmount(RICE, '200');
    expect(estimates()).toHaveLength(asked + 1);
    expect(lastItems()).toEqual([{ foodId: 'fdc-3', amount: { quantity: 200, unit: 'g', certainty: 'ESTIMATED' } }]);
  });

  test('they do not look like the slot chips: no outline, a smaller type, inside one track', async () => {
    await show();
    await search('rice');
    await add(RICE);
    const slot = flat(button(t('food.slot.LUNCH')));
    const unit = flat(button(t('meal.item.unitSpoken', { name: RICE.name, unit: '1 bowl' })));
    expect(slot.borderWidth).toBe(tokens.border.hairline); // the chip is an outlined pill
    expect(unit.borderWidth ?? 0).toBe(0);
    expect(slot.borderRadius).not.toBe(unit.borderRadius);
    const track = flat(screen.getByTestId(`units-0`));
    expect(track.backgroundColor).toBe(p.surface);
  });

  test('a unit and a slot both say which is selected', async () => {
    await show();
    expect(button(t('food.slot.LUNCH'))).toBeSelected();
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
  test('Scan is a text button with the barcode beside it', async () => {
    await show();
    const scan = button(t('meal.barcode.scan'));
    expect(flat(scan).backgroundColor).toBeUndefined();
    expect(flat(scan).borderWidth ?? 0).toBe(0);
    expect(flat(screen.getByText(t('meal.barcode.scanShort'))).color).toBe(p.accent);
    expect(screen.getByTestId('scan-icon')).toBeOnTheScreen();
  });

  test('Remove is a destructive text button, and it takes the item out', async () => {
    await show();
    await search('rice');
    await add(RICE);
    const remove = button(t('meal.item.removeSpoken', { name: RICE.name }));
    expect(flat(remove).backgroundColor).toBeUndefined();
    expect(flat(remove).borderWidth ?? 0).toBe(0);
    expect(flat(screen.getByText(t('meal.item.remove'))).color).toBe(p.warn);
    await act(async () => fireEvent.press(remove));
    expect(screen.queryByLabelText(t('meal.item.amount', { name: RICE.name }))).toBeNull();
  });

  test('"Log it" is the one primary of a meal being put together, and nothing else is filled or outlined', async () => {
    await show();
    await search('rice');
    await add(RICE);
    expect(primaries().map((node) => node.props.accessibilityLabel)).toEqual([t('meal.save')]);
    // No outlined pill: the only outlined things are the four slot chips (a choice, not an action).
    const outlined = screen.getAllByRole('button').filter((node) => ((flat(node).borderWidth as number | undefined) ?? 0) > 0);
    expect(outlined.map((node) => node.props.accessibilityLabel)).toEqual((['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as const).map((slot) => t(`food.slot.${slot}`)));
  });

  test('nothing is picked yet: no "Log it", so no primary at all — Same as yesterday is a row, not a button', async () => {
    mockYesterday = [YESTERDAY_LUNCH];
    await show();
    expect(screen.getByText(t('food.repeat.title'))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('meal.save') })).toBeNull();
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
  test('a result row: the name, its range per 100 g under it, and a press adds it', async () => {
    await show();
    await search('egg');
    const row = button(t('meal.search.add', { name: EGG.name }));
    expect(screen.getByText(EGG.name)).toBeOnTheScreen();
    expect(screen.getByText(`Farm · ${t('meal.search.per100g', { kcal: kcal(130, 160) })}`)).toBeOnTheScreen();
    expect(screen.getByText(t('meal.search.per100g', { kcal: kcal(120, 140) }))).toBeOnTheScreen();
    expect(flat(row).minHeight).toBe(tokens.size.row); // a ListRow
    await act(async () => fireEvent.press(row));
    expect(amountField(EGG)).toBeOnTheScreen();
  });

  test('Recent: a titled group of rows, each with its amount and range, one press logs it', async () => {
    mockRecent = [YOGURT];
    await show();
    expect(screen.getByRole('header', { name: t('meal.quick.recent') })).toBeOnTheScreen();
    const row = button(t('food.suggestions.log', { name: 'Greek yogurt' }));
    expect(flat(row).minHeight).toBe(tokens.size.row);
    expect(screen.getByText(kcal(150, 170))).toBeOnTheScreen();
    expect(screen.getByTestId('recent-fdc-yogurt-trailing')).toBeOnTheScreen(); // the plus says a press adds
    await act(async () => fireEvent.press(row));
    expect(mockRecord).toHaveBeenCalledTimes(1);
  });

  test('Same as yesterday: a row with the foods and the range, one press logs it again', async () => {
    mockYesterday = [YESTERDAY_LUNCH];
    await show();
    const row = button(t('food.repeat.spoken', { slot: t('food.slot.LUNCH'), items: 'Chicken rice bowl' }));
    expect(screen.getByText(kcal(610, 720))).toBeOnTheScreen();
    await act(async () => fireEvent.press(row));
    expect(mockRecord).toHaveBeenCalledWith({ kind: 'meal', body: expect.objectContaining({ repeatOf: 'm-lunch' }) });
  });
});

describe('the estimate card', () => {
  test('the meal in ranges, the items under it, and no single number (U5)', async () => {
    await show();
    await search('rice');
    await add(RICE);
    expect(screen.getByTestId('estimate')).toBeOnTheScreen();
    expect(screen.getByText(t('meal.estimate.title'))).toBeOnTheScreen();
    expect(screen.getByText(kcal(380, 530))).toBeOnTheScreen();
    expect(screen.getByText(kcal(170, 240))).toBeOnTheScreen();
  });
});
