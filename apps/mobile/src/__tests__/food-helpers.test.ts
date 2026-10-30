/**
 * The small, pure parts of the food page and the meal screen (K-1063, ADR-090): days on the phone's calendar, the moment a meal logged
 * into a day is given, the slots of the user's own day, the single numbers, the portion step's arithmetic of words, a quick add as the
 * contract's item.
 */
import type { components } from '@/api/schema';
import { addDays, dayLabel, eatenAtFor, sameTimeOn, stripDays } from '@/food/dayLabel';
import { type DraftItem, addFood, addQuick, itemProblem, requestOfItem, requestsOf } from '@/food/draft';
import { foodDetail, suggestionDetail } from '@/food/foodRows';
import { amountGrams } from '@/food/meals';
import { foodParams } from '@/food/params';
import { isCounted, quantityInPortion, stepOf } from '@/food/portions';
import { ALL_SLOTS, dayOrder, emptySlotsOf, perMealKcal, usedSlots } from '@/food/slots';
import { macrosOf, macrosOfPortion, mid } from '@/food/single';
import { kindsOfMeal } from '@/food/useFoodExtras';

type Schemas = components['schemas'];
const R = (low: number, high: number) => ({ low, high });

describe('days on the phone\'s calendar', () => {
  test('a day some days away, across a month and a year end', () => {
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2026-02-27', 2)).toBe('2026-03-01');
  });

  test('the strip is the last 30 days, today last', () => {
    const days = stripDays('2026-09-29');
    expect(foodParams.dayStripDays).toBe(30);
    expect(days).toHaveLength(30);
    expect(days[0]).toBe('2026-08-31');
    expect(days.at(-1)).toBe('2026-09-29');
  });

  test('today, yesterday, else the weekday and date', () => {
    expect(dayLabel('2026-09-29', '2026-09-29')).toBe('Today');
    expect(dayLabel('2026-09-28', '2026-09-29')).toBe('Yesterday');
    expect(dayLabel('2026-09-25', '2026-09-29')).toBe('Fri, Sep 25');
  });

  test('a meal logged into today is now; into a day gone by it is given the slot\'s usual hour on that day', () => {
    const now = new Date(2026, 8, 29, 13, 5);
    expect(eatenAtFor('2026-09-29', 'LUNCH', now)).toBe(now.toISOString());
    expect(eatenAtFor('2026-09-25', 'LUNCH', now)).toBe(new Date(2026, 8, 25, foodParams.pastDaySlotHours.LUNCH).toISOString());
    expect(eatenAtFor('2026-09-25', 'BREAKFAST', now)).toBe(new Date(2026, 8, 25, foodParams.pastDaySlotHours.BREAKFAST).toISOString());
  });

  test('a copy keeps the time of day on its new day; into today it is now', () => {
    const now = new Date(2026, 8, 29, 13, 5);
    const original = new Date(2026, 8, 25, 19, 30).toISOString();
    expect(sameTimeOn(original, '2026-09-27', '2026-09-29', now)).toBe(new Date(2026, 8, 27, 19, 30).toISOString());
    expect(sameTimeOn(original, '2026-09-29', '2026-09-29', now)).toBe(now.toISOString());
  });
});

