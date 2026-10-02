/**
 * A recipe in a meal (K-423, ADR-034): one item, "recipe:<id>", counted in portions — at most the whole recipe, at most
 * the contract's decimals — so the queue never holds a meal the server would refuse. A recipe whose ingredient the
 * database dropped cannot be added. Recipes are found by name beside the database's foods.
 */
import type { components } from '@/api/schema';
import { addRecipe, draftOf, itemProblem, requestsOf } from '@/food/draft';
import { recipeMatches } from '@/food/recipes';

type Recipe = components['schemas']['Recipe'];
const R = (low: number, high: number) => ({ low, high });
const soup: Recipe = {
  id: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  name: 'Lentil soup',
  portions: 4,
  items: [],
  perPortion: { kcal: R(250, 300), proteinG: R(14, 17), carbsG: R(35, 42), fatG: R(5, 8) },
};
const stew: Recipe = { ...soup, id: '33333333-3333-4333-8333-333333333333', name: 'Bean stew', unavailable: ['fdc-9'], perPortion: undefined };
const recipes = new Map([[`recipe:${soup.id}`, soup]]);

test('added: one item, counted in portions, no amount yet', () => {
  expect(addRecipe([], soup)).toEqual([
    { foodId: `recipe:${soup.id}`, name: 'Lentil soup', units: ['portion'], quantity: '', unit: 'portion', weighed: false },
  ]);
});

test('at most the whole recipe: more portions than it makes is too much, and the meal is not sent', () => {
  const [item] = addRecipe([], soup);
  expect(itemProblem({ ...item, quantity: '4' }, new Map(), recipes)).toBeNull();
  expect(itemProblem({ ...item, quantity: '1,5' }, new Map(), recipes)).toBeNull();
  expect(itemProblem({ ...item, quantity: '4.5' }, new Map(), recipes)).toBe('tooMuch');
  expect(requestsOf([{ ...item, quantity: '5' }], new Map(), recipes)).toBeNull();
  expect(itemProblem({ ...item, quantity: '0.333' }, new Map(), recipes)).toBe('invalid');
});

test('sent as the contract asks: portions, estimated — never "weighed"', () => {
  const [item] = addRecipe([], soup);
  expect(requestsOf([{ ...item, quantity: '2', weighed: true }], new Map(), recipes)).toEqual([
    { foodId: `recipe:${soup.id}`, amount: { quantity: 2, unit: 'portion', certainty: 'ESTIMATED' } },
  ]);
});

test('a logged meal with a recipe opens to correct in portions only (no grams for a recipe)', () => {
  const meal = {
    id: 'm1',
    clientId: 'c1',
    eatenAt: '2026-10-02T12:00:00Z',
    slot: 'LUNCH' as const,
    items: [{ foodId: `recipe:${soup.id}`, name: 'Lentil soup', amount: { quantity: 1, unit: 'portion', certainty: 'ESTIMATED' as const }, kcal: R(250, 300), proteinG: R(14, 17) }],
    kcal: R(250, 300),
    proteinG: R(14, 17),
  };
  expect(draftOf(meal).items[0]).toMatchObject({ units: ['portion'], unit: 'portion', quantity: '1' });
});

test('found by name, whatever the case; one the database can no longer estimate is marked, not offered', () => {
  expect(recipeMatches([soup, stew], 'LENTIL')).toEqual([{ recipe: soup, available: true }]);
  expect(recipeMatches([soup, stew], 'stew')).toEqual([{ recipe: stew, available: false }]);
  expect(recipeMatches([soup, stew], ' ')).toEqual([]);
});

test("found the same on a Turkish iPhone: I/ı and İ/i fold alike, whatever the device's locale", () => {
  const iced = { ...soup, name: 'Iced oatmeal' };
  const icli = { ...soup, id: 'x', name: 'İçli köfte' };
  expect(recipeMatches([iced, icli], 'iced').map((m) => m.recipe.name)).toEqual(['Iced oatmeal']);
  expect(recipeMatches([iced, icli], 'ıced').map((m) => m.recipe.name)).toEqual(['Iced oatmeal']);
  expect(recipeMatches([iced, icli], 'içli').map((m) => m.recipe.name)).toEqual(['İçli köfte']);
  expect(recipeMatches([iced, icli], 'IÇLI').map((m) => m.recipe.name)).toEqual(['İçli köfte']);
});

test('a recipe in a meal that the user no longer has (deleted, or an ingredient dropped): its own problem, once recipes are known', () => {
  const item = { foodId: `recipe:${stew.id}`, name: 'Bean stew', units: ['portion'], quantity: '1', unit: 'portion', weighed: false };
  expect(itemProblem(item, new Map())).toBeNull(); // recipes not read yet: left to the server
  expect(itemProblem(item, new Map(), new Map())).toBe('recipeGone'); // read, and not there
  expect(itemProblem(item, new Map(), new Map([[`recipe:${stew.id}`, stew]]))).toBe('recipeGone'); // there, unavailable
});
