/**
 * The day's food as a page in the week's language (K-1250, ADR-094 Ek 5): the day itself is the title in the serif ("Today", "Fri,
 * Sep 25"), the strip under it shows a week at a time with the day chosen in petrol, the macros fill in coral (progress) with no
 * colour of their own, the meals' names are serif headings, and what fits what is left comes after the person's own meals.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { Alert, StyleSheet } from 'react-native';

import FoodScreen from '@/app/food';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';
import { palettes, tokens } from '@/theme/tokens';
import { setActiveLocale } from '@/copy/locales';

import { WithSaved } from './support/saved';

type Schemas = components['schemas'];
type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown, status = 200): Answer => ({ data, response: new Response(null, { status }) });
const refused = (status: number, code: string): Answer => ({ error: { code, message: 'x' }, response: new Response(null, { status }) });
const R = (low: number, high: number) => ({ low, high });
const NUTRIENTS = (kcal: [number, number], p: [number, number], c: [number, number], f: [number, number]) => ({
  kcal: R(...kcal),
  proteinG: R(...p),
  carbsG: R(...c),
  fatG: R(...f),
});

const at = (day: number, hour: number) => new Date(2026, 8, day, hour, 0).toISOString();
const item = (name: string, kcal: [number, number], amount: Schemas['Amount'] = { quantity: 1, unit: '1 large' }): Schemas['EstimatedItem'] => ({
  foodId: `f-${name}`,
  name,
  amount,
  kcal: R(...kcal),
  proteinG: R(5, 7),
});
const meal = (id: string, day: number, hour: number, slot: Schemas['MealSlot'], items: Schemas['EstimatedItem'][]): Schemas['Meal'] => ({
  id,
  clientId: `c-${id}`,
  eatenAt: at(day, hour),
  slot,
  items,
  kcal: R(items.reduce((sum, i) => sum + i.kcal.low, 0), items.reduce((sum, i) => sum + i.kcal.high, 0)),
  proteinG: R(10, 14),
});

const BREAKFAST = meal('b1', 29, 8, 'BREAKFAST', [item('Egg', [68, 76]), item('Toast', [80, 100], { quantity: 2, unit: '1 slice' })]);
const OLD_LUNCH = meal('l1', 25, 12, 'LUNCH', [item('Rice', [200, 240], { quantity: 150, unit: 'g' })]);

let mockMeals: Record<string, Schemas['Meal'][]> = {};
let mockDays: Schemas['DaySummary'][] = [];
let mockProgram: Answer | null = null;
let mockPatch: () => Promise<Answer> = async () => ok(BREAKFAST);
let mockDelete: () => Promise<Answer> = async () => ({ response: new Response(null, { status: 204 }) });
const calls: string[] = [];
const mockGET = jest.fn(async (path: string, init?: { params?: { query?: { day?: string; from?: string }; path?: { day?: string } } }) => {
  calls.push(path);
  if (path === '/v1/meals') {
    const query = init?.params?.query;
    if (query?.day !== undefined) return ok(mockMeals[query.day] ?? []);
    return ok(Object.values(mockMeals).flat());
  }
  if (path === '/v1/days') return ok(mockDays);
  if (path === '/v1/program' && mockProgram !== null) return mockProgram;
  if (path === '/v1/days/{day}/budget') {
    return ok({
      day: init?.params?.path?.day,
      targetKcal: 2400,
      targetProteinG: 150,
      eaten: NUTRIENTS([700, 800], [40, 50], [60, 80], [20, 30]),
      left: { kcal: R(1600, 1700), proteinG: R(100, 110) },
    });
  }
  if (path === '/v1/targets') return ok({ targetKcal: 2400, proteinG: 150, carbsG: 250, fatG: 70, stepsPerDay: 8000, trainingSessionsPerWeek: 3 });
  return refused(404, 'NOT_FOUND');
});
const mockPATCH = jest.fn(async (path: string, _init?: unknown) => {
  calls.push(`PATCH ${path}`);
  return mockPatch();
});
const mockDELETE = jest.fn(async (path: string, _init?: unknown) => {
  calls.push(`DELETE ${path}`);
  return mockDelete();
});
const mockPush = jest.fn();
const mockRecord = jest.fn(async (_record: unknown) => true);
const mockForget = jest.fn(async (_clientId: string) => {});
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
jest.mock('expo-router', () => ({
  router: { push: (to: unknown) => mockPush(to), back: jest.fn() },
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(effect, [effect]);
  },
}));
const mockServices = {
  api: { GET: mockGET, PATCH: mockPATCH, DELETE: mockDELETE },
  queue: { record: mockRecord, drain: async () => {} },
  mealRecords: async () => [],
  consents: { granted: async () => true },
  forgetRecord: mockForget,
  takeBack: jest.fn(async (_clientId: string, remove: (serverId: string) => Promise<number>) => {
    await remove('srv-1');
    return 'taken' as const;
  }),
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => 'METRIC' }));
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

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
  calls.length = 0;
  mockProgram = null;
  mockMeals = { '2026-09-29': [BREAKFAST], '2026-09-25': [OLD_LUNCH] };
  mockDays = [
    { day: '2026-09-25', meals: 1, eaten: NUTRIENTS([200, 240], [4, 5], [40, 50], [0, 1]) },
    { day: '2026-09-29', meals: 1, eaten: NUTRIENTS([148, 176], [10, 14], [20, 30], [5, 8]) },
  ];
  mockPatch = async () => ok(BREAKFAST);
  mockDelete = async () => ({ response: new Response(null, { status: 204 }) });
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <WithSaved>
        <FoodScreen />
      </WithSaved>
    </ThemeProvider>,
  );
  await act(async () => {});
}
const press = async (node: Parameters<typeof fireEvent.press>[0]) => act(async () => fireEvent.press(node));

const p = palettes.light;
const flat = (node: { props: { style?: unknown } }) => (StyleSheet.flatten(node.props.style as never) ?? {}) as Record<string, unknown>;
type Node = { props?: { style?: unknown }; children?: (Node | string)[] | null };
function coloured(tree: unknown, colours: string[]): number {
  const nodes = (Array.isArray(tree) ? tree : [tree]) as (Node | string | null)[];
  return nodes.reduce<number>((sum, node) => {
    if (node === null || typeof node === 'string') return sum;
    const fill = (StyleSheet.flatten(node.props?.style as never) as { backgroundColor?: string } | undefined)?.backgroundColor;
    return sum + (fill !== undefined && colours.includes(fill) ? 1 : 0) + coloured(node.children ?? [], colours);
  }, 0);
}
afterEach(() => setActiveLocale('en'));

describe('the day is the title', () => {
  test('the title is the day in the serif; no second heading above it and no chevrons', async () => {
    await show();
    const title = screen.getByTestId('day-label');
    expect(title).toHaveTextContent(t('food.day.today'));
    expect(title).toHaveStyle({ fontFamily: tokens.face.display.fontFamily });
    expect(screen.queryByText(t('screens.food.title'))).toBeNull();
    expect(screen.queryByTestId('day-before')).toBeNull();
    expect(screen.queryByTestId('day-after')).toBeNull();
  });

  test('a day of the strip becomes the title', async () => {
    await show();
    await press(screen.getByTestId('day-2026-09-28'));
    expect(screen.getByTestId('day-label')).toHaveTextContent(t('food.day.yesterday'));
  });

  test('the day chosen is filled in petrol, its letters on petrol', async () => {
    await show();
    const chosen = screen.getByTestId('day-2026-09-29');
    expect(flat(chosen).backgroundColor).toBe(p.accent);
    expect(within(chosen).getByText('29')).toHaveStyle({ color: p.onAccent });
  });
});

describe('the day\'s numbers in the roles', () => {
  test('the macros fill in coral and carry no colour of their own', async () => {
    await show();
    expect(flat(screen.getByTestId('macro-fill-protein'))).toMatchObject({ backgroundColor: p.progress });
    expect(coloured(screen.toJSON(), [p.macroCarbs, p.macroFat])).toBe(0);
  });

  test("a meal's name is a serif heading", async () => {
    await show();
    await press(screen.getByTestId('day-2026-09-25'));
    expect(screen.getByRole('header', { name: t('food.slot.LUNCH') })).toHaveStyle({ fontFamily: tokens.face.display.fontFamily });
  });

  test('what fits what is left is called so in Turkish', () => {
    setActiveLocale('tr');
    expect(t('food.suggestions.title')).toBe('Kalana uyanlar');
  });
});
