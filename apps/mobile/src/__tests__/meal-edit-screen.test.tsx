/**
 * Correcting a meal is first class (K-407; I2 A0: one log in five was corrected, and being able to was what users
 * trusted). A logged meal opens with its items and amounts; saving changes it where it stands (K-1063: PATCH /v1/meals/{id},
 * nothing deleted and logged again, so a change the server refuses leaves the meal as it was). Deleting asks first, in the
 * system's alert (ADR-087 #1, K-1048), and the app's banner offers Undo. Changing needs the server: offline it says so and
 * changes nothing.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import MealScreen from '@/app/meal';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { handOffMeal, takeMeal } from '@/food/handoff';
import { ThemeProvider } from '@/theme/theme';

import { WithSaved, banner, undoButton } from './support/saved';

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
// K1 (K-1063): the screen reads more than the meal (the foods, the starred, the most logged); only /v1/meals answers with meals.
const answerGet = async (path: string, _init?: unknown): Promise<Answer> => (path === '/v1/meals' ? ok([MEAL]) : path.startsWith('/v1/foods/') && path !== '/v1/foods/{id}' ? ok([]) : refused(404, 'NOT_FOUND'));
const mockGET = jest.fn(answerGet);
const mockDELETE = jest.fn(async (path: string, _init?: unknown) => {
  calls.push(path);
  return mockDelete();
});
let mockEstimate: () => Promise<Answer> = async () => ok({ items: [], kcal: R(1, 2), proteinG: R(0, 1) });
const mockPOST = jest.fn(async (_path: string, _init?: unknown) => mockEstimate());
let mockPatch: () => Promise<Answer> = async () => ok(MEAL);
const mockPATCH = jest.fn(async (path: string, _init?: unknown) => {
  calls.push(`PATCH ${path}`);
  return mockPatch();
});
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
  api: { GET: mockGET, POST: mockPOST, PUT: mockPUT, DELETE: mockDELETE, PATCH: mockPATCH },
  queue: { record: mockRecord },
  forgetRecord: mockForget,
  consents: { granted: async () => mockGranted, remember: jest.fn() },
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => 'METRIC' }));

const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

beforeEach(() => {
  jest.clearAllMocks();
  calls.length = 0;
  mockDelete = async () => ({ response: new Response(null, { status: 204 }) });
  mockPatch = async () => ok(MEAL);
  // K1 (K-1063): items fold but the one opened; the correction opens on the first item.
  mockParams = { edit: 'm1', day: '2026-09-29', item: '0' };
  mockGranted = true;
  mockEstimate = async () => ok({ items: [], kcal: R(1, 2), proteinG: R(0, 1) });
  mockGET.mockImplementation(answerGet);
  mockPUT.mockImplementation(async () => ok({ kind: 'HEALTH_DATA', status: 'GRANTED' }));
});

function held<T>() {
  let release: (value: T) => void = () => {};
  const promise = new Promise<T>((resolve) => (release = resolve));
  return { promise, release };
}
/** The question the alert asked, and its two buttons: "Keep it" (cancel) and "Delete" (destructive). */
const question = () => {
  expect(alert).toHaveBeenCalledTimes(1);
  const [title, message, buttons] = alert.mock.calls[0] as [string, string, AlertButton[]];
  return { title, message, keep: buttons.find((b) => b.style === 'cancel')!, confirm: buttons.find((b) => b.style === 'destructive')!, buttons };
};
const askToDelete = async () => act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.edit.delete') })));
const confirmDelete = async () => act(async () => question().confirm.onPress?.());
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
      <WithSaved>
        <MealScreen />
      </WithSaved>
    </ThemeProvider>,
  );
  await act(async () => {});
}
/** Opens a folded item (only the open one shows its amount). */
const openItem = async (name: string) => act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.item.open', { name }) })));
const amountField = (name: string) => screen.getByLabelText(t('meal.item.amount', { name }));

test('the meal opens as it was logged: its slot, its items, their amounts, units and weighing; the others fold to a line', async () => {
  await show();
  expect(mockGET).toHaveBeenCalledWith('/v1/meals', { params: { query: { day: '2026-09-29' } } });
  expect(screen.getByText(t('meal.editTitle'))).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: t('food.slot.BREAKFAST') })).toBeSelected();
  expect(amountField('Oats, rolled').props.value).toBe('80');
  expect(screen.getByRole('switch', { name: t('meal.item.weighedSpoken', { name: 'Oats, rolled' }) }).props.value).toBe(true);
  expect(screen.queryByLabelText(t('meal.item.amount', { name: 'Milk, whole' }))).toBeNull();
  await openItem('Milk, whole');
  expect(amountField('Milk, whole').props.value).toBe('1');
  expect(screen.getByRole('button', { name: t('meal.item.unitSpoken', { name: 'Milk, whole', unit: '1 cup' }) })).toBeSelected();
});