describe('the slots of the user\'s own day (ADR-090 Ek 3: "I eat N meals a day")', () => {
  test('the slots logged into lately, in the day\'s order; the others a tap away', () => {
    expect(usedSlots([{ slot: 'DINNER' }, { slot: 'BREAKFAST' }, { slot: 'DINNER' }])).toEqual(['BREAKFAST', 'DINNER']);
  });

  test('today\'s slots count too', () => {
    expect(usedSlots([{ slot: 'BREAKFAST' }], ['LUNCH'])).toEqual(['BREAKFAST', 'LUNCH']);
  });

  test('before a pattern shows (fewer than two slots) all four are offered', () => {
    expect(usedSlots([])).toEqual(ALL_SLOTS);
    expect(usedSlots([{ slot: 'LUNCH' }])).toEqual(ALL_SLOTS);
  });

  test('the slots of the day that have no meal on the day shown', () => {
    expect(emptySlotsOf(['BREAKFAST', 'LUNCH', 'DINNER'], ['LUNCH'])).toEqual(['BREAKFAST', 'DINNER']);
  });

  test('filled and empty sections share one order: Breakfast, Lunch, Dinner, Snack', () => {
    expect(dayOrder(['DINNER'], ['BREAKFAST', 'LUNCH', 'SNACK'])).toEqual(ALL_SLOTS);
    expect(dayOrder(['SNACK', 'BREAKFAST'], ['DINNER'])).toEqual(['BREAKFAST', 'DINNER', 'SNACK']);
    expect(dayOrder(['LUNCH'], ['LUNCH'])).toEqual(['LUNCH']);
  });

  test('a meal of the day is about the target over the slots in use, rounded; nothing without a target', () => {
    expect(perMealKcal(2400, 4)).toBe(600);
    expect(perMealKcal(2300, 3)).toBe(750); // 766.7 rounds to the nearest 50
    expect(perMealKcal(undefined, 3)).toBeNull();
    expect(perMealKcal(2400, 0)).toBeNull();
  });

  test('past meals to log again: one of each kind, the freshest first, no more than the screen lists', () => {
    const meal = (id: string, eatenAt: string, name: string): Schemas['Meal'] => ({
      id,
      clientId: id,
      eatenAt,
      slot: 'LUNCH',
      items: [{ foodId: name, name, amount: { quantity: 1, unit: 'g' }, kcal: R(1, 2), proteinG: R(1, 2) }],
      kcal: R(1, 2),
      proteinG: R(1, 2),
    });
    const kinds = kindsOfMeal([meal('a', '2026-09-20T10:00:00Z', 'Rice'), meal('b', '2026-09-27T10:00:00Z', 'Rice'), meal('c', '2026-09-25T10:00:00Z', 'Soup')]);
    expect(kinds.map((m) => m.id)).toEqual(['b', 'c']);
    const many = Array.from({ length: 30 }, (_, i) => meal(`m${i}`, `2026-09-${String((i % 28) + 1).padStart(2, '0')}T10:00:00Z`, `Food ${i}`));
    expect(kindsOfMeal(many)).toHaveLength(foodParams.logAgainMax);
  });
});

describe('single numbers (ADR-090 #5)', () => {
  test('the middle of a range, whole', () => {
    expect(mid(R(66, 80))).toBe(73);
    expect(mid(R(1, 2))).toBe(2);
    expect(mid(R(0, 0))).toBe(0);
  });

  test('a logged item, a meal, a day: kcal, protein, carbs, fat; what a range does not carry is 0', () => {
    expect(macrosOf({ kcal: R(100, 120), proteinG: R(5, 7), carbsG: R(10, 14), fatG: R(2, 3) })).toEqual({ kcal: 110, protein: 6, carbs: 12, fat: 3 });
    expect(macrosOf({ kcal: R(100, 120), proteinG: R(5, 7) })).toEqual({ kcal: 110, protein: 6, carbs: 0, fat: 0 });
  });

  test('a portion at a quantity: its own numbers times how many', () => {
    const egg: Schemas['Portion'] = { unit: '1 large', label: '1 large', kind: 'PIECE', grams: 50, kcal: 72, proteinG: 6.3, carbsG: 0.4, fatG: 4.8 };
    expect(macrosOfPortion(egg, 1)).toEqual({ kcal: 72, protein: 6, carbs: 0, fat: 5 });
    expect(macrosOfPortion(egg, 2)).toEqual({ kcal: 144, protein: 13, carbs: 1, fat: 10 });
    expect(macrosOfPortion(egg, 0.5)).toEqual({ kcal: 36, protein: 3, carbs: 0, fat: 2 });
  });

  test('a row says the portion a food opens on, then its numbers: brand first for a product', () => {
    const egg: Schemas['Food'] = {
      id: 'e',
      name: 'Egg',
      per100g: { kcal: R(130, 160), proteinG: R(12, 14), carbsG: R(0, 1), fatG: R(9, 11) },
      portions: [{ unit: '1 large', label: '1 large', kind: 'PIECE', grams: 50, kcal: 72, proteinG: 6.3, carbsG: 0.4, fatG: 4.8 }],
      defaultAmount: { quantity: 1, unit: '1 large' },
    };
    expect(foodDetail(egg)).toBe('1 large · 72 kcal · P 6 · C 0 · F 5');
    expect(foodDetail({ ...egg, brand: 'Happy Hens' })).toBe('Happy Hens · 1 large · 72 kcal · P 6 · C 0 · F 5');
    expect(foodDetail({ ...egg, defaultAmount: { quantity: 2, unit: '1 large' } })).toBe('2 × 1 large · 144 kcal · P 13 · C 1 · F 10');
    const eaten: Schemas['Suggestion'] = { foodId: 'e', name: 'Egg', amount: { quantity: 2, unit: '1 large' }, kcal: R(130, 160), proteinG: R(12, 14) };
    expect(suggestionDetail(eaten)).toBe('2 × 1 large · 145 kcal · P 13');
  });
});

