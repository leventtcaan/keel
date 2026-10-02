/**
 * A meal being put together (K-407): each item is a food the database matched, an amount as typed and its unit — grams
 * or one of the food's servings — weighed or not. It becomes the contract's items only when every amount is one the
 * server takes (above 0, at most 2 decimals, at most 5000 g); nothing is guessed for an amount left empty (I2 A4: a wrong
 * default costs more than an empty field).
 */
import type { components } from '@/api/schema';
import { type DraftItem, addFood, draftOf, itemProblem, requestsOf } from '@/food/draft';

type Schemas = components['schemas'];

const RICE: Schemas['Food'] = {
  id: 'fdc-3',
  name: 'Rice, white, cooked',
  per100g: { kcal: { low: 120, high: 140 }, proteinG: { low: 2, high: 3 }, carbsG: { low: 26, high: 30 }, fatG: { low: 0, high: 1 } },
  servings: [{ name: '1 cup', grams: 158 }],
};
const CHICKEN: Schemas['Food'] = { ...RICE, id: 'fdc-4', name: 'Chicken breast', servings: undefined };

describe('addFood', () => {
  test('a food comes in with no amount, on its first serving when it has one', () => {
    expect(addFood([], RICE)).toEqual([
      { foodId: 'fdc-3', name: 'Rice, white, cooked', units: ['1 cup', 'g'], quantity: '', unit: '1 cup', weighed: false },
    ]);
  });

  test('without servings it is grams', () => {
    expect(addFood([], CHICKEN)[0]).toMatchObject({ units: ['g'], unit: 'g', quantity: '' });
  });

  test('added after the ones already there', () => {
    expect(addFood(addFood([], RICE), CHICKEN).map((item) => item.foodId)).toEqual(['fdc-3', 'fdc-4']);
  });
});

describe('itemProblem', () => {
  const item = (quantity: string, unit = 'g'): DraftItem => ({
    foodId: 'fdc-3',
    name: 'Rice',
    units: ['1 cup', 'g'],
    quantity,
    unit,
    weighed: false,
  });
  const known = new Map([['fdc-3', RICE]]);

  test('an amount the server takes has no problem', () => {
    expect(itemProblem(item('150'), known)).toBeNull();
    expect(itemProblem(item('1.5', '1 cup'), known)).toBeNull();
  });

  test('empty is missing; not a number, or more decimals than the contract keeps, is invalid', () => {
    expect(itemProblem(item(''), known)).toBe('missing');
    expect(itemProblem(item('abc'), known)).toBe('invalid');
    expect(itemProblem(item('1.255'), known)).toBe('invalid');
    expect(itemProblem(item('0'), known)).toBe('invalid');
  });

  test('more than 5000 g in all is too much — in grams or in servings', () => {
    expect(itemProblem(item('5000'), known)).toBeNull();
    expect(itemProblem(item('5001'), known)).toBe('tooMuch');
    expect(itemProblem(item('32', '1 cup'), known)).toBe('tooMuch'); // 32 × 158 g = 5056 g
  });

  test("a serving whose grams the phone does not know (a meal being corrected) is left to the server's check", () => {
    expect(itemProblem({ ...item('3', '1 slice') }, known)).toBeNull();
  });
});

describe('requestsOf', () => {
  test("the contract's items, weighed ones marked, the others estimated", () => {
    const items: DraftItem[] = [
      { foodId: 'fdc-3', name: 'Rice', units: ['1 cup', 'g'], quantity: '1,5', unit: '1 cup', weighed: false },
      { foodId: 'fdc-4', name: 'Chicken', units: ['g'], quantity: '150', unit: 'g', weighed: true },
    ];
    expect(requestsOf(items, new Map())).toEqual([
      { foodId: 'fdc-3', amount: { quantity: 1.5, unit: '1 cup', certainty: 'ESTIMATED' } },
      { foodId: 'fdc-4', amount: { quantity: 150, unit: 'g', certainty: 'WEIGHED' } },
    ]);
  });

  test('nothing for more items than the server takes (FoodEstimateRequest maxItems: 50)', () => {
    const ok: DraftItem = { foodId: 'fdc-4', name: 'Chicken', units: ['g'], quantity: '1', unit: 'g', weighed: false };
    expect(
      requestsOf(
        Array.from({ length: 50 }, () => ok),
        new Map(),
      ),
    ).toHaveLength(50);
    expect(
      requestsOf(
        Array.from({ length: 51 }, () => ok),
        new Map(),
      ),
    ).toBeNull();
  });

  test('nothing while an amount is missing or wrong, and nothing for no items', () => {
    const ok: DraftItem = { foodId: 'fdc-4', name: 'Chicken', units: ['g'], quantity: '150', unit: 'g', weighed: false };
    expect(requestsOf([ok, { ...ok, quantity: '' }], new Map())).toBeNull();
    expect(requestsOf([], new Map())).toBeNull();
  });
});

describe('draftOf', () => {
  test('a logged meal comes back as a draft to correct: its items, their amounts and units, weighed or not', () => {
    const meal: Schemas['Meal'] = {
      id: 'm1',
      clientId: 'c1',
      eatenAt: '2026-09-29T08:00:00Z',
      slot: 'BREAKFAST',
      items: [
        {
          foodId: 'fdc-1',
          name: 'Oats',
          amount: { quantity: 80, unit: 'g', certainty: 'WEIGHED' },
          kcal: { low: 1, high: 2 },
          proteinG: { low: 0, high: 1 },
        },
        { foodId: 'fdc-2', name: 'Milk', amount: { quantity: 1, unit: '1 cup' }, kcal: { low: 1, high: 2 }, proteinG: { low: 0, high: 1 } },
      ],
      kcal: { low: 2, high: 4 },
      proteinG: { low: 0, high: 2 },
    };
    expect(draftOf(meal)).toEqual({
      slot: 'BREAKFAST',
      items: [
        { foodId: 'fdc-1', name: 'Oats', units: ['g'], quantity: '80', unit: 'g', weighed: true },
        { foodId: 'fdc-2', name: 'Milk', units: ['1 cup', 'g'], quantity: '1', unit: '1 cup', weighed: false },
      ],
    });
  });
});
