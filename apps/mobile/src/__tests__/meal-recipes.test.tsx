/**
 * A recipe in a meal (K-423, ADR-034): the user's recipes are found by name beside the database's foods, added as one
 * item counted in portions — at most the whole recipe — and logged as "recipe:<id>". One whose ingredient the database
 * dropped is shown, marked, and cannot be added. Offline, only the foods.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import MealScreen from '@/app/meal';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';

type Schemas = components['schemas'];
type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown, status = 200): Answer => ({ data, response: new Response(null, { status }) });
const refused = (status: number, code: string): Answer => ({ error: { code, message: 'x' }, response: new Response(null, { status }) });
const R = (low: number, high: number) => ({ low, high });

const RICE: Schemas['Food'] = {
  id: 'fdc-3',
  name: 'Rice, white, cooked',
  per100g: { kcal: R(120, 140), proteinG: R(2, 3), carbsG: R(26, 30), fatG: R(0, 1) },
  servings: [{ name: '1 cup', grams: 158 }],
};
const CHICKEN: Schemas['Food'] = {
  id: 'fdc-4',
  name: 'Chicken breast',
  per100g: { kcal: R(150, 175), proteinG: R(29, 33), carbsG: R(0, 0), fatG: R(3, 5) },
};
const estimateOf = (request: Schemas['FoodEstimateRequest']): Schemas['FoodEstimate'] => ({
  items: request.items.map((item) => ({
    foodId: item.foodId,
    name: item.foodId === RICE.id ? RICE.name : CHICKEN.name,
    amount: item.amount,
    kcal: item.foodId === RICE.id ? R(170, 240) : R(210, 290),
    proteinG: R(3, 5),
  })),
  kcal: R(380, 530),
  proteinG: R(40, 52),
  ...(request.items.some((item) => item.foodId === CHICKEN.id && item.amount.certainty !== 'WEIGHED')
    ? { question: { foodId: CHICKEN.id, copyKey: 'foodEstimate.question.grams' } }
    : {}),
});

let mockGranted = true;
const SOUP: Schemas['Recipe'] = {
  id: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  name: 'Rice and lentil soup',
  portions: 4,
  items: [],
  perPortion: { kcal: R(250, 300), proteinG: R(14, 17), carbsG: R(35, 42), fatG: R(5, 8) },
};
const STEW: Schemas['Recipe'] = { ...SOUP, id: '33333333-3333-4333-8333-333333333333', name: 'Rice stew', unavailable: ['fdc-9'], perPortion: undefined };
let mockRecipes: () => Promise<Answer> = async () => ok([SOUP, STEW]);
let mockSearch: (q: string) => Promise<Answer> = async () => ok([RICE, CHICKEN]);
let mockEstimate: (request: Schemas['FoodEstimateRequest']) => Promise<Answer> = async (request) => ok(estimateOf(request));
const post = async (path: string, init: { body: never }) => {
  if (path === '/v1/foods/search') return mockSearch((init.body as { q: string }).q);
  if (path === '/v1/food-estimates') return mockEstimate(init.body);
  return refused(404, 'NOT_FOUND');
};
const mockPOST = jest.fn(post);
const mockPUT = jest.fn(async (_path: string, _init: unknown) => ok({ kind: 'HEALTH_DATA', status: 'GRANTED' }));
const mockRecord = jest.fn(async (_record: unknown) => true);
const mockRemember = jest.fn(async () => {});
const mockBack = jest.fn();
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
jest.mock('expo-router', () => ({ router: { back: () => mockBack(), push: jest.fn() }, useLocalSearchParams: () => ({}) }));
const mockServices = {
  api: { POST: mockPOST, PUT: mockPUT, GET: jest.fn(async (path: string) => (path === '/v1/recipes' ? mockRecipes() : refused(404, 'NOT_FOUND'))), DELETE: jest.fn() },
  queue: { record: mockRecord },
  consents: { granted: async () => mockGranted, remember: mockRemember },
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => 'METRIC' }));


beforeEach(() => {
  jest.clearAllMocks();
  mockPOST.mockImplementation(post);
  mockGranted = true;
  mockRecipes = async () => ok([SOUP, STEW]);
  mockSearch = async () => ok([RICE, CHICKEN]);
});

async function show() {
  await render(
    <ThemeProvider>
      <MealScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
async function searchFor(q: string) {
  await fireEvent.changeText(screen.getByLabelText(t('meal.search.label')), q);
  await fireEvent.press(screen.getByRole('button', { name: t('meal.search.go') }));
  await act(async () => {});
}

test('a search finds the user\'s recipes too, apart from the foods; one added is counted in portions', async () => {
  await show();
  await searchFor('rice');
  expect(screen.getByText(t('meal.recipes.heading'))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t('meal.recipes.add', { name: SOUP.name }) }));
  const field = screen.getByLabelText(t('meal.item.amount', { name: SOUP.name }));
  expect(field.props.value).toBe('');
  expect(screen.getByRole('button', { name: t('meal.item.unitSpoken', { name: SOUP.name, unit: t('meal.item.portions') }) })).toBeTruthy();
  expect(screen.queryByRole('button', { name: t('meal.item.weighedSpoken', { name: SOUP.name }) })).toBeNull(); // a portion is never weighed
});

test('at most the whole recipe: more portions than it makes is refused before it is logged', async () => {
  await show();
  await searchFor('rice');
  await fireEvent.press(screen.getByRole('button', { name: t('meal.recipes.add', { name: SOUP.name }) }));
  await fireEvent.changeText(screen.getByLabelText(t('meal.item.amount', { name: SOUP.name })), '5');
  expect(screen.getByText(t('meal.item.tooManyPortions.other', { portions: 4 }))).toBeTruthy();
  expect(screen.getByRole('button', { name: t('meal.save') }).props.accessibilityState.disabled).toBe(true);
});

test('logged as one item, "recipe:<id>", in portions', async () => {
  await show();
  await searchFor('soup');
  await fireEvent.press(screen.getByRole('button', { name: t('meal.recipes.add', { name: SOUP.name }) }));
  await fireEvent.changeText(screen.getByLabelText(t('meal.item.amount', { name: SOUP.name })), '1,5');
  await act(async () => {});
  await fireEvent.press(screen.getByRole('button', { name: t('meal.save') }));
  await act(async () => {});
  expect(mockRecord).toHaveBeenCalledWith(
    expect.objectContaining({
      kind: 'meal',
      body: expect.objectContaining({ items: [{ foodId: `recipe:${SOUP.id}`, amount: { quantity: 1.5, unit: 'portion', certainty: 'ESTIMATED' } }] }),
    }),
  );
});

test('a recipe whose ingredient the database dropped: shown and marked, not offered', async () => {
  await show();
  await searchFor('stew');
  expect(screen.getByText(t('meal.recipes.unavailable', { name: STEW.name }))).toBeTruthy();
  expect(screen.queryByRole('button', { name: t('meal.recipes.add', { name: STEW.name }) })).toBeNull();
});

test('recipes that cannot be read (offline): the foods alone', async () => {
  mockRecipes = async () => {
    throw new TypeError('Network request failed');
  };
  await show();
  await searchFor('rice');
  expect(screen.queryByText(t('meal.recipes.heading'))).toBeNull();
  expect(screen.getByRole('button', { name: t('meal.search.add', { name: RICE.name }) })).toBeTruthy();
});

test('read at the first search only — none without a search; unread (offline), the next search asks again', async () => {
  await show();
  expect(mockServices.api.GET).not.toHaveBeenCalled();
  mockRecipes = async () => {
    throw new TypeError('Network request failed');
  };
  await searchFor('rice');
  mockRecipes = async () => ok([SOUP]);
  await searchFor('rice');
  await searchFor('soup');
  expect(mockServices.api.GET.mock.calls.filter(([path]) => path === '/v1/recipes')).toHaveLength(2);
  expect(screen.getByRole('button', { name: t('meal.recipes.add', { name: SOUP.name }) })).toBeTruthy();
});

test('a recipe found is something found: no "nothing found" when only a recipe matches (simulator)', async () => {
  mockSearch = async () => ok([]);
  await show();
  await searchFor('soup');
  expect(screen.getByRole('button', { name: t('meal.recipes.add', { name: SOUP.name }) })).toBeTruthy();
  expect(screen.queryByText(t('meal.search.none'))).toBeNull();
});

test('one portion is said as one ("Makes 1 portion"), not "1 portions"', async () => {
  mockRecipes = async () => ok([{ ...SOUP, portions: 1 }]);
  await show();
  await searchFor('soup');
  expect(screen.getByText(t('meal.recipes.makes.one'))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t('meal.recipes.add', { name: SOUP.name }) }));
  await fireEvent.changeText(screen.getByLabelText(t('meal.item.amount', { name: SOUP.name })), '2');
  expect(screen.getByText(t('meal.item.tooManyPortions.one'))).toBeTruthy();
});