describe('the portion step', () => {
  const portions: Schemas['Portion'][] = [
    { unit: '1 large', label: '1 large', kind: 'PIECE', grams: 50, kcal: 72, proteinG: 6, carbsG: 0, fatG: 5 },
    { unit: 'g', label: 'g', kind: 'WEIGHT', grams: 1, kcal: 1.4, proteinG: 0.1, carbsG: 0, fatG: 0.1 },
    { unit: 'oz', label: 'oz', kind: 'WEIGHT', grams: 28.3495, kcal: 40, proteinG: 3, carbsG: 0, fatG: 3 },
    { unit: 'ml', label: 'ml', kind: 'VOLUME', grams: 1.03, kcal: 1.5, proteinG: 0.1, carbsG: 0, fatG: 0.1 },
  ];
  const egg: Schemas['Food'] = {
    id: 'e',
    name: 'Egg',
    per100g: { kcal: R(130, 160), proteinG: R(12, 14), carbsG: R(0, 1), fatG: R(9, 11) },
    portions,
    defaultAmount: { quantity: 1, unit: '1 large' },
  };

  test('a food comes in on its natural portion, the others as units after it', () => {
    const [item] = addFood([], egg);
    expect(item).toMatchObject({ unit: '1 large', quantity: '1', units: ['1 large', 'g', 'oz', 'ml'] });
  });

  test('a recent food keeps the amount it was had in, when that portion still exists', () => {
    expect(addFood([], egg, { quantity: 3, unit: 'g' })[0]).toMatchObject({ unit: 'g', quantity: '3' });
    expect(addFood([], egg, { quantity: 3, unit: '1 jumbo' })[0]).toMatchObject({ unit: '1 large', quantity: '1' });
  });

  test('a food without portions (an older answer) still comes in on its first serving that is not a volume', () => {
    const bowl: Schemas['Food'] = { id: 'r', name: 'Rice', per100g: egg.per100g, servings: [{ name: '1 cup', grams: 158 }, { name: '1 bowl', grams: 200 }] };
    expect(addFood([], bowl)[0]).toMatchObject({ unit: '1 bowl', quantity: '1' });
  });

  test('one tap of the stepper: tens of grams or millilitres, half an ounce, half of anything counted', () => {
    expect(stepOf('g', portions[1])).toBe(foodParams.amountStepG);
    expect(stepOf('ml', portions[3])).toBe(foodParams.amountStepG);
    expect(stepOf('oz', portions[2])).toBe(foodParams.amountStepOz);
    expect(stepOf('1 large', portions[0])).toBe(foodParams.amountStepServing);
  });

  test('counted portions get the half, 1, 2, 3 chips; a weight does not', () => {
    expect(isCounted(portions[0], '1 large')).toBe(true);
    expect(isCounted(portions[1], 'g')).toBe(false);
    expect(isCounted(portions[2], 'oz')).toBe(false);
    expect(isCounted(undefined, '1 bowl')).toBe(true);
  });

  test('another portion keeps the weight: 2 large eggs (100 g) are 100 g, 3.5 oz; and back, to the half', () => {
    const [item] = addFood([], egg);
    const two: DraftItem = { ...item, quantity: '2' };
    expect(quantityInPortion(two, 'g')).toBe('100');
    expect(quantityInPortion(two, 'oz')).toBe('3.5');
    expect(quantityInPortion({ ...item, unit: 'g', quantity: '75' }, '1 large')).toBe('1.5');
    // Never zero: a pinch of egg is the smallest step, not nothing.
    expect(quantityInPortion({ ...item, unit: 'g', quantity: '1' }, '1 large')).toBe('0.5');
  });

  test('without the portions known, grams open on 100 g and a counted portion on 1', () => {
    const bare: DraftItem = { foodId: 'r', name: 'Rice', units: ['1 bowl', 'g'], quantity: '2', unit: '1 bowl', weighed: false };
    expect(quantityInPortion(bare, 'g')).toBe(String(foodParams.defaultGrams));
    expect(quantityInPortion({ ...bare, unit: 'g' }, '1 bowl')).toBe('1');
  });

  test('the grams an amount makes come from the food\'s own portion, else grams, ounces, a serving', () => {
    expect(amountGrams(egg, { quantity: 2, unit: '1 large' })).toBe(100);
    expect(amountGrams({ ...egg, portions: undefined }, { quantity: 2, unit: 'oz' })).toBeCloseTo(56.699, 2);
    expect(amountGrams({ ...egg, portions: undefined, servings: [{ name: '1 cup', grams: 158 }] }, { quantity: 2, unit: '1 cup' })).toBe(316);
    expect(amountGrams({ ...egg, portions: undefined }, { quantity: 1, unit: '1 jumbo' })).toBeNull();
  });
});

