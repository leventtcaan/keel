/**
 * Logging a meal (K-407; Evre 7 A): the health data consent first when it is not given (ADR-030 #25); then the meal, foods found by
 * name in the database, and for the one chosen its portion step: an amount (filled with 1 serving or 100 g, ADR-085) and the server's
 * estimate (U1, U5) — with its one question when it dominates the range. "Add to Lunch" keeps the food on the phone first (K-304) and
 * the screen stays open: the tray grows and a light "Added · Undo" stands above the foot (a meal the coach read, to confirm, is the
 * items screen: MealItems).
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

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

const RICE: Schemas['Food'] = {
  id: 'fdc-3',
  name: 'Rice, white, cooked',
  per100g: { kcal: R(120, 140), proteinG: R(2, 3), carbsG: R(26, 30), fatG: R(0, 1) },
  servings: [{ name: '1 bowl', grams: 158 }],
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
let mockSearch: (q: string) => Promise<Answer> = async () => ok([RICE, CHICKEN]);
let mockEstimate: (request: Schemas['FoodEstimateRequest']) => Promise<Answer> = async (request) => ok(estimateOf(request));
const post = async (path: string, init: { body: never }) => {
  if (path === '/v1/foods/search') return mockSearch((init.body as { q: string }).q);
  if (path === '/v1/food-estimates') return mockEstimate(init.body);
  return refused(404, 'NOT_FOUND');
};
const mockPOST = jest.fn(post);
const mockPUT = jest.fn(async (_path: string, _init: unknown) => ok({ kind: 'HEALTH_DATA', status: 'GRANTED' }));
/** What the phone has kept and not sent: the tray reads it (the server's list is not there in these tests). */
let mockLocal: unknown[] = [];
const mockRecord = jest.fn(async (record: unknown) => {
  const { body } = record as { body: { clientId: string } };
  mockLocal.push({ seq: mockLocal.length, clientId: body.clientId, kind: 'meal', parentClientId: null, body, state: 'PENDING', serverId: null, serverBody: null, errorCode: null });
  return true;
});
const mockRemember = jest.fn(async () => {});
const mockBack = jest.fn();
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
jest.mock('expo-router', () => ({ router: { back: () => mockBack(), push: jest.fn(), dismissTo: jest.fn() }, useLocalSearchParams: () => ({}) }));
const mockServices = {
  api: { POST: mockPOST, PUT: mockPUT, GET: jest.fn(async (_path: string, _init?: unknown) => ({ error: { code: 'NOT_FOUND', message: 'x' }, response: new Response(null, { status: 404 }) })), DELETE: jest.fn(async (_path: string, _init?: unknown) => ({ response: new Response(null, { status: 204 }) })) },
  queue: { record: mockRecord, drain: jest.fn(async () => {}) },
  mealRecords: async () => mockLocal,
  recentFoods: async () => [],
  // The real take-back is tested on its own (sync-take-back.test.ts): here it only runs the server delete it is given.
  takeBack: jest.fn(async (_clientId: string, remove: (serverId: string) => Promise<number>) => {
    await remove('srv-meal-1');
    return 'taken' as const;
  }),
  consents: { granted: async () => mockGranted, remember: mockRemember },
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
  mockLocal = [];
  mockPOST.mockImplementation(post);
  mockPUT.mockImplementation(async () => ok({ kind: 'HEALTH_DATA', status: 'GRANTED' }));
  mockGranted = true;
  mockSearch = async () => ok([RICE, CHICKEN]);
  mockEstimate = async (request) => ok(estimateOf(request));
});

