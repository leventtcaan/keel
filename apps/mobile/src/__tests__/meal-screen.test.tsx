/**
 * Logging a meal (K-407): the health data consent first when it is not given (ADR-030 #25); then the slot, foods found by
 * name in the database, an amount for each (nothing filled in for the user), and the server's estimate as ranges before
 * saving (U1, U5) — with its one question when one item dominates the range. Saved on the phone first (K-304).
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
let mockSearch: () => Promise<Answer> = async () => ok([RICE, CHICKEN]);
const mockPOST = jest.fn(async (path: string, init: { body: never }) => {
  if (path === '/v1/foods/search') return mockSearch();
  if (path === '/v1/food-estimates') return ok(estimateOf(init.body));
  return refused(404, 'NOT_FOUND');
});
const mockPUT = jest.fn(async (_path: string, _init: unknown) => ok({ kind: 'HEALTH_DATA', status: 'GRANTED' }));
const mockRecord = jest.fn(async (_record: unknown) => true);
const mockRemember = jest.fn(async () => {});
const mockBack = jest.fn();
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
jest.mock('expo-router', () => ({ router: { back: () => mockBack(), push: jest.fn() }, useLocalSearchParams: () => ({}) }));
const mockServices = {
  api: { POST: mockPOST, PUT: mockPUT, GET: jest.fn(), DELETE: jest.fn() },
  queue: { record: mockRecord },
  consents: { granted: async () => mockGranted, remember: mockRemember },
  report: () => {},
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
  mockGranted = true;
  mockSearch = async () => ok([RICE, CHICKEN]);
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <MealScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
async function search(text: string) {
  await fireEvent.changeText(screen.getByLabelText(t('meal.search.label')), text);
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.search.go') })));
}
async function add(food: Schemas['Food']) {
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.search.add', { name: food.name }) })));
}
async function amount(food: Schemas['Food'], text: string) {
  await act(async () => fireEvent.changeText(screen.getByLabelText(t('meal.item.amount', { name: food.name })), text));
}
const kcal = (low: number, high: number) => `${t('format.range', { low, high })} ${t('food.budget.kcalUnit')}`;
const estimates = () => mockPOST.mock.calls.filter(([path]) => path === '/v1/food-estimates');

describe('without the health data consent', () => {
  test('the consent comes first, and nothing can be typed (ADR-030 #25)', async () => {
    mockGranted = false;
    await show();
    expect(screen.getByText(t('consent.health_data.title'))).toBeOnTheScreen();
    expect(screen.queryByLabelText(t('meal.search.label'))).toBeNull();
  });

  test('allowing it records the consent, on the server and on the phone, and opens the entry', async () => {
    mockGranted = false;
    await show();
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.consent.allow') })));
    expect(mockPUT).toHaveBeenCalledWith('/v1/consents/{kind}', expect.objectContaining({ params: { path: { kind: 'HEALTH_DATA' } } }));
    expect(mockRemember).toHaveBeenCalledWith('HEALTH_DATA', 'GRANTED');
    expect(screen.getByLabelText(t('meal.search.label'))).toBeOnTheScreen();
  });

  test('not now goes back, with nothing kept', async () => {
    mockGranted = false;
    await show();
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.consent.notNow') })));
    expect(mockBack).toHaveBeenCalled();
    expect(mockRecord).not.toHaveBeenCalled();
  });
});

describe('finding a food', () => {
  test('by name, in the database (a POST: the words stay out of URLs, V3)', async () => {
    await show();
    await search(' rice ');
    expect(mockPOST).toHaveBeenCalledWith('/v1/foods/search', { body: { q: 'rice', limit: 20 } });
    expect(screen.getByRole('button', { name: t('meal.search.add', { name: RICE.name }) })).toBeOnTheScreen();
  });

  test("the keyboard's search key searches; the words are taken as typed — no capital, no autocorrect (simulator: a Turkish keyboard made 'Chıcken')", async () => {
    await show();
    const field = screen.getByLabelText(t('meal.search.label'));
    expect(field.props).toMatchObject({ autoCapitalize: 'none', autoCorrect: false, returnKeyType: 'search' });
    await fireEvent.changeText(field, 'rice');
    await act(async () => fireEvent(field, 'submitEditing'));
    expect(mockPOST).toHaveBeenCalledWith('/v1/foods/search', { body: { q: 'rice', limit: 20 } });
  });

  test('a search shorter than the server takes is not sent', async () => {
    await show();
    await search('r');
    expect(mockPOST).not.toHaveBeenCalled();
    expect(screen.getByText(t('meal.search.tooShort'))).toBeOnTheScreen();
  });

  test('nothing found says so; no connection says so', async () => {
    await show();
    mockSearch = async () => ok([]);
    await search('zzz');
    expect(screen.getByText(t('meal.search.none'))).toBeOnTheScreen();
    mockSearch = async () => {
      throw new TypeError('Network request failed');
    };
    await search('rice');
    expect(screen.getByText(t('meal.search.failed'))).toBeOnTheScreen();
  });
});

describe('the amounts and the estimate', () => {
  test('a food comes in with its amount empty — nothing is guessed — and saving waits for it', async () => {
    await show();
    await search('rice');
    await add(RICE);
    expect(screen.getByLabelText(t('meal.item.amount', { name: RICE.name })).props.value).toBe('');
    expect(screen.getByRole('button', { name: t('meal.save') })).toBeDisabled();
    expect(estimates()).toHaveLength(0);
  });

  test("with every amount given, the server's estimate as ranges: each item, the meal's energy and protein (U1, U5)", async () => {
    await show();
    await search('rice');
    await add(RICE);
    await amount(RICE, '1,5');
    expect(estimates().at(-1)?.[1]).toEqual({
      body: { items: [{ foodId: 'fdc-3', amount: { quantity: 1.5, unit: '1 cup', certainty: 'ESTIMATED' } }] },
    });
    expect(screen.getByText(kcal(170, 240))).toBeOnTheScreen();
    expect(screen.getByText(kcal(380, 530))).toBeOnTheScreen();
    expect(screen.getByText(`${t('format.range', { low: 40, high: 52 })} ${t('food.budget.proteinUnit')}`)).toBeOnTheScreen();
  });

  test("the estimate's one question, and weighing answers it: the item goes as weighed", async () => {
    await show();
    await search('chicken');
    await add(CHICKEN);
    await amount(CHICKEN, '150');
    // Named: with several items the question says which one it is about (simulator).
    const question = t('meal.estimate.question', { name: CHICKEN.name, question: t('foodEstimate.question.grams') });
    expect(screen.getByText(question)).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.item.weighedSpoken', { name: CHICKEN.name }) })));
    expect(estimates().at(-1)?.[1]).toEqual({ body: { items: [{ foodId: 'fdc-4', amount: { quantity: 150, unit: 'g', certainty: 'WEIGHED' } }] } });
    expect(screen.queryByText(question)).toBeNull();
  });

  test('a serving or grams, one tap each', async () => {
    await show();
    await search('rice');
    await add(RICE);
    await act(async () =>
      fireEvent.press(screen.getByRole('button', { name: t('meal.item.unitSpoken', { name: RICE.name, unit: t('meal.item.grams') }) })),
    );
    await amount(RICE, '200');
    expect(estimates().at(-1)?.[1]).toEqual({ body: { items: [{ foodId: 'fdc-3', amount: { quantity: 200, unit: 'g', certainty: 'ESTIMATED' } }] } });
  });

  test('more than the contract takes is named, and nothing is estimated or saved', async () => {
    await show();
    await search('rice');
    await add(RICE);
    await amount(RICE, '40'); // 40 cups: 6320 g
    expect(screen.getByText(t('meal.item.tooMuch'))).toBeOnTheScreen();
    expect(estimates()).toHaveLength(0);
    expect(screen.getByRole('button', { name: t('meal.save') })).toBeDisabled();
  });

  test('an item can be taken out', async () => {
    await show();
    await search('rice');
    await add(RICE);
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.item.removeSpoken', { name: RICE.name }) })));
    expect(screen.queryByLabelText(t('meal.item.amount', { name: RICE.name }))).toBeNull();
  });
});

describe('saving', () => {
  test('on the phone first, in the slot the clock suggests, then back', async () => {
    await show();
    expect(screen.getByRole('button', { name: t('food.slot.LUNCH') })).toBeSelected();
    await search('rice');
    await add(RICE);
    await amount(RICE, '1');
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.save') })));
    expect(mockRecord).toHaveBeenCalledWith({
      kind: 'meal',
      body: {
        clientId: expect.any(String),
        eatenAt: new Date(2026, 8, 29, 13, 0).toISOString(),
        slot: 'LUNCH',
        items: [{ foodId: 'fdc-3', amount: { quantity: 1, unit: '1 cup', certainty: 'ESTIMATED' } }],
      },
    });
    expect(mockBack).toHaveBeenCalled();
  });

  test('another slot is one tap', async () => {
    await show();
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('food.slot.SNACK') })));
    await search('rice');
    await add(RICE);
    await amount(RICE, '1');
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.save') })));
    expect(mockRecord).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ slot: 'SNACK' }) }));
  });

  test('saved without an estimate when the server could not be reached: the queue sends it later', async () => {
    mockPOST.mockImplementation(async (path: string) => {
      if (path === '/v1/foods/search') return ok([RICE]);
      throw new TypeError('Network request failed');
    });
    await show();
    await search('rice');
    await add(RICE);
    await amount(RICE, '1');
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.save') })));
    expect(mockRecord).toHaveBeenCalledTimes(1);
  });

  test('a phone that cannot save says so and stays', async () => {
    mockRecord.mockRejectedValueOnce(new Error('disk'));
    await show();
    await search('rice');
    await add(RICE);
    await amount(RICE, '1');
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.save') })));
    expect(screen.getByText(t('meal.saveFailed'))).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
  });
});
