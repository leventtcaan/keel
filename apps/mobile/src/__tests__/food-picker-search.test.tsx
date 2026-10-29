/**
 * Finding a food as the user types (K-1038, ADR-085): a short wait after the last key, then the search; the old list goes
 * the moment the words change and "searching" shows; a late answer to older words never replaces a newer one; no
 * connection and a server error are told apart; each row says its energy per 100 g as a range (U5). The keyboard's
 * Search key searches at once, and there is no separate Search button — Scan stays.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { FoodPicker } from '@/food/FoodPicker';
import { foodParams } from '@/food/params';
import { ThemeProvider } from '@/theme/theme';

type Schemas = components['schemas'];
type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown, status = 200): Answer => ({ data, response: new Response(null, { status }) });
const refused = (status: number): Answer => ({ error: { code: 'INTERNAL', message: 'x' }, response: new Response(null, { status }) });
const R = (low: number, high: number) => ({ low, high });
const food = (id: string, name: string, kcal = R(130, 160)): Schemas['Food'] => ({
  id,
  name,
  per100g: { kcal, proteinG: R(10, 13), carbsG: R(0, 1), fatG: R(9, 11) },
});
const EGG = food('fdc-1', 'Egg, whole, raw');
const EGGNOG = food('fdc-2', 'Eggnog', R(80, 100));

let mockSearch: (q: string) => Promise<Answer> = async () => ok([EGG]);
const mockPOST = jest.fn(async (path: string, init: { body: { q: string } }) => {
  if (path === '/v1/foods/search') return mockSearch(init.body.q);
  return refused(404);
});
jest.mock('expo-camera', () => ({ CameraView: () => null, useCameraPermissions: () => [{ granted: true }, jest.fn()] }));
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => ({ api: { POST: mockPOST } }) }));

const onFood = jest.fn();
const DELAY = foodParams.searchDelayMs;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockPOST.mockImplementation(async (path, init) => (path === '/v1/foods/search' ? mockSearch(init.body.q) : refused(404)));
  mockSearch = async () => ok([EGG]);
});
afterEach(() => jest.useRealTimers());

/** A promise and the hand that settles it, for answers that arrive in an order the test chooses. */
function held<T>() {
  let release: (value: T) => void = () => {};
  const promise = new Promise<T>((resolve) => (release = resolve));
  return { promise, release };
}

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <FoodPicker full={false} onFood={onFood} />
    </ThemeProvider>,
  );
}
const field = () => screen.getByLabelText(t('meal.search.label'));
const type = async (text: string) => {
  await act(async () => fireEvent.changeText(field(), text));
};
const wait = async (ms: number) => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
};
const searches = () => mockPOST.mock.calls.filter(([path]) => path === '/v1/foods/search');
const row = (f: Schemas['Food']) => screen.queryByRole('button', { name: t('meal.search.add', { name: f.name }) });

