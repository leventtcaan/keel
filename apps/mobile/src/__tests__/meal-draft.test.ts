/**
 * A meal being put together (K-407): each item is a food the database matched, an amount as typed and its unit — grams
 * or one of the food's servings — weighed or not. It becomes the contract's items only when every amount is one the
 * server takes (above 0, at most 2 decimals, at most 5000 g). A food comes in with its amount filled — 1 of a serving, 100 g
 * (ADR-085 #5); an amount the user then empties stays empty and nothing is guessed for it.
 */
import type { components } from '@/api/schema';
import { type DraftItem, addFood, draftOf, itemProblem, itemsHanded, requestsOf } from '@/food/draft';
import { foodParams } from '@/food/params';

type Schemas = components['schemas'];

const RICE: Schemas['Food'] = {
  id: 'fdc-3',
  name: 'Rice, white, cooked',
  per100g: { kcal: { low: 120, high: 140 }, proteinG: { low: 2, high: 3 }, carbsG: { low: 26, high: 30 }, fatG: { low: 0, high: 1 } },
  servings: [{ name: '1 cup', grams: 158 }],
};
const CHICKEN: Schemas['Food'] = { ...RICE, id: 'fdc-4', name: 'Chicken breast', servings: undefined };

describe('addFood', () => {
  // ADR-085 #5: the amount comes filled (1 of a serving, 100 g), so the estimate shows at once; the user changes it.
  test('a food comes in with its amount filled, on its first serving that is not a volume', () => {
    const egg: Schemas['Food'] = { ...RICE, id: 'fdc-5', name: 'Egg', servings: [{ name: '1 cup', grams: 243 }, { name: '1 large', grams: 50 }] };
    expect(addFood([], egg)).toEqual([
      { foodId: 'fdc-5', name: 'Egg', units: ['1 cup', '1 large', 'g'], quantity: '1', unit: '1 large', weighed: false },
    ]);
  });

  test('a food whose servings are all volumes comes in as 100 g', () => {
    const sifted: Schemas['Food'] = { ...RICE, id: 'fdc-6', name: 'Egg, dried', servings: [{ name: '1 cup, sifted', grams: 60 }, { name: '1 tbsp', grams: 4 }] };
    expect(addFood([], sifted)).toEqual([
      { foodId: 'fdc-6', name: 'Egg, dried', units: ['1 cup, sifted', '1 tbsp', 'g'], quantity: '100', unit: 'g', weighed: false },
    ]);
  });

  test('without servings it is 100 g', () => {
    expect(addFood([], CHICKEN)[0]).toMatchObject({ units: ['g'], unit: 'g', quantity: '100' });
  });

  test('a volume is a volume in any case, plural or spelling', () => {
    const unitOf = (name: string) => addFood([], { ...RICE, servings: [{ name, grams: 10 }, { name: '1 slice', grams: 30 }] })[0].unit;
    for (const volume of ['1 CUP', '2 Cups', '1 tbsp', '3 TBSPS', '1 tsp', '1 fl oz', '1 FL. OZ', '30 ml', '1 tablespoon', '1 teaspoon', '1 fluid ounce']) {
      expect(unitOf(volume)).toBe('1 slice');
    }
  });

  test('a measure that only contains the letters of a volume is not one', () => {
    const slices: Schemas['Food'] = { ...RICE, servings: [{ name: '1 cupcake', grams: 50 }, { name: '1 small', grams: 30 }] };
    expect(addFood([], slices)[0]).toMatchObject({ unit: '1 cupcake', quantity: '1' });
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

describe('itemsHanded (K-509)', () => {
  test("a meal the coach read: its measure first, grams always offered once; the amount as written; never more than a meal takes", () => {
    expect(itemsHanded([{ foodId: 'a', name: 'Egg', quantity: 2, unit: 'piece' }, { foodId: 'b', name: 'Rice', quantity: 150, unit: 'g' }])).toEqual([
      { foodId: 'a', name: 'Egg', units: ['piece', 'g'], quantity: '2', unit: 'piece', weighed: false },
      { foodId: 'b', name: 'Rice', units: ['g'], quantity: '150', unit: 'g', weighed: false },
    ]);
    expect(itemsHanded(null)).toEqual([]);
    // A recipe goes by its portions only: grams would be refused by the server (ADR-034).
    expect(itemsHanded([{ foodId: 'recipe:1', name: 'Morning bowl', quantity: 1, unit: 'portion' }])[0].units).toEqual(['portion']);
    const many = Array.from({ length: foodParams.itemsMax + 3 }, (_, i) => ({ foodId: String(i), name: 'x', quantity: 1, unit: 'g' }));
    expect(itemsHanded(many)).toHaveLength(foodParams.itemsMax);
  });
});