test('saving changes it where it stands: one PATCH with the items and the slot; nothing deleted, nothing logged again; no banner (K-1063)', async () => {
  await show();
  await act(async () => fireEvent.changeText(amountField('Oats, rolled'), '60'));
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.edit.save') })));
  expect(banner()).toBeNull();
  expect(calls).toEqual(['PATCH /v1/meals/{id}']);
  expect(mockPATCH).toHaveBeenCalledWith('/v1/meals/{id}', {
    params: { path: { id: 'm1' } },
    body: {
      slot: 'BREAKFAST',
      items: [
        { foodId: 'fdc-1', amount: { quantity: 60, unit: 'g', certainty: 'WEIGHED' } },
        { foodId: 'fdc-2', amount: { quantity: 1, unit: '1 cup', certainty: 'ESTIMATED' } },
      ],
    },
  });
  expect(mockDELETE).not.toHaveBeenCalled();
  expect(mockRecord).not.toHaveBeenCalled();
  expect(mockBack).toHaveBeenCalled();
});

test('already gone on the server (deleted elsewhere): it says so and saves nothing', async () => {
  mockPatch = async () => refused(404, 'NOT_FOUND');
  await show();
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.edit.save') })));
  expect(screen.getByText(t('meal.edit.gone'))).toBeOnTheScreen();
  expect(mockRecord).not.toHaveBeenCalled();
  expect(mockBack).not.toHaveBeenCalled();
});

test('the change not done (offline, a server error): it says a connection is needed, or that it could not be saved, and stays', async () => {
  mockPatch = async () => {
    throw new TypeError('Network request failed');
  };
  await show();
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.edit.save') })));
  expect(screen.getByText(t('meal.edit.needsConnection'))).toBeOnTheScreen();
  expect(mockBack).not.toHaveBeenCalled();

  mockPatch = async () => refused(500, 'INTERNAL');
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.edit.save') })));
  expect(screen.getByText(t('meal.saveFailed'))).toBeOnTheScreen();
  expect(mockRecord).not.toHaveBeenCalled();
  expect(mockDELETE).not.toHaveBeenCalled();
});

test('deleting asks first, in a system alert: nothing is deleted until the destructive button; Keep it changes nothing', async () => {
  await show();
  await askToDelete();
  const { title, message, buttons, keep } = question();
  expect(title).toBe(t('meal.edit.confirmTitle'));
  expect(message).toBe(t('meal.edit.confirmBody'));
  expect(buttons.map((b) => [b.text, b.style])).toEqual([
    [t('meal.edit.keep'), 'cancel'],
    [t('meal.edit.confirm'), 'destructive'],
  ]);
  // Nothing inline: no second button on the page to find at the foot of a long list.
  expect(screen.queryByRole('button', { name: t('meal.edit.confirm') })).toBeNull();
  expect(mockDELETE).not.toHaveBeenCalled();
  await act(async () => keep.onPress?.());
  expect(mockDELETE).not.toHaveBeenCalled();
  expect(mockBack).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: t('meal.edit.delete') })).toBeOnTheScreen();
});

test('the destructive button deletes and goes back; the banner says Deleted and Undo logs the meal again as it was (K-1063)', async () => {
  await show();
  await askToDelete();
  expect(mockDELETE).not.toHaveBeenCalled();
  await confirmDelete();
  expect(mockDELETE).toHaveBeenCalledWith('/v1/meals/{id}', { params: { path: { id: 'm1' } } });
  expect(mockRecord).not.toHaveBeenCalled();
  expect(mockBack).toHaveBeenCalled();
  expect(within(banner()!).getByText(t('food.deleted.lead'))).toBeOnTheScreen();
  expect(within(banner()!).getByText(t('food.slot.BREAKFAST'))).toBeOnTheScreen();
  await act(async () => fireEvent.press(undoButton()));
  expect(mockRecord).toHaveBeenCalledWith({
    kind: 'meal',
    body: {
      clientId: expect.any(String),
      eatenAt: EATEN_AT,
      slot: 'BREAKFAST',
      items: [
        { foodId: 'fdc-1', amount: { quantity: 80, unit: 'g', certainty: 'WEIGHED' } },
        { foodId: 'fdc-2', amount: { quantity: 1, unit: '1 cup' } },
      ],
    },
  });
});