describe('searching as the user types', () => {
  test('words of enough letters are searched after the wait, with nothing pressed', async () => {
    await show();
    await type('egg');
    expect(searches()).toHaveLength(0);
    await wait(DELAY - 1);
    expect(searches()).toHaveLength(0);
    await wait(1);
    expect(searches()).toEqual([['/v1/foods/search', { body: { q: 'egg', limit: foodParams.searchResults } }]]);
    expect(row(EGG)).toBeOnTheScreen();
  });

  test('keys typed inside the wait make one search, for the last words', async () => {
    await show();
    await type('eg');
    await wait(DELAY - 10);
    await type('egg');
    await wait(DELAY - 10);
    expect(searches()).toHaveLength(0);
    await wait(10);
    expect(searches().map(([, init]) => init.body.q)).toEqual(['egg']);
  });

  test('typing again takes the old list away at once and shows that it is searching', async () => {
    await show();
    await type('egg');
    await wait(DELAY);
    expect(row(EGG)).toBeOnTheScreen();
    await type('eggs');
    expect(row(EGG)).toBeNull();
    expect(screen.getByText(t('meal.search.searching'))).toBeOnTheScreen();
    await wait(DELAY);
    expect(screen.queryByText(t('meal.search.searching'))).toBeNull();
  });

  test('a late answer to older words never replaces the newer list', async () => {
    const first = held<Answer>();
    mockSearch = (q) => (q === 'egg' ? first.promise : Promise.resolve(ok([EGGNOG])));
    await show();
    await type('egg');
    await wait(DELAY);
    await type('eggn');
    await wait(DELAY);
    expect(row(EGGNOG)).toBeOnTheScreen();
    await act(async () => first.release(ok([EGG])));
    expect(row(EGG)).toBeNull();
    expect(row(EGGNOG)).toBeOnTheScreen();
  });

  test('an answer that comes after the words changed again is dropped too', async () => {
    const first = held<Answer>();
    mockSearch = () => first.promise;
    await show();
    await type('egg');
    await wait(DELAY);
    await type('e');
    await act(async () => first.release(ok([EGG])));
    expect(row(EGG)).toBeNull();
    expect(screen.getByText(t('meal.search.tooShort', { min: foodParams.searchMinChars }))).toBeOnTheScreen();
  });

  test("the keyboard's Search key searches at once, not after the wait", async () => {
    await show();
    await type(' egg ');
    await act(async () => fireEvent(field(), 'submitEditing'));
    expect(searches()).toEqual([['/v1/foods/search', { body: { q: 'egg', limit: foodParams.searchResults } }]]);
    expect(row(EGG)).toBeOnTheScreen();
    // The wait that was running is over: no second search for the same words.
    await wait(DELAY * 2);
    expect(searches()).toHaveLength(1);
  });

  test('fewer letters than the server takes: nothing is sent, and the hint says how many', async () => {
    await show();
    await type('e');
    await wait(DELAY * 3);
    expect(searches()).toHaveLength(0);
    expect(screen.getByText(t('meal.search.tooShort', { min: foodParams.searchMinChars }))).toBeOnTheScreen();
    await act(async () => fireEvent(field(), 'submitEditing'));
    expect(searches()).toHaveLength(0);
  });

  test('an empty box says what to type, and that is all it says', async () => {
    await show();
    expect(screen.getByText(t('meal.search.empty'))).toBeOnTheScreen();
    expect(screen.queryByText(t('meal.search.tooShort', { min: foodParams.searchMinChars }))).toBeNull();
    await type('egg');
    expect(screen.queryByText(t('meal.search.empty'))).toBeNull();
    await type('');
    expect(screen.getByText(t('meal.search.empty'))).toBeOnTheScreen();
    expect(screen.queryByText(t('meal.search.tooShort', { min: foodParams.searchMinChars }))).toBeNull();
  });

  test('nothing found says so', async () => {
    mockSearch = async () => ok([]);
    await show();
    await type('zzz');
    await wait(DELAY);
    expect(screen.getByText(t('meal.search.none'))).toBeOnTheScreen();
  });
});

describe('when the search does not work', () => {
  test('no answer at all (the request threw): the connection is named', async () => {
    mockSearch = async () => {
      throw new TypeError('Network request failed');
    };
    await show();
    await type('egg');
    await wait(DELAY);
    expect(screen.getByText(t('meal.search.failed'))).toBeOnTheScreen();
    expect(screen.queryByText(t('meal.search.serverError'))).toBeNull();
  });

  test('the server answered with an error: it is not blamed on the connection', async () => {
    mockSearch = async () => refused(500);
    await show();
    await type('egg');
    await wait(DELAY);
    expect(screen.getByText(t('meal.search.serverError'))).toBeOnTheScreen();
    expect(screen.queryByText(t('meal.search.failed'))).toBeNull();
  });

  test('the two texts are different words', () => {
    expect(t('meal.search.serverError')).not.toBe(t('meal.search.failed'));
  });
});

describe('a result row', () => {
  test('says its energy per 100 g as a range, under the name', async () => {
    await show();
    await type('egg');
    await wait(DELAY);
    const kcal = `${t('format.range', { low: 130, high: 160 })} ${t('food.budget.kcalUnit')}`;
    expect(screen.getByText(EGG.name)).toBeOnTheScreen();
    expect(screen.getByText(t('meal.search.per100g', { kcal }))).toBeOnTheScreen();
    expect(t('meal.search.per100g', { kcal })).toContain('130-160');
  });

  test('is spoken with the range as words, as the button\'s hint', async () => {
    await show();
    await type('egg');
    await wait(DELAY);
    const spoken = `${t('format.rangeSpoken', { low: 130, high: 160 })} ${t('food.budget.kcalUnit')}`;
    expect(screen.getByHintText(t('meal.search.per100gSpoken', { kcal: spoken }))).toBeOnTheScreen();
  });
});

describe('the buttons', () => {
  test('there is no Search button any more; Scan stays', async () => {
    await show();
    expect(screen.queryByRole('button', { name: 'Search' })).toBeNull();
    expect(screen.getByRole('button', { name: t('meal.barcode.scan') })).toBeOnTheScreen();
  });

  test('picking a row hands the food over and empties the box', async () => {
    await show();
    await type('egg');
    await wait(DELAY);
    await act(async () => fireEvent.press(row(EGG) as never));
    expect(onFood).toHaveBeenCalledWith(EGG);
    expect(field().props.value).toBe('');
    expect(row(EGG)).toBeNull();
  });
});
