/**
 * The Turkish household measures in the portion picker (K-1213): the server offers a su bardağı, a kaşık, a kepçe as the units
 * "tr:<id>" for the foods they make sense for; the phone shows them only when Turkish is showing, in the words of that language.
 */
import type { components } from '@/api/schema';
import { portionLabel, unitLabel } from '@/food/amountText';
import { itemOf } from '@/food/draft';
import { setActiveLocale } from '@/copy/locales';

type Food = components['schemas']['Food'];

const portion = (unit: string, grams: number, kind: 'PIECE' | 'MEASURE' | 'WEIGHT', label = unit) => ({
  unit,
  label,
  kind,
  grams,
  kcal: grams,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
});

const yogurt = {
  id: 'fdc:1',
  name: 'Yogurt, plain, whole milk',
  per100g: { kcal: R(60, 70), proteinG: R(3, 4), carbsG: R(4, 5), fatG: R(3, 4) },
  servings: [],
  portions: [portion('1 cup', 245, 'MEASURE'), portion('tr:su-bardagi', 200, 'MEASURE', 'tr:su-bardagi'), portion('tr:yemek-kasigi', 25, 'MEASURE'), portion('g', 1, 'WEIGHT')],
  defaultAmount: { quantity: 1, unit: '1 cup' },
} as unknown as Food;

function R(low: number, high: number) {
  return { low, high };
}

afterEach(() => setActiveLocale('en'));

describe('the Turkish measures', () => {
  test('a Turkish phone is offered them, after the food\'s own measures', () => {
    setActiveLocale('tr');
    expect(itemOf(yogurt).units).toEqual(['1 cup', 'tr:su-bardagi', 'tr:yemek-kasigi', 'g']);
  });

  test('an English phone is not offered them, and a food logged in one falls back to its natural portion', () => {
    expect(itemOf(yogurt).units).toEqual(['1 cup', 'g']);
    expect(itemOf(yogurt, { quantity: 2, unit: 'tr:su-bardagi' }).unit).toBe('1 cup');
  });

  test('each is named in the language showing, and a su bardağı says it is 200 ml', () => {
    expect(unitLabel('tr:su-bardagi')).toBe('Turkish cup (200 ml)');
    setActiveLocale('tr');
    expect(unitLabel('tr:su-bardagi')).toBe('su bardağı (200 ml)');
    expect(unitLabel('tr:corba-kepcesi')).toBe('çorba kepçesi');
  });

  test('a chip shows the unit\'s words, never the server\'s id; any other portion keeps the server\'s label', () => {
    setActiveLocale('tr');
    const item = itemOf(yogurt);
    expect(portionLabel(item.portions, 'tr:yemek-kasigi')).toBe('yemek kaşığı');
    expect(portionLabel(item.portions, '1 cup')).toBe('1 cup');
  });
});