/** A promise and the hand that settles it, for answers that arrive in an order the test chooses. */
function held<T>() {
  let release: (value: T) => void = () => {};
  const promise = new Promise<T>((resolve) => (release = resolve));
  return { promise, release };
}

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
async function amount(food: Schemas['Food'], text: string) {
  await act(async () => fireEvent.changeText(screen.getByLabelText(t('meal.item.amount', { name: food.name })), text));
}
const kcal = (low: number, high: number) => `${t('format.range', { low, high })} ${t('food.budget.kcalUnit')}`;
// K1 (ADR-090 #5, K-1063): numbers are single where a food is logged — the middle of the server's range — and the ranges are under "Details".
const single = (low: number, high: number) => t('food.single.kcal', { value: Math.round((low + high) / 2) });
/** Opens an item of a meal being confirmed (the coach's) in its portion sheet. */
const openItem = async (name: string) => act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.item.open', { name }) })));
/** The portion step's one button: "Add to Lunch · 144 kcal". */
const addButton = () => screen.getByRole('button', { name: /^Add to / });
const pressAdd = async () => act(async () => fireEvent.press(addButton()));
const estimates = () => mockPOST.mock.calls.filter(([path]) => path === '/v1/food-estimates');

describe('a meal the coach read (K-509)', () => {
  test('comes in with its foods and amounts, and the estimate follows — the same items screen, nothing saved yet', async () => {
    handOffMeal([{ foodId: RICE.id, name: RICE.name, quantity: 1.5, unit: '1 bowl' }]);
    await show();
    await openItem(RICE.name);
    expect(screen.getByLabelText(t('meal.item.amount', { name: RICE.name })).props.value).toBe('1.5');
    expect(estimates().at(-1)?.[1]).toEqual({
      body: { items: [{ foodId: RICE.id, amount: { quantity: 1.5, unit: '1 bowl', certainty: 'ESTIMATED' } }] },
    });
    expect(mockRecord).not.toHaveBeenCalled();
  });

  test("a measure the server doesn't take: not saved until the estimate passes — it would be refused later (review)", async () => {
    mockEstimate = async () => refused(400, 'VALIDATION_FAILED');
    handOffMeal([{ foodId: RICE.id, name: RICE.name, quantity: 1, unit: 'bowl' }]);
    await show();
    expect(screen.getByRole('button', { name: t('meal.save') })).toBeDisabled();
    expect(screen.getByText(t('meal.fromCoach.notChecked'))).toBeOnTheScreen();
    mockEstimate = async (request) => ok(estimateOf(request));
    // Grams instead: the amount empties (nothing converted for the user), then the server takes it.
    await openItem(RICE.name);
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.item.unitSpoken', { name: RICE.name, unit: t('meal.item.grams') }) })));
    await amount(RICE, '150');
    expect(screen.getByRole('button', { name: t('meal.save') })).toBeEnabled();
  });

  test('from a photo, the gram question says why: a photo shows the plate, not the weight (K-408)', async () => {
    handOffMeal([{ foodId: CHICKEN.id, name: CHICKEN.name, quantity: 180, unit: 'g' }], 'photo');
    await show();
    expect(estimates().at(-1)?.[1]).toEqual({ body: { items: [{ foodId: CHICKEN.id, amount: { quantity: 180, unit: 'g', certainty: 'ESTIMATED' } }] } });
    expect(screen.getByText(t('meal.estimate.question', { name: CHICKEN.name, question: t('foodEstimate.question.grams') }))).toBeOnTheScreen();
    expect(screen.getByText(t('meal.photo.why'))).toBeOnTheScreen();
  });

  test('the reason is the photo’s: a meal in words, or no question, does not give it', async () => {
    handOffMeal([{ foodId: CHICKEN.id, name: CHICKEN.name, quantity: 180, unit: 'g' }]);
    await show();
    expect(screen.queryByText(t('meal.photo.why'))).toBeNull();
    takeMeal();
    handOffMeal([{ foodId: RICE.id, name: RICE.name, quantity: 180, unit: 'g' }], 'photo');
    await show();
    await openItem(RICE.name);
    expect(screen.getByTestId('numbers-0')).toHaveTextContent('205'); // the estimate is there — only no question
    expect(screen.queryByText(t('meal.photo.why'))).toBeNull();
  });

  test('is taken once: the next meal starts empty', async () => {
    handOffMeal([{ foodId: RICE.id, name: RICE.name, quantity: 1, unit: 'g' }]);
    await show();
    expect(takeMeal()).toBeNull();
  });

  // K1 (Evre 7 A): "from two items on the meal has a total" lived in the log screen, where a meal was put together item by item; a meal of
  // several items now comes only from the coach (here) or is a logged one being corrected, so the total is held here.
  test('from two items on the meal has a total: one number, its ranges under Details', async () => {
    handOffMeal([
      { foodId: RICE.id, name: RICE.name, quantity: 1, unit: '1 bowl' },
      { foodId: CHICKEN.id, name: CHICKEN.name, quantity: 150, unit: 'g' },
    ]);
    await show();
    expect(screen.getByTestId('estimate-kcal')).toHaveTextContent(single(380, 530));
    await act(async () => fireEvent.press(screen.getByTestId('estimate-detail')));
    expect(screen.getByText(t('meal.estimate.range', { kcal: kcal(380, 530), protein: `${t('format.range', { low: 40, high: 52 })} ${t('food.budget.proteinUnit')}` }))).toBeOnTheScreen();
  });

  test('the same food twice: each item is its own, removed and changed by its place', async () => {
    handOffMeal([
      { foodId: RICE.id, name: RICE.name, quantity: 1, unit: '1 bowl' },
      { foodId: RICE.id, name: RICE.name, quantity: 2, unit: '1 bowl' },
    ]);
    await show();
    await act(async () => fireEvent.press(screen.getByTestId('item-0')));
    expect(screen.getByLabelText(t('meal.item.amount', { name: RICE.name })).props.value).toBe('1');
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.item.removeSpoken', { name: RICE.name }) })));
    expect(screen.getAllByTestId(/^item-/)).toHaveLength(1);
    await act(async () => fireEvent.press(screen.getByTestId('item-0')));
    expect(screen.getByLabelText(t('meal.item.amount', { name: RICE.name })).props.value).toBe('2');
  });

  test('"Log it" keeps the meal on the phone and leaves, with the banner', async () => {
    handOffMeal([{ foodId: RICE.id, name: RICE.name, quantity: 1, unit: '1 bowl' }]);
    await show();
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.save') })));
    expect(mockRecord).toHaveBeenCalledWith({ kind: 'meal', body: expect.objectContaining({ slot: 'BREAKFAST', items: [{ foodId: RICE.id, amount: { quantity: 1, unit: '1 bowl', certainty: 'ESTIMATED' } }] }) });
    expect(mockBack).toHaveBeenCalled();
    expect(screen.getByText(t('meal.saved.one', { slot: t('food.slot.BREAKFAST') }))).toBeOnTheScreen();
  });
});

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
    expect(screen.getByText(t('meal.search.tooShort', { min: 2 }))).toBeOnTheScreen();
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

