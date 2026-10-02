/**
 * A recipe being entered (K-423, ADR-034): a name, how many portions it makes, and the ingredients as a meal's items —
 * database foods only. It becomes the contract's NewRecipe only when the server would take it (name trimmed, 1..80
 * code points; portions a whole number 1..50; ingredients as a meal's), and says which part is missing otherwise.
 */
import { addFood } from '@/food/draft';
import { foodParams } from '@/food/params';
import { recipeOf } from '@/food/recipes';

const R = (low: number, high: number) => ({ low, high });
const LENTILS = { id: 'fdc-7', name: 'Lentils, dry', per100g: { kcal: R(340, 360), proteinG: R(23, 26), carbsG: R(58, 62), fatG: R(1, 2) } };
const known = new Map([[LENTILS.id, LENTILS]]);
const lentils = (quantity: string) => addFood([], LENTILS).map((item) => ({ ...item, unit: 'g', quantity }));

test('a whole recipe: the contract\'s NewRecipe, name trimmed', () => {
  expect(recipeOf({ name: '  Lentil soup ', portions: '4', items: lentils('300') }, known, 'c-1')).toEqual({
    recipe: {
      clientId: 'c-1',
      name: 'Lentil soup',
      portions: 4,
      items: [{ foodId: 'fdc-7', amount: { quantity: 300, unit: 'g', certainty: 'ESTIMATED' } }],
    },
    missing: [],
  });
});

test('what is missing is said, part by part, and nothing is made', () => {
  expect(recipeOf({ name: ' ', portions: '', items: [] }, known, 'c-1')).toEqual({ recipe: null, missing: ['name', 'portions', 'items'] });
  expect(recipeOf({ name: 'Soup', portions: '4', items: lentils('') }, known, 'c-1').missing).toEqual(['items']);
});

test('portions: a whole number from 1 to the contract\'s most', () => {
  const max = foodParams.recipePortionsMax;
  const portions = (text: string) => recipeOf({ name: 'Soup', portions: text, items: lentils('300') }, known, 'c').missing;
  expect(portions('1')).toEqual([]);
  expect(portions(String(max))).toEqual([]);
  expect(portions(String(max + 1))).toEqual(['portions']);
  expect(portions('0')).toEqual(['portions']);
  expect(portions('2.5')).toEqual(['portions']);
  expect(portions('abc')).toEqual(['portions']);
});

test('a name longer than the server keeps is not made (counted in code points, as the server does)', () => {
  const max = foodParams.recipeNameMaxChars;
  expect(recipeOf({ name: '🍲'.repeat(max), portions: '1', items: lentils('300') }, known, 'c').missing).toEqual([]);
  expect(recipeOf({ name: 'a'.repeat(max + 1), portions: '1', items: lentils('300') }, known, 'c').missing).toEqual(['name']);
});
