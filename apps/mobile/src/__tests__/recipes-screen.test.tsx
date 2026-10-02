/**
 * Your recipes (K-423, ADR-034): each with its portions and the range per portion the database gives now (U1, U5); one
 * whose ingredient the database dropped is marked — it can still be deleted. Deleting asks first (meals that logged it
 * keep what they logged). Read again whenever the screen comes into view (back from a new recipe).
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

import RecipesScreen from '@/app/recipes';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';

type Recipe = components['schemas']['Recipe'];
type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown, status = 200): Answer => ({ data, response: new Response(null, { status }) });
const refused = (status: number, code: string): Answer => ({ error: { code, message: 'x' }, response: new Response(null, { status }) });
const R = (low: number, high: number) => ({ low, high });
const SOUP: Recipe = {
  id: '11111111-1111-4111-8111-111111111111',
  clientId: 'c1',
  name: 'Lentil soup',
  portions: 4,
  items: [],
  perPortion: { kcal: R(250, 300), proteinG: R(14, 17), carbsG: R(35, 42), fatG: R(5, 8) },
};
const STEW: Recipe = { ...SOUP, id: '33333333-3333-4333-8333-333333333333', name: 'Bean stew', portions: 1, unavailable: ['fdc-9'], perPortion: undefined };

let mockList: () => Promise<Answer> = async () => ok([SOUP, STEW]);
const mockDELETE = jest.fn(async (_path: string, _init: unknown) => ok(undefined, 204));
const mockPush = jest.fn();
const mockBack = jest.fn();
let mockRefocus: () => void = () => {};
const mockServices = {
  api: { GET: jest.fn(async (_path: string) => mockList()), DELETE: mockDELETE },
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args), back: () => mockBack() },
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(() => {
      mockRefocus = effect;
      effect();
    }, [effect]);
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockList = async () => ok([SOUP, STEW]);
});

async function show() {
  await render(
    <ThemeProvider>
      <RecipesScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}

test('each recipe with its portions and the range per portion; one the database can no longer estimate, marked', async () => {
  await show();
  expect(screen.getByText(SOUP.name)).toBeTruthy();
  expect(screen.getByText(t('recipes.makes.other', { portions: 4 }))).toBeTruthy();
  expect(screen.getByText(t('recipes.makes.one'))).toBeTruthy();
  expect(screen.getByText(t('recipes.perPortion', { low: 250, high: 300 }))).toBeTruthy();
  expect(screen.getByText(STEW.name)).toBeTruthy();
  expect(screen.getByText(t('recipes.unavailable'))).toBeTruthy();
});

test('none yet: it says how recipes work, and a new one is one tap', async () => {
  mockList = async () => ok([]);
  await show();
  expect(screen.getByText(t('recipes.none'))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t('recipes.new') }));
  expect(mockPush).toHaveBeenCalledWith('/recipe');
});

test('deleting asks first; kept, nothing happens; confirmed, it is deleted and the list read again', async () => {
  await show();
  await fireEvent.press(screen.getByRole('button', { name: t('recipes.deleteSpoken', { name: STEW.name }) }));
  expect(screen.getByText(t('recipes.confirmTitle', { name: STEW.name }))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t('recipes.keep') }));
  expect(mockDELETE).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: t('recipes.deleteSpoken', { name: STEW.name }) }));
  mockList = async () => ok([SOUP]);
  await fireEvent.press(screen.getByRole('button', { name: t('recipes.confirm') }));
  await act(async () => {});
  expect(mockDELETE).toHaveBeenCalledWith('/v1/recipes/{id}', { params: { path: { id: STEW.id } } });
  expect(screen.queryByText(STEW.name)).toBeNull();
});

test('a delete that fails says so and keeps the recipe', async () => {
  mockDELETE.mockRejectedValueOnce(new TypeError('Network request failed'));
  await show();
  await fireEvent.press(screen.getByRole('button', { name: t('recipes.deleteSpoken', { name: SOUP.name }) }));
  await fireEvent.press(screen.getByRole('button', { name: t('recipes.confirm') }));
  await act(async () => {});
  expect(screen.getByText(t('recipes.deleteFailed'))).toBeTruthy();
  expect(screen.getByText(SOUP.name)).toBeTruthy();
});

test('offline: it says so, and can try again', async () => {
  mockList = async () => {
    throw new TypeError('Network request failed');
  };
  await show();
  expect(screen.getByText(t('recipes.failed'))).toBeTruthy();
  mockList = async () => ok([SOUP]);
  await fireEvent.press(screen.getByRole('button', { name: t('recipes.retry') }));
  await act(async () => {});
  expect(screen.getByText(SOUP.name)).toBeTruthy();
});

test('without the health data consent: it says recipes need it, and where to give it', async () => {
  mockList = async () => refused(403, 'CONSENT_REQUIRED');
  await show();
  expect(screen.getByText(t('recipes.consent'))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t('recipes.openSettings') }));
  expect(mockPush).toHaveBeenCalledWith('/settings');
});

test('read again when the screen comes back into view (a recipe just entered)', async () => {
  mockList = async () => ok([]);
  await show();
  mockList = async () => ok([SOUP]);
  await act(async () => mockRefocus());
  expect(screen.getByText(SOUP.name)).toBeTruthy();
});

test('a way back to the Food tab (the stack has no header)', async () => {
  await show();
  await fireEvent.press(screen.getByRole('button', { name: t('recipes.back') }));
  expect(mockBack).toHaveBeenCalled();
});

test('already gone on the server (404) counts as deleted', async () => {
  mockDELETE.mockResolvedValueOnce(refused(404, 'NOT_FOUND'));
  await show();
  await fireEvent.press(screen.getByRole('button', { name: t('recipes.deleteSpoken', { name: SOUP.name }) }));
  mockList = async () => ok([STEW]);
  await fireEvent.press(screen.getByRole('button', { name: t('recipes.confirm') }));
  await act(async () => {});
  expect(screen.queryByText(t('recipes.deleteFailed'))).toBeNull();
  expect(screen.queryByText(SOUP.name)).toBeNull();
});

test('the question to delete sits with the recipe it is about (a long list never hides it below the fold)', async () => {
  await show();
  await fireEvent.press(screen.getByRole('button', { name: t('recipes.deleteSpoken', { name: SOUP.name }) }));
  const row = screen.getByTestId(`recipe-${SOUP.id}`);
  expect(within(row).getByText(t('recipes.confirmTitle', { name: SOUP.name }))).toBeTruthy();
});