describe('the portion step: amounts and the estimate', () => {
  test('a food opens its sheet with its amount filled — 1 of its first serving that is not a volume — and the estimate follows at once (ADR-085)', async () => {
    await show();
    await search('rice');
    await add(RICE);
    expect(screen.getByLabelText(t('meal.item.amount', { name: RICE.name })).props.value).toBe('1');
    expect(estimates().at(-1)?.[1]).toEqual({
      body: { items: [{ foodId: 'fdc-3', amount: { quantity: 1, unit: '1 bowl', certainty: 'ESTIMATED' } }] },
    });
    expect(addButton()).toBeEnabled();
  });

  test('a food with no serving that is not a volume comes in as 100 g', async () => {
    await show();
    await search('chicken');
    await add(CHICKEN);
    expect(screen.getByLabelText(t('meal.item.amount', { name: CHICKEN.name })).props.value).toBe('100');
    expect(estimates().at(-1)?.[1]).toEqual({
      body: { items: [{ foodId: 'fdc-4', amount: { quantity: 100, unit: 'g', certainty: 'ESTIMATED' } }] },
    });
  });

  test('an amount the user empties stays empty: nothing is estimated or added for it', async () => {
    await show();
    await search('rice');
    await add(RICE);
    await amount(RICE, '');
    expect(screen.getByLabelText(t('meal.item.amount', { name: RICE.name })).props.value).toBe('');
    expect(addButton()).toBeDisabled();
  });

  test("with every amount given, the server's estimate as one number, its ranges under Details (U1, U5 as amended by ADR-090 #5)", async () => {
    await show();
    await search('rice');
    await add(RICE);
    await amount(RICE, '1,5');
    expect(estimates().at(-1)?.[1]).toEqual({
      body: { items: [{ foodId: 'fdc-3', amount: { quantity: 1.5, unit: '1 bowl', certainty: 'ESTIMATED' } }] },
    });
    expect(screen.getByTestId('numbers-0')).toHaveTextContent('205');
    expect(screen.queryByText(kcal(170, 240))).toBeNull();
    await act(async () => fireEvent.press(screen.getByTestId('details-0')));
    expect(screen.getByText(t('meal.item.detailRange', { kcal: kcal(170, 240), protein: `${t('format.range', { low: 3, high: 5 })} ${t('food.budget.proteinUnit')}` }))).toBeOnTheScreen();
  });

  test("the estimate's one question, and weighing answers it: the item goes as weighed", async () => {
    await show();
    await search('chicken');
    await add(CHICKEN);
    await amount(CHICKEN, '150');
    const question = t('meal.estimate.question', { name: CHICKEN.name, question: t('foodEstimate.question.grams') });
    expect(screen.getByText(question)).toBeOnTheScreen();
    await act(async () => fireEvent(screen.getByRole('switch', { name: t('meal.item.weighedSpoken', { name: CHICKEN.name }) }), 'valueChange', true));
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

  test('another unit never leaves the amount empty or wrong: "1" of a bowl is not 1 g (simulator: it became 15 g), so grams open on 100 g (K-1063)', async () => {
    await show();
    await search('rice');
    await add(RICE);
    await amount(RICE, '1');
    await act(async () =>
      fireEvent.press(screen.getByRole('button', { name: t('meal.item.unitSpoken', { name: RICE.name, unit: t('meal.item.grams') }) })),
    );
    expect(screen.getByLabelText(t('meal.item.amount', { name: RICE.name })).props.value).toBe('100');
  });

  test('more than the contract takes is named, and nothing is estimated or added', async () => {
    await show();
    await search('rice');
    await add(RICE);
    const opening = estimates().length; // the one for the amount the food came in with
    await amount(RICE, '40'); // 40 bowls: 6320 g
    expect(screen.getByText(t('meal.item.tooMuch'))).toBeOnTheScreen();
    expect(estimates()).toHaveLength(opening);
    expect(addButton()).toBeDisabled();
  });

  test('closing the sheet adds nothing', async () => {
    await show();
    await search('rice');
    await add(RICE);
    await act(async () => fireEvent.press(screen.getByTestId('sheet-close')));
    expect(screen.queryByTestId('portion-sheet')).toBeNull();
    expect(mockRecord).not.toHaveBeenCalled();
  });
});

describe('adding: the screen stays, the tray grows', () => {
  test('on the phone first, in the slot the clock suggests, into the day; the sheet closes and the screen stays open', async () => {
    await show();
    expect(screen.getByTestId('slot-LUNCH')).toBeSelected();
    await search('rice');
    await add(RICE);
    await amount(RICE, '1');
    await pressAdd();
    expect(mockRecord).toHaveBeenCalledWith({
      kind: 'meal',
      body: {
        clientId: expect.any(String),
        eatenAt: new Date(2026, 8, 29, 13, 0).toISOString(),
        slot: 'LUNCH',
        items: [{ foodId: 'fdc-3', amount: { quantity: 1, unit: '1 bowl', certainty: 'ESTIMATED' } }],
      },
    });
    expect(mockBack).not.toHaveBeenCalled();
    expect(screen.queryByTestId('portion-sheet')).toBeNull();
    // The tray says what the meal holds now, and the dock offers Done with its calories.
    expect(within(screen.getByTestId('tray')).getByText(RICE.name)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('meal.doneKcal', { kcal: single(170, 240) }) })).toBeOnTheScreen();
  });

  test('the light confirmation says Added with the food, and Undo takes it back through the meal delete (K-1044)', async () => {
    await show();
    await search('rice');
    await add(RICE);
    await pressAdd();
    const [{ body }] = mockRecord.mock.calls[0] as [{ body: { clientId: string } }];

    expect(screen.getByText(t('meal.toast.added'))).toBeOnTheScreen();
    expect(within(banner() as never).getByText(RICE.name)).toBeOnTheScreen();

    await fireEvent.press(undoButton());
    await act(async () => {});

    expect(mockServices.takeBack).toHaveBeenCalledWith(body.clientId, expect.any(Function));
    expect(mockServices.api.DELETE).toHaveBeenCalledWith('/v1/meals/{id}', { params: { path: { id: 'srv-meal-1' } } });
    expect(banner()).toBeNull();
  });

  test('a second food goes into the same open screen: two records, one tray', async () => {
    await show();
    await search('rice');
    await add(RICE);
    await pressAdd();
    await search('chicken');
    await add(CHICKEN);
    await pressAdd();
    expect(mockRecord).toHaveBeenCalledTimes(2);
    expect(mockBack).not.toHaveBeenCalled();
    const tray = within(screen.getByTestId('tray'));
    expect(tray.getByText(RICE.name)).toBeOnTheScreen();
    expect(tray.getByText(CHICKEN.name)).toBeOnTheScreen();
  });

  test('the slot chosen is the slot logged, and the tray and the pills follow it', async () => {
    await show();
    await act(async () => fireEvent.press(screen.getByTestId('slot-SNACK')));
    expect(screen.getByTestId('slot-SNACK')).toBeSelected();
    await search('rice');
    await add(RICE);
    await pressAdd();
    expect(mockRecord).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ slot: 'SNACK' }) }));
    expect(within(screen.getByTestId('tray')).getByText(RICE.name)).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByTestId('slot-LUNCH')));
    expect(within(screen.getByTestId('tray')).queryByText(RICE.name)).toBeNull();
    expect(within(screen.getByTestId('tray')).getByText(t('meal.tray.empty'))).toBeOnTheScreen();
  });

  test('a plus on a result logs it in one tap, without the sheet', async () => {
    await show();
    await search('chicken');
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.search.logNow', { name: CHICKEN.name }) })));
    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.objectContaining({ items: [{ foodId: 'fdc-4', amount: { quantity: 100, unit: 'g', certainty: 'ESTIMATED' } }] }) }),
    );
    expect(screen.queryByTestId('portion-sheet')).toBeNull();
    expect(mockBack).not.toHaveBeenCalled();
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
    await pressAdd();
    expect(mockRecord).toHaveBeenCalledTimes(1);
  });

  test('a phone that could not keep it: it says so, and there is no banner (nothing was saved to take back)', async () => {
    mockRecord.mockRejectedValueOnce(new Error('disk'));
    await show();
    await search('rice');
    await add(RICE);
    await amount(RICE, '1');
    await pressAdd();
    expect(banner()).toBeNull();
    expect(screen.getByText(t('food.repeat.failed'))).toBeOnTheScreen();
    expect(mockBack).not.toHaveBeenCalled();
    // The sheet is still open: trying again works, and is the same meal (one clientId, K-815).
    await pressAdd();
    expect(mockRecord).toHaveBeenCalledTimes(2);
    const [[first], [second]] = mockRecord.mock.calls as [{ body: { clientId: string } }][];
    expect(first.body.clientId).toBe(second.body.clientId);
  });

  test('done leaves', async () => {
    await show();
    await search('rice');
    await add(RICE);
    await pressAdd();
    await act(async () => fireEvent.press(screen.getByRole('button', { name: /^Done/ })));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});

