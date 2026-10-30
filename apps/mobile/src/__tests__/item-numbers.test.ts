/**
 * One number for one item at one amount (Evre 7 fix a, ADR-090 #5): once the server has answered for the amount, the sheet, the tray,
 * the diary and the Details row all show the middle of that very range; the portion's catalog figure is only the stand-in when no
 * answer will come, and while one is on its way no number is shown rather than one that will move.
 */
import type { components } from '@/api/schema';
import type { DraftItem } from '@/food/draft';
import { numbersOf } from '@/food/ItemRows';
import { macrosOf } from '@/food/single';

type Schemas = components['schemas'];
const R = (low: number, high: number) => ({ low, high });

const portion: Schemas['Portion'] = { unit: '1 bowl', label: '1 bowl', kind: 'SERVING', grams: 200, kcal: 614, proteinG: 20, carbsG: 60, fatG: 12 };
const item: DraftItem = { foodId: 'oats', name: 'Oats', units: ['1 bowl', 'g'], quantity: '1', unit: '1 bowl', weighed: false, portions: [portion] };
// The range is not symmetric around the catalog figure (the value's error and the amount's multiply): its middle is 622.
const answered: Schemas['EstimatedItem'] = { foodId: 'oats', name: 'Oats', amount: { quantity: 1, unit: '1 bowl' }, kcal: R(560, 684), proteinG: R(17, 24), carbsG: R(52, 69), fatG: R(10, 15) };

describe('the one number of an item', () => {
  test('the sheet and the saved item show the same number once the server has answered', () => {
    const sheet = numbersOf(item, answered, undefined, false);
    expect(sheet).toEqual(macrosOf(answered));
    expect(sheet?.kcal).toBe(622);
  });

  test('when no answer will come, the catalog figure stands in', () => {
    expect(numbersOf(item, undefined, undefined, false)?.kcal).toBe(614);
  });

  test('while an answer is on its way, no number is shown rather than one that will move', () => {
    expect(numbersOf(item, undefined, undefined, true)).toBeNull();
  });

  test('an answer for another amount is not this amount\'s number', () => {
    const two = { ...item, quantity: '2' };
    expect(numbersOf(two, answered, undefined, false)?.kcal).toBe(1228);
    expect(numbersOf(two, answered, undefined, true)).toBeNull();
  });

  test('where it was logged and nothing changed, the day\'s own number', () => {
    expect(numbersOf(item, undefined, [answered], true)?.kcal).toBe(622);
  });

  test('an item whose portions are not known takes the answer', () => {
    const bare: DraftItem = { foodId: 'oats', name: 'Oats', units: ['g'], quantity: '1', unit: '1 bowl', weighed: false };
    expect(numbersOf(bare, answered, undefined, true)?.kcal).toBe(622);
    expect(numbersOf(bare, undefined, undefined, false)).toBeNull();
  });
});
