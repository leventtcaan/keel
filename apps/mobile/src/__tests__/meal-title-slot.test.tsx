/**
 * The meal screen as a page whose title is the meal (K-1247, ADR-094 Ek 4): the meal's name in the serif with a petrol chevron, the
 * day and what the meal holds under it, the system's list of the four meals with their calories; no tray card for an empty meal; Quick
 * add and Create food as two text buttons under the list; the macros without colour; the portion step's name in the serif; each meal's
 * own Turkish phrases (the endings change with the meal's name).
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import MealScreen from '@/app/meal';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { setActiveLocale } from '@/copy/locales';
import { ThemeProvider } from '@/theme/theme';
import { palettes, tokens } from '@/theme/tokens';

import { WithSaved } from './support/saved';
import { answerSheet } from './support/systemChoices';

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
const RICE: Schemas['Suggestion'] = { foodId: 'fdc-rice', name: 'Rice', amount: { quantity: 150, unit: 'g' }, kcal: R(180, 200), proteinG: R(3, 4), carbsG: R(40, 44), fatG: R(0, 1) };

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
const search = async (text: string) => {
  await fireEvent.changeText(screen.getByLabelText(t('meal.search.label')), text);
  await act(async () => fireEvent(screen.getByLabelText(t('meal.search.label')), 'submitEditing'));
};

afterEach(() => setActiveLocale('en'));

type Node = { props?: { style?: unknown }; children?: (Node | string)[] | null };
/** How many drawn views in the tree are filled with one of these colours. */
function colouredIn(tree: unknown, colours: string[]): number {
  const nodes = (Array.isArray(tree) ? tree : [tree]) as (Node | string | null)[];
  return nodes.reduce<number>((sum, node) => {
    if (node === null || typeof node === 'string') return sum;
    const fill = (StyleSheet.flatten(node.props?.style as never) as { backgroundColor?: string } | undefined)?.backgroundColor;
    return sum + (fill !== undefined && colours.includes(fill) ? 1 : 0) + colouredIn(node.children ?? [], colours);
  }, 0);
}

describe('the title is the meal', () => {
  test('a new meal: the meal\'s name is the title, in the serif, with the day and "nothing yet" under it; no four pills, no "Log a meal"', async () => {
    await show();
    const title = screen.getByTestId('meal-picker');
    expect(within(title).getByText(t('food.slot.LUNCH'))).toHaveStyle({ fontFamily: tokens.face.display.fontFamily });
    expect(within(title).getByText(t('meal.picker.dayEmpty', { day: t('food.day.today') }))).toBeOnTheScreen();
    expect(screen.queryByText(t('meal.title'))).toBeNull();
    expect(screen.queryByTestId('slot-LUNCH')).toBeNull();
  });

  test('the title opens the system\'s list of the four meals, each with what it holds that day; the one picked is the title', async () => {
    mockLocal = [];
    const sheet = answerSheet(t('food.slot.SNACK'));
    await show();
    await fireEvent.press(screen.getByTestId('meal-picker'));
    await act(async () => {});
    const options = sheet.mock.calls[0][0];
    expect(options.options).toEqual([t('food.slot.BREAKFAST'), t('food.slot.LUNCH'), t('food.slot.DINNER'), t('food.slot.SNACK'), t('meal.picker.cancel')]);
    expect(options.cancelButtonIndex).toBe(4);
    expect(options.tintColor).toBeDefined();
    expect(within(screen.getByTestId('meal-picker')).getByText(t('food.slot.SNACK'))).toBeOnTheScreen();
    sheet.mockRestore();
  });

  test('a meal that holds something says its calories, under the title and in the list', async () => {
    const sheet = answerSheet(t('meal.picker.cancel'));
    await show();
    await search('egg');
    await fireEvent.press(screen.getByRole('button', { name: t('meal.search.logNow', { name: EGG.name }) }));
    await act(async () => {});
    expect(within(screen.getByTestId('meal-picker')).getByText(t('meal.picker.day', { day: t('food.day.today'), kcal: t('food.single.kcal', { value: '72' }) }))).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('meal-picker'));
    await act(async () => {});
    expect(sheet.mock.calls[0][0].options[1]).toBe(t('meal.picker.option', { slot: t('food.slot.LUNCH'), kcal: t('food.single.kcal', { value: '72' }) }));
    sheet.mockRestore();
  });

  test('a past day is named under the title', async () => {
    mockParams = { day: '2026-09-25' };
    await show();
    expect(within(screen.getByTestId('meal-picker')).getByText(t('meal.picker.dayEmpty', { day: 'Fri, Sep 25' }))).toBeOnTheScreen();
  });
});