describe('review: answers in their order, guards, failures', () => {
  test('a search answer that arrives after a newer search is dropped', async () => {
    const egg = held<Answer>();
    mockSearch = (q) => (q === 'rice' ? egg.promise : Promise.resolve(ok([CHICKEN])));
    await show();
    await search('rice');
    await search('chicken');
    await act(async () => egg.release(ok([RICE])));
    expect(screen.queryByRole('button', { name: t('meal.search.add', { name: RICE.name }) })).toBeNull();
    expect(screen.getByRole('button', { name: t('meal.search.add', { name: CHICKEN.name }) })).toBeOnTheScreen();
  });

  test('a search answer that arrives after the box was emptied does not bring the list back', async () => {
    const late = held<Answer>();
    await show();
    await search('chicken');
    mockSearch = () => late.promise;
    await search('rice');
    expect(screen.queryByRole('button', { name: t('meal.search.add', { name: CHICKEN.name }) })).toBeNull();
    await act(async () => fireEvent.changeText(screen.getByLabelText(t('meal.search.label')), ''));
    await act(async () => late.release(ok([RICE])));
    expect(screen.queryByRole('button', { name: t('meal.search.add', { name: RICE.name }) })).toBeNull();
  });

  test('the numbers go as soon as an amount changes, until the new estimate comes', async () => {
    await show();
    await search('rice');
    await add(RICE);
    await amount(RICE, '1');
    expect(screen.getByTestId('numbers-0')).toBeOnTheScreen();
    const next = held<Answer>();
    mockEstimate = () => next.promise;
    await amount(RICE, '2');
    expect(screen.queryByTestId('numbers-0')).toBeNull();
    await amount(RICE, '');
    expect(screen.queryByTestId('numbers-0')).toBeNull();
  });

  test('estimate answers out of order: only the one for the current amounts is shown', async () => {
    const opening = held<Answer>();
    const first = held<Answer>();
    const second = held<Answer>();
    const queue = [opening, first, second];
    mockEstimate = () => (queue.shift() as typeof first).promise;
    await show();
    await search('rice');
    await add(RICE);
    await amount(RICE, '2');
    await amount(RICE, '3');
    const answer = (low: number, high: number): Answer =>
      ok({ items: [{ foodId: RICE.id, name: RICE.name, amount: { quantity: 1, unit: '1 bowl' }, kcal: R(low, high), proteinG: R(1, 2) }], kcal: R(low, high), proteinG: R(1, 2) });
    await act(async () => second.release(answer(500, 600)));
    await act(async () => first.release(answer(100, 200)));
    await act(async () => fireEvent.press(screen.getByTestId('details-0')));
    expect(screen.getByText(t('meal.item.detailRange', { kcal: kcal(500, 600), protein: `${t('format.range', { low: 1, high: 2 })} ${t('food.budget.proteinUnit')}` }))).toBeOnTheScreen();
    expect(screen.queryByText(new RegExp('100-200'))).toBeNull();
  });

  test('two presses of the add button in the same moment keep one meal', async () => {
    const stored = held<boolean>();
    mockRecord.mockImplementationOnce(() => stored.promise);
    await show();
    await search('rice');
    await add(RICE);
    await amount(RICE, '1');
    const press = (addButton().props as { onClick: (event: object) => void }).onClick;
    await act(async () => {
      press({ nativeEvent: {} });
      press({ nativeEvent: {} });
    });
    await act(async () => stored.release(true));
    expect(mockRecord).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['refused', async () => refused(500, 'INTERNAL')],
    [
      'unreachable',
      async () => {
        throw new TypeError('Network request failed');
      },
    ],
  ])('the consent %s: it says so, nothing is remembered, nothing can be typed; reported by name only', async (_, answer) => {
    mockGranted = false;
    mockPUT.mockImplementation(answer as never);
    await show();
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.consent.allow') })));
    expect(screen.getByText(t('meal.consent.failed'))).toBeOnTheScreen();
    expect(mockRemember).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(t('meal.search.label'))).toBeNull();
    expect(screen.getByRole('button', { name: t('meal.consent.allow') })).toBeEnabled();
    for (const [problem] of mockServices.report.mock.calls) expect(Object.keys(problem as object)).toEqual(['name']);
  });

  test("the consent can't be read: the consent step, not an endless wait", async () => {
    const granted = mockServices.consents.granted;
    mockServices.consents.granted = async () => {
      throw new Error('keychain');
    };
    try {
      await show();
      expect(screen.getByRole('button', { name: t('meal.consent.allow') })).toBeOnTheScreen();
    } finally {
      mockServices.consents.granted = granted;
    }
  });
});