test('a delete that fails says so and stays; one that cannot reach the server says a connection is needed', async () => {
  mockDelete = async () => refused(500, 'INTERNAL');
  await show();
  await askToDelete();
  await confirmDelete();
  expect(screen.getByText(t('food.deleted.failed'))).toBeOnTheScreen();
  expect(mockBack).not.toHaveBeenCalled();
  mockDelete = async () => {
    throw new TypeError('Network request failed');
  };
  alert.mockClear();
  await askToDelete();
  await confirmDelete();
  expect(screen.getByText(t('meal.edit.needsConnection'))).toBeOnTheScreen();
});

test('a meal no longer there says so, with nothing to save', async () => {
  mockGET.mockResolvedValueOnce(ok([]));
  await show();
  expect(screen.getByText(t('meal.edit.gone'))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('meal.edit.save') })).toBeNull();
});

test('the list not readable (offline): it says a connection is needed', async () => {
  mockGET.mockRejectedValueOnce(new TypeError('Network request failed'));
  await show();
  expect(screen.getByText(t('meal.edit.needsConnection'))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('meal.edit.save') })).toBeNull();
});

test('correcting a meal: the primary button says Save, not Log it (a new meal keeps Log it)', async () => {
  await show();
  expect(screen.getByRole('button', { name: t('meal.edit.save') })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('meal.save') })).toBeNull();
});

test('a new meal has no delete', async () => {
  mockParams = {};
  await show();
  expect(screen.queryByRole('button', { name: t('meal.edit.delete') })).toBeNull();
  expect(mockGET).not.toHaveBeenCalledWith('/v1/meals', { params: { query: { day: '2026-09-29' } } });
});

describe('review', () => {
  test('an amount the server would refuse changes nothing: the meal stays as it was, and it says it could not be saved', async () => {
    mockEstimate = async () => refused(400, 'VALIDATION_FAILED'); // 100 cups of milk: past 5000 g, the phone does not know a cup's grams here
    mockPatch = async () => refused(400, 'VALIDATION_FAILED');
    await show();
    await openItem('Milk, whole');
    await act(async () => fireEvent.changeText(amountField('Milk, whole'), '100'));
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.edit.save') })));
    expect(mockDELETE).not.toHaveBeenCalled();
    expect(mockRecord).not.toHaveBeenCalled();
    expect(screen.getByText(t('meal.saveFailed'))).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
  });

  test("the phone's copy of a deleted meal is forgotten, so it does not come back offline", async () => {
    await show();
    await act(async () => fireEvent.press(screen.getAllByRole('button', { name: t('meal.edit.delete') })[0]));
    await confirmDelete();
    expect(mockForget).toHaveBeenCalledWith('c1');
  });

  test('a change that failed can be saved again, with the same amounts: one meal, changed once', async () => {
    mockPatch = async () => refused(500, 'INTERNAL');
    await show();
    await act(async () => fireEvent.changeText(amountField('Oats, rolled'), '60'));
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.edit.save') })));
    expect(screen.getByText(t('meal.saveFailed'))).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
    expect(amountField('Oats, rolled').props.value).toBe('60');

    mockPatch = async () => ok(MEAL);
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.edit.save') })));
    expect(mockPATCH).toHaveBeenCalledTimes(2);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('save pressed twice while the change is on its way: one change', async () => {
    const answer = held<Answer>();
    mockPatch = () => answer.promise;
    await show();
    await pressTwice(t('meal.edit.save'));
    await act(async () => answer.release(ok(MEAL)));
    expect(mockPATCH).toHaveBeenCalledTimes(1);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('the alert\'s Delete pressed twice: one delete', async () => {
    await show();
    await askToDelete();
    const { confirm } = question();
    await act(async () => {
      confirm.onPress?.();
      confirm.onPress?.();
    });
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
    expect(screen.queryByRole('button', { name: t('meal.edit.save') })).toBeNull();
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
    mockGET.mockImplementation(async (path: string) => (path === '/v1/recipes' ? ok([]) : path === '/v1/meals' ? ok([RECIPE_MEAL]) : refused(404, 'NOT_FOUND')));
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
    expect(screen.getByRole('button', { name: t('meal.edit.save') }).props.accessibilityState.disabled).toBe(true);
    expect(mockDELETE).not.toHaveBeenCalled();
  });
});

test("a correction reads its own meal: a meal the coach handed over is not mixed in, and is cleared (K-509 review)", async () => {
  handOffMeal([{ foodId: 'fdc-999', name: 'Handed food', quantity: 1, unit: 'g' }]);
  await show();
  expect(screen.queryByText('Handed food')).toBeNull();
  expect(takeMeal()).toBeNull();
});
