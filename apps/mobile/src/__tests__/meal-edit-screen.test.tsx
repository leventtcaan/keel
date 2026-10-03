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
import { handOffMeal, takeMeal } from '@/food/handoff';
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
const mockPUT = jest.fn(async (_path: string, _init?: unknown) => ok({ kind: 'HEALTH_DATA', status: 'GRANTED' }));
const mockGET = jest.fn(async (_path: string, _init?: unknown) => ok([MEAL]));
const mockDELETE = jest.fn(async (path: string, _init?: unknown) => {
  calls.push(path);
  return mockDelete();
});
let mockEstimate: () => Promise<Answer> = async () => ok({ items: [], kcal: R(1, 2), proteinG: R(0, 1) });
const mockPOST = jest.fn(async (_path: string, _init?: unknown) => mockEstimate());
const mockForget = jest.fn(async (_clientId: string) => {});
const mockRecord = jest.fn(async (_record: unknown) => {
  calls.push('record');
  return true;
});
const mockBack = jest.fn();
let mockParams: Record<string, string> = { edit: 'm1', day: '2026-09-29' };
let mockGranted = true;
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
jest.mock('expo-router', () => ({ router: { back: () => mockBack(), push: jest.fn() }, useLocalSearchParams: () => mockParams }));
const mockServices = {
  api: { GET: mockGET, POST: mockPOST, PUT: mockPUT, DELETE: mockDELETE },
  queue: { record: mockRecord },
  forgetRecord: mockForget,
  consents: { granted: async () => mockGranted, remember: jest.fn() },
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => 'METRIC' }));

beforeEach(() => {
  jest.clearAllMocks();
  calls.length = 0;
  mockDelete = async () => ({ response: new Response(null, { status: 204 }) });
  mockParams = { edit: 'm1', day: '2026-09-29' };
  mockGranted = true;
  mockEstimate = async () => ok({ items: [], kcal: R(1, 2), proteinG: R(0, 1) });
  mockGET.mockImplementation(async () => ok([MEAL]));
  mockPUT.mockImplementation(async () => ok({ kind: 'HEALTH_DATA', status: 'GRANTED' }));
});

function held<T>() {
  let release: (value: T) => void = () => {};
  const promise = new Promise<T>((resolve) => (release = resolve));
  return { promise, release };
}
const pressTwice = async (name: string) => {
  const press = (screen.getByRole('button', { name }).props as { onClick: (event: object) => void }).onClick;
  await act(async () => {
    press({ nativeEvent: {} });
    press({ nativeEvent: {} });
  });
};

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