describe('less on the page', () => {
  test('an empty meal has no tray card; the title says it is empty', async () => {
    await show();
    expect(screen.queryByTestId('tray')).toBeNull();
    expect(screen.queryByText(t('meal.tray.empty'))).toBeNull();
  });

  test('Quick add and Create food are text buttons under the list, not pills above it', async () => {
    await show();
    expect(screen.queryByTestId('food-tools')).toBeNull();
    expect(within(screen.getByTestId('food-links')).getByRole('button', { name: t('meal.quickAdd.open') })).toBeOnTheScreen();
    expect(within(screen.getByTestId('food-links')).getByRole('button', { name: t('meal.own.open') })).toBeOnTheScreen();
  });

  test('a food row\'s macros are letters and grams, without a coloured mark', async () => {
    await show();
    const row = screen.getByTestId(`usual-${RICE.foodId}`);
    expect(within(row).getByText(t('food.macro.protein', { value: 4 }))).toBeOnTheScreen();
    const marks = [palettes.light.macroCarbs, palettes.light.macroFat]; // protein is petrol, the action's own colour
    expect(colouredIn(screen.toJSON(), marks)).toBe(0);
  });
});

describe('the portion step', () => {
  test('the food\'s name is in the serif, and the macros have no coloured bar', async () => {
    await show();
    await search('egg');
    await fireEvent.press(screen.getByRole('button', { name: t('meal.search.add', { name: EGG.name }) }));
    await act(async () => {});
    expect(within(screen.getByTestId('portion-sheet')).getByRole('header')).toHaveStyle({ fontFamily: tokens.face.display.fontFamily });
    const marks = [palettes.light.macroCarbs, palettes.light.macroFat]; // protein is petrol, the action's own colour
    expect(colouredIn(screen.toJSON(), marks)).toBe(0);
    expect(screen.getByTestId('macro-bar')).toBeOnTheScreen();
  });
});

describe("each meal's own Turkish", () => {
  test.each([
    ['BREAKFAST', 'Kahvaltıya ekle · 72 kcal', 'Genelde kahvaltıda', 'Dünkü kahvaltı'],
    ['LUNCH', 'Öğle yemeğine ekle · 72 kcal', 'Genelde öğle yemeğinde', 'Dünkü öğle yemeği'],
    ['DINNER', 'Akşam yemeğine ekle · 72 kcal', 'Genelde akşam yemeğinde', 'Dünkü akşam yemeği'],
    ['SNACK', 'Atıştırmalığa ekle · 72 kcal', 'Genelde atıştırmalıkta', 'Dünkü atıştırmalık'],
  ])('%s', (slot, add, usual, yesterday) => {
    setActiveLocale('tr');
    expect(t(`meal.forSlot.${slot}.addKcal`, { kcal: '72 kcal' })).toBe(add);
    expect(t(`meal.forSlot.${slot}.usual`)).toBe(usual);
    expect(t(`meal.forSlot.${slot}.yesterday`)).toBe(yesterday);
    expect(t(`meal.forSlot.${slot}.other`, { day: '25 Kas Çar' })).toMatch(/^25 Kas Çar · /);
  });
});
