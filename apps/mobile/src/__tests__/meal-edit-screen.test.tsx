/**
 * Correcting a meal is first class (K-407; I2 A0: one log in five was corrected, and being able to was what users
 * trusted). A logged meal opens with its items and amounts; saving replaces it — the old one deleted on the server first,
 * then the new one saved on the phone with the same time, so a failure never leaves two. Deleting asks once more. The
 * contract has no update, and the delete needs the server: offline it says so and changes nothing.
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

const EATEN_AT = '2026-09-29T05:30:00.000Z';
const MEAL: Schemas['Meal'] = {
  id: 'm1',
  clientId: 'c1',
  eatenAt: EATEN_AT,
  slot: 'BREAKFAST',
  items: [
    { foodId: 'fdc-1', name: 'Oats, rolled', amount: { quantity: 80, unit: 'g', certainty: 'WEIGHED' }, kcal: R(280, 320), proteinG: R(9, 11) },
    { foodId: 'fdc-2', name: 'Milk, whole', amount: { quantity: 1, unit: '1 cup' }, kcal: R(140, 160), proteinG: R(7, 9) },
  ],
  kcal: R(420, 480),
  proteinG: R(16, 20),
};

const calls: string[] = [];
let mockDelete: () => Promise<Answer> = async () => ({ response: new Response(null, { status: 204 }) });
const mockGET = jest.fn(async (_path: string, _init?: unknown) => ok([MEAL]));
const mockDELETE = jest.fn(async (path: string, _init?: unknown) => {
  calls.push(path);
  return mockDelete();
});
const mockPOST = jest.fn(async (_path: string, _init?: unknown) => ok({ items: [], kcal: R(1, 2), proteinG: R(0, 1) }));
const mockRecord = jest.fn(async (_record: unknown) => {
  calls.push('record');
  return true;
});
const mockBack = jest.fn();
let mockParams: Record<string, string> = { edit: 'm1', day: '2026-09-29' };
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
jest.mock('expo-router', () => ({ router: { back: () => mockBack(), push: jest.fn() }, useLocalSearchParams: () => mockParams }));
const mockServices = {
  api: { GET: mockGET, POST: mockPOST, PUT: jest.fn(), DELETE: mockDELETE },
  queue: { record: mockRecord },
  consents: { granted: async () => true, remember: jest.fn() },
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => 'METRIC' }));

beforeEach(() => {
  jest.clearAllMocks();
  calls.length = 0;
  mockDelete = async () => ({ response: new Response(null, { status: 204 }) });
  mockParams = { edit: 'm1', day: '2026-09-29' };
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <MealScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const amountField = (name: string) => screen.getByLabelText(t('meal.item.amount', { name }));

test('the meal opens as it was logged: its slot, its items, their amounts, units and weighing', async () => {
  await show();
  expect(mockGET).toHaveBeenCalledWith('/v1/meals', { params: { query: { day: '2026-09-29' } } });
  expect(screen.getByText(t('meal.editTitle'))).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: t('food.slot.BREAKFAST') })).toBeSelected();
  expect(amountField('Oats, rolled').props.value).toBe('80');
  expect(amountField('Milk, whole').props.value).toBe('1');
  expect(screen.getByRole('button', { name: t('meal.item.weighedSpoken', { name: 'Oats, rolled' }) })).toBeSelected();
  expect(screen.getByRole('button', { name: t('meal.item.unitSpoken', { name: 'Milk, whole', unit: '1 cup' }) })).toBeSelected();
});

test('saving replaces it: the old one deleted on the server first, then the new one saved with the same time', async () => {
  await show();
  await act(async () => fireEvent.changeText(amountField('Oats, rolled'), '60'));
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.save') })));
  expect(calls).toEqual(['/v1/meals/{id}', 'record']);
  expect(mockDELETE).toHaveBeenCalledWith('/v1/meals/{id}', { params: { path: { id: 'm1' } } });
  expect(mockRecord).toHaveBeenCalledWith({
    kind: 'meal',
    body: {
      clientId: expect.any(String),
      eatenAt: EATEN_AT,
      slot: 'BREAKFAST',
      items: [
        { foodId: 'fdc-1', amount: { quantity: 60, unit: 'g', certainty: 'WEIGHED' } },
        { foodId: 'fdc-2', amount: { quantity: 1, unit: '1 cup', certainty: 'ESTIMATED' } },
      ],
    },
  });
  expect(mockBack).toHaveBeenCalled();
});

test('already gone on the server (deleted elsewhere): the corrected one is still saved', async () => {
  mockDelete = async () => refused(404, 'NOT_FOUND');
  await show();
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.save') })));
  expect(mockRecord).toHaveBeenCalledTimes(1);
});

test('the delete not done (offline, a server error): nothing saved, it says a connection is needed, and stays', async () => {
  mockDelete = async () => {
    throw new TypeError('Network request failed');
  };
  await show();
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.save') })));
  expect(mockRecord).not.toHaveBeenCalled();
  expect(screen.getByText(t('meal.edit.needsConnection'))).toBeOnTheScreen();
  expect(mockBack).not.toHaveBeenCalled();

  mockDelete = async () => refused(500, 'INTERNAL');
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.save') })));
  expect(mockRecord).not.toHaveBeenCalled();
});

test('deleting asks once more, then deletes and goes back; nothing is saved', async () => {
  await show();
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.edit.delete') })));
  expect(mockDELETE).not.toHaveBeenCalled();
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.edit.confirmDelete') })));
  expect(mockDELETE).toHaveBeenCalledWith('/v1/meals/{id}', { params: { path: { id: 'm1' } } });
  expect(mockRecord).not.toHaveBeenCalled();
  expect(mockBack).toHaveBeenCalled();
});

test('a delete that fails says so and stays', async () => {
  mockDelete = async () => refused(500, 'INTERNAL');
  await show();
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.edit.delete') })));
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.edit.confirmDelete') })));
  expect(screen.getByText(t('meal.edit.needsConnection'))).toBeOnTheScreen();
  expect(mockBack).not.toHaveBeenCalled();
});

test('a meal no longer there says so, with nothing to save', async () => {
  mockGET.mockResolvedValueOnce(ok([]));
  await show();
  expect(screen.getByText(t('meal.edit.gone'))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('meal.save') })).toBeNull();
});

test('the list not readable (offline): it says a connection is needed', async () => {
  mockGET.mockRejectedValueOnce(new TypeError('Network request failed'));
  await show();
  expect(screen.getByText(t('meal.edit.needsConnection'))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('meal.save') })).toBeNull();
});

test('a new meal has no delete', async () => {
  mockParams = {};
  await show();
  expect(screen.queryByRole('button', { name: t('meal.edit.delete') })).toBeNull();
  expect(mockGET).not.toHaveBeenCalled();
});
