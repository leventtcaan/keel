/**
 * Entering a recipe (K-423, ADR-034): the meal's item flow — search or barcode, amounts left empty — plus a name and how
 * many portions it makes; health data, so the consent first (ADR-030 #25). Saved on the server (it estimates on every
 * read), under one clientId so a retry after a lost answer never makes two. A recipe's ingredients are database foods
 * only: no recipe inside a recipe.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import RecipeScreen from '@/app/recipe';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { foodParams } from '@/food/params';
import { ThemeProvider } from '@/theme/theme';

type Schemas = components['schemas'];
type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown, status = 200): Answer => ({ data, response: new Response(null, { status }) });
const refused = (status: number, code: string): Answer => ({ error: { code, message: 'x' }, response: new Response(null, { status }) });
const R = (low: number, high: number) => ({ low, high });
const LENTILS: Schemas['Food'] = { id: 'fdc-7', name: 'Lentils, dry', per100g: { kcal: R(340, 360), proteinG: R(23, 26), carbsG: R(58, 62), fatG: R(1, 2) } };

let mockGranted = true;
let mockSave: (body: Schemas['NewRecipe']) => Promise<Answer> = async (body) => ok({ ...body, id: 'r1', items: [] }, 201);
const mockPOST = jest.fn(async (path: string, init: { body: never }) => {
  if (path === '/v1/foods/search') return ok([LENTILS]);
  if (path === '/v1/food-estimates') return ok({ items: [], kcal: R(1020, 1080), proteinG: R(69, 78) });
  if (path === '/v1/recipes') return mockSave(init.body);
  return refused(404, 'NOT_FOUND');
});
const mockGET = jest.fn();
const mockPUT = jest.fn(async (_path: string, _init: unknown) => ok({ kind: 'HEALTH_DATA', status: 'GRANTED' }));
const mockBack = jest.fn();
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
jest.mock('expo-router', () => ({ router: { back: () => mockBack(), push: jest.fn() } }));
const mockServices = {
  api: { POST: mockPOST, GET: mockGET, PUT: mockPUT },
  consents: { granted: async () => mockGranted, remember: jest.fn(async () => {}) },
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));

beforeEach(() => {
  jest.clearAllMocks();
  mockGranted = true;
  mockSave = async (body) => ok({ ...body, id: 'r1', items: [] }, 201);
});

async function show() {
  await render(
    <ThemeProvider>
      <RecipeScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const press = async (name: string) => {
  await fireEvent.press(screen.getByRole('button', { name }));
  await act(async () => {});
};
async function fill() {
  await fireEvent.changeText(screen.getByLabelText(t('recipe.name')), ' Lentil soup ');
  await fireEvent.changeText(screen.getByLabelText(t('recipe.portions')), '4');
  await fireEvent.changeText(screen.getByLabelText(t('meal.search.label')), 'lentils');
  await press(t('meal.search.go'));
  await press(t('meal.search.add', { name: LENTILS.name }));
  await fireEvent.press(screen.getByRole('button', { name: t('meal.item.unitSpoken', { name: LENTILS.name, unit: t('meal.item.grams') }) }));
  await fireEvent.changeText(screen.getByLabelText(t('meal.item.amount', { name: LENTILS.name })), '300');
  await act(async () => {});
}
const saves = () => mockPOST.mock.calls.filter(([path]) => path === '/v1/recipes').map(([, init]) => init.body as Schemas['NewRecipe']);

test('without the health data consent: the consent first, then the entry', async () => {
  mockGranted = false;
  await show();
  expect(screen.getByText(t('consent.health_data.title'))).toBeTruthy();
  expect(screen.queryByLabelText(t('recipe.name'))).toBeNull();
  await press(t('meal.consent.allow'));
  expect(screen.getByLabelText(t('recipe.name'))).toBeTruthy();
});

test('saved with a part missing: each missing part is said, nothing is sent', async () => {
  await show();
  expect(screen.queryByText(t('recipe.missing.name'))).toBeNull(); // not while typing: once a save was asked for
  await press(t('recipe.save'));
  expect(screen.getByText(t('recipe.missing.name'))).toBeTruthy();
  expect(screen.getByText(t('recipe.missing.portions', { max: foodParams.recipePortionsMax }))).toBeTruthy();
  expect(screen.getByText(t('recipe.missing.items'))).toBeTruthy();
  expect(saves()).toEqual([]);
});

test('a whole recipe: the server\'s estimate of it shown, then saved as the contract asks, and back', async () => {
  await show();
  await fill();
  expect(screen.getByText(t('recipe.estimate'))).toBeTruthy();
  await press(t('recipe.save'));
  expect(saves()).toEqual([
    { clientId: expect.any(String), name: 'Lentil soup', portions: 4, items: [{ foodId: 'fdc-7', amount: { quantity: 300, unit: 'g', certainty: 'ESTIMATED' } }] },
  ]);
  expect(mockBack).toHaveBeenCalled();
});

test('offline: it says so and stays; saved again, under the same clientId (never two recipes)', async () => {
  mockSave = async () => {
    throw new TypeError('Network request failed');
  };
  await show();
  await fill();
  await press(t('recipe.save'));
  expect(screen.getByText(t('recipe.needsConnection'))).toBeTruthy();
  expect(mockBack).not.toHaveBeenCalled();
  // The server answers what it kept under this clientId — the same recipe here.
  mockSave = async (body) => ok({ ...body, id: 'r1', items: body.items.map((item) => ({ ...item, name: LENTILS.name, kcal: R(1, 2), proteinG: R(0, 1) })) }, 200);
  await press(t('recipe.save'));
  const [first, second] = saves();
  expect(second.clientId).toBe(first.clientId);
  expect(mockBack).toHaveBeenCalled();
});

test('refused by the server: it says so, by what went wrong', async () => {
  mockSave = async () => refused(400, 'VALIDATION_FAILED');
  await show();
  await fill();
  await press(t('recipe.save'));
  expect(screen.getByText(t('recipe.refused'))).toBeTruthy();
});

test('no recipe inside a recipe: the ingredient search never asks for the user\'s recipes', async () => {
  await show();
  await fill();
  expect(mockGET).not.toHaveBeenCalled();
  expect(screen.queryByText(t('meal.recipes.heading'))).toBeNull();
});

test('an earlier save went through though its answer was lost, and the recipe was changed since: it says so, and stays', async () => {
  // The server keeps the first save under this clientId and answers it again (ADR-024): the change is not in it.
  let stored: Schemas['NewRecipe'] | null = null;
  mockSave = async (body) => {
    if (stored === null) {
      stored = body;
      throw new TypeError('Network request failed'); // kept on the server, the answer lost
    }
    return ok({ ...stored, id: 'r1', items: [] }, 200);
  };
  await show();
  await fill();
  await press(t('recipe.save'));
  await fireEvent.changeText(screen.getByLabelText(t('recipe.portions')), '6');
  await press(t('recipe.save'));
  expect(screen.getByText(t('recipe.savedEarlier'))).toBeTruthy();
  expect(mockBack).not.toHaveBeenCalled();
});

test('a server failure is not called the user\'s mistake', async () => {
  mockSave = async () => refused(500, 'INTERNAL');
  await show();
  await fill();
  await press(t('recipe.save'));
  expect(screen.getByText(t('settings.serverError'))).toBeTruthy();
  expect(screen.queryByText(t('recipe.refused'))).toBeNull();
});

test('consent withdrawn meanwhile (403): the consent step; allowed, the entry is back as it was, saved under the same clientId', async () => {
  let first = true;
  mockSave = async (body) => {
    if (first) {
      first = false;
      return refused(403, 'CONSENT_REQUIRED');
    }
    return ok({ ...body, id: 'r1', items: [] }, 201);
  };
  await show();
  await fill();
  await press(t('recipe.save'));
  expect(screen.getByText(t('consent.health_data.title'))).toBeTruthy();
  await press(t('meal.consent.allow'));
  expect(screen.getByLabelText(t('recipe.name')).props.value).toBe(' Lentil soup ');
  await press(t('recipe.save'));
  const [a, b] = saves();
  expect(b.clientId).toBe(a.clientId);
  expect(mockBack).toHaveBeenCalled();
});

test('two taps at once save once', async () => {
  let answer: (a: Answer) => void = () => {};
  mockSave = () => new Promise((resolve) => (answer = resolve));
  await show();
  await fill();
  const button = screen.getByRole('button', { name: t('recipe.save') });
  // In the same frame: the second tap comes before the screen re-renders the button as busy.
  await Promise.all([fireEvent.press(button), fireEvent.press(button)]);
  await act(async () => answer(ok({ id: 'r1' }, 201)));
  expect(saves()).toHaveLength(1);
});