describe('a quick add (calories and macros, no food)', () => {
  const quick = (kcal: string, protein = '', carbs = '', fat = ''): DraftItem => addQuick([], { kcal, protein, carbs, fat })[0];

  test('is its calories, and the macros typed; a macro left empty is not sent', () => {
    expect(requestsOf([quick('350', '20', '', '10')], new Map())).toEqual([
      { foodId: 'quick', amount: { quantity: 1, unit: 'serving' }, quick: { kcal: 350, proteinG: 20, fatG: 10 } },
    ]);
  });

  test('without calories there is nothing to log; calories must be whole, above 0, and within the contract', () => {
    expect(itemProblem(quick(''), new Map())).toBe('missing');
    expect(itemProblem(quick('0'), new Map())).toBe('invalid');
    expect(itemProblem(quick('12.5'), new Map())).toBe('invalid');
    expect(itemProblem(quick(String(foodParams.quickAddKcalMax + 1)), new Map())).toBe('invalid');
    expect(itemProblem(quick('300', String(foodParams.quickAddMacroMax + 1)), new Map())).toBe('invalid');
    expect(itemProblem(quick('300', '20', '30', '10'), new Map())).toBeNull();
    expect(requestsOf([quick('')], new Map())).toBeNull();
  });

  test('a logged quick add is put back with its own numbers (an undo, a copy): exact, low is high', () => {
    const logged: Schemas['EstimatedItem'] = { foodId: 'quick', name: 'Quick add', amount: { quantity: 1, unit: 'serving' }, kcal: R(350, 350), proteinG: R(20, 20), carbsG: R(0, 0), fatG: R(10, 10) };
    expect(requestOfItem(logged)).toEqual({ foodId: 'quick', amount: { quantity: 1, unit: 'serving' }, quick: { kcal: 350, proteinG: 20, carbsG: 0, fatG: 10 } });
  });

  test('a logged food is put back as it was: its amount and how well it was known', () => {
    const logged: Schemas['EstimatedItem'] = { foodId: 'e', name: 'Egg', amount: { quantity: 2, unit: '1 large', certainty: 'WEIGHED' }, kcal: R(130, 160), proteinG: R(12, 14) };
    expect(requestOfItem(logged)).toEqual({ foodId: 'e', amount: { quantity: 2, unit: '1 large', certainty: 'WEIGHED' } });
  });
});