describe('review', () => {
  test('a serving amount the server would refuse deletes nothing: saving waits for the server to take these amounts', async () => {
    mockEstimate = async () => refused(400, 'VALIDATION_FAILED'); // 100 cups of milk: past 5000 g, the phone does not know a cup's grams here
    await show();
    await act(async () => fireEvent.changeText(amountField('Milk, whole'), '100'));
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.save') })));
    expect(mockDELETE).not.toHaveBeenCalled();
    expect(mockRecord).not.toHaveBeenCalled();
    expect(screen.getByText(t('meal.edit.notChecked'))).toBeOnTheScreen();
  });

  test('a delete whose answer was lost, but which the server did: the day read again shows it gone, so the correction is saved', async () => {
    mockDelete = async () => {
      throw new TypeError('Network request failed');
    };
    await show();
    mockGET.mockImplementation(async () => ok([]));
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.save') })));
    expect(mockRecord).toHaveBeenCalledTimes(1);
    expect(mockBack).toHaveBeenCalled();
  });

  test("the phone's copy of the replaced or deleted meal is forgotten, so it does not come back offline", async () => {
    await show();
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.save') })));
    expect(mockForget).toHaveBeenCalledWith('c1');

    jest.clearAllMocks();
    await show();
    await act(async () => fireEvent.press(screen.getAllByRole('button', { name: t('meal.edit.delete') })[0]));
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.edit.confirmDelete') })));
    expect(mockForget).toHaveBeenCalledWith('c1');
  });

  test('the delete done but the phone could not save: it says so and stays; saving again saves it, with the same time and amounts', async () => {
    mockRecord.mockImplementationOnce(async () => {
      calls.push('record');
      throw new Error('disk');
    });
    await show();
    await act(async () => fireEvent.changeText(amountField('Oats, rolled'), '60'));
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.save') })));
    expect(screen.getByText(t('meal.saveFailed'))).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
    expect(amountField('Oats, rolled').props.value).toBe('60');

    mockDelete = async () => refused(404, 'NOT_FOUND');
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.save') })));
    expect(calls).toEqual(['/v1/meals/{id}', 'record', '/v1/meals/{id}', 'record']);
    expect(mockRecord).toHaveBeenLastCalledWith(expect.objectContaining({ body: expect.objectContaining({ eatenAt: EATEN_AT }) }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('save pressed twice while the delete is on its way: one delete, one meal', async () => {
    const answer = held<Answer>();
    mockDelete = () => answer.promise;
    await show();
    await pressTwice(t('meal.save'));
    await act(async () => answer.release({ response: new Response(null, { status: 204 }) }));
    expect(mockDELETE).toHaveBeenCalledTimes(1);
    expect(mockRecord).toHaveBeenCalledTimes(1);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('"delete it" pressed twice: one delete', async () => {
    await show();
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.edit.delete') })));
    await pressTwice(t('meal.edit.confirmDelete'));
    expect(mockDELETE).toHaveBeenCalledTimes(1);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('the consent comes before the meal is read; once given, the meal opens', async () => {
    mockGranted = false;
    await show();
    expect(mockGET).not.toHaveBeenCalled();
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.consent.allow') })));
    expect(amountField('Oats, rolled').props.value).toBe('80');
  });

  test('while the meal is read: no save, no delete', async () => {
    mockGET.mockImplementation(() => new Promise(() => {}));
    await show();
    expect(screen.queryByRole('button', { name: t('meal.save') })).toBeNull();
    expect(screen.queryByRole('button', { name: t('meal.edit.delete') })).toBeNull();
  });

  test('a correction link without its day says the meal is not there, not an endless wait', async () => {
    mockParams = { edit: 'm1' };
    await show();
    expect(screen.getByText(t('meal.edit.gone'))).toBeOnTheScreen();
  });
});

describe('a meal with a recipe in it (K-423)', () => {
  const RECIPE_MEAL: Schemas['Meal'] = {
    ...MEAL,
    items: [{ foodId: 'recipe:r1', name: 'Lentil soup', amount: { quantity: 1, unit: 'portion', certainty: 'ESTIMATED' }, kcal: R(250, 300), proteinG: R(14, 17) }],
  };

  test('the recipe since deleted: the item says so; nothing is saved and the logged meal is not deleted', async () => {
    mockGET.mockImplementation(async (path: string) => (path === '/v1/recipes' ? ok([]) : ok([RECIPE_MEAL])));
    mockEstimate = async () => ({ error: { code: 'VALIDATION_FAILED', message: 'x' }, response: new Response(null, { status: 400 }) });
    await render(
      <ThemeProvider>
        <MealScreen />
      </ThemeProvider>,
    );
    await act(async () => {});
    await act(async () => {});
    expect(screen.getByText(t('meal.item.recipeGone'))).toBeTruthy();
    expect(screen.queryByText(t('meal.edit.notChecked'))).toBeNull(); // the item's own reason, not "check your connection"
    expect(screen.getByRole('button', { name: t('meal.save') }).props.accessibilityState.disabled).toBe(true);
    expect(mockDELETE).not.toHaveBeenCalled();
  });
});

test("a correction reads its own meal: a meal the coach handed over is not mixed in, and is cleared (K-509 review)", async () => {
  handOffMeal([{ foodId: 'fdc-999', name: 'Handed food', quantity: 1, unit: 'g' }]);
  await show();
  expect(screen.queryByText('Handed food')).toBeNull();
  expect(takeMeal()).toBeNull();
});
