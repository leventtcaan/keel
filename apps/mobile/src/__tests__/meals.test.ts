/**
 * The day's meals on the phone (K-407): the server's list joined with what the phone has not sent yet, each meal once by
 * clientId; offline, the copies the server sent back; a refused one is not a meal. "Same as yesterday" offers yesterday's
 * meals for the slots today has not logged. The slot a new meal starts on comes from the clock (data/parameters/food.json),
 * and an amount is what the contract takes (at most 2 decimals, at most 5000 g).
 */
import type { components } from '@/api/schema';
import { amountGrams, dayMeals, defaultSlot, parseQuantity, repeatOffers } from '@/food/meals';
import type { LocalRecord } from '@/sync/store';

type Schemas = components['schemas'];

const meal = (id: string, eatenAt: string, slot: Schemas['MealSlot'], name = 'Oats'): Schemas['Meal'] => ({
  id,
  clientId: `c-${id}`,
  eatenAt,
  slot,
  items: [{ foodId: 'f1', name, amount: { quantity: 80, unit: 'g' }, kcal: { low: 280, high: 320 }, proteinG: { low: 9, high: 11 } }],
  kcal: { low: 280, high: 320 },
  proteinG: { low: 9, high: 11 },
});

let seq = 0;
const local = (body: Schemas['NewMeal'], state: LocalRecord['state'], serverBody: unknown = null): LocalRecord => ({
  seq: ++seq,
  clientId: body.clientId,
  kind: 'meal',
  parentClientId: null,
  body,
  state,
  serverId: state === 'SYNCED' ? 'srv' : null,
  serverBody,
  errorCode: state === 'REJECTED' ? 'CONSENT_REQUIRED' : null,
});
const at = (h: number, m = 0, day = 29) => new Date(2026, 8, day, h, m).toISOString();
const newMeal = (clientId: string, eatenAt: string, slot: Schemas['MealSlot']): Schemas['NewMeal'] => ({
  clientId,
  eatenAt,
  slot,
  items: [{ foodId: 'f1', amount: { quantity: 1, unit: 'g' } }],
});

describe('dayMeals', () => {
  const day = '2026-09-29';

  test("the server's meals, then the phone's not yet sent, in time order", () => {
    const server = [meal('m2', at(13), 'LUNCH'), meal('m1', at(8), 'BREAKFAST')];
    const waiting = local(newMeal('w1', at(10), 'SNACK'), 'PENDING');
    const rows = dayMeals(server, [waiting], day);
    expect(rows.map((r) => (r.kind === 'sent' ? r.meal.id : r.clientId))).toEqual(['m1', 'w1', 'm2']);
    expect(rows[1]).toEqual({ kind: 'waiting', clientId: 'w1', eatenAt: at(10), slot: 'SNACK' });
  });

  test('a meal the server already has is shown once, as the server has it', () => {
    const server = [meal('m1', at(8), 'BREAKFAST')];
    const synced = local({ ...newMeal('c-m1', at(8), 'BREAKFAST') }, 'SYNCED', meal('m1', at(8), 'BREAKFAST'));
    const pendingTwin = local({ ...newMeal('c-m1', at(8), 'BREAKFAST') }, 'PENDING');
    expect(dayMeals(server, [synced, pendingTwin], day)).toEqual([{ kind: 'sent', meal: server[0] }]);
  });

  test("a synced meal missing from the server's list was deleted there: it is not shown again", () => {
    const synced = local(newMeal('c-m1', at(8), 'BREAKFAST'), 'SYNCED', meal('m1', at(8), 'BREAKFAST'));
    expect(dayMeals([], [synced], day)).toEqual([]);
  });

  test("offline: the server's copies the phone kept, and the ones waiting", () => {
    const synced = local(newMeal('c-m1', at(8), 'BREAKFAST'), 'SYNCED', meal('m1', at(8), 'BREAKFAST'));
    const waiting = local(newMeal('w1', at(12), 'LUNCH'), 'PENDING');
    const rows = dayMeals(null, [synced, waiting], day);
    expect(rows).toEqual([
      { kind: 'sent', meal: meal('m1', at(8), 'BREAKFAST') },
      { kind: 'waiting', clientId: 'w1', eatenAt: at(12), slot: 'LUNCH' },
    ]);
  });

  test('another day, another kind and a refused meal are left out', () => {
    const yesterday = local(newMeal('y1', at(12, 0, 28), 'LUNCH'), 'PENDING');
    const refused = local(newMeal('r1', at(12), 'LUNCH'), 'REJECTED');
    const weighIn: LocalRecord = { ...local(newMeal('x1', at(9), 'LUNCH'), 'PENDING'), kind: 'weighIn' };
    expect(dayMeals([], [yesterday, refused, weighIn], day)).toEqual([]);
  });

  test('a repeat waiting to be sent carries the meal it repeats', () => {
    const repeat = local({ clientId: 'w2', eatenAt: at(9), slot: 'BREAKFAST', repeatOf: 'm0' }, 'PENDING');
    expect(dayMeals([], [repeat], day)).toEqual([{ kind: 'waiting', clientId: 'w2', eatenAt: at(9), slot: 'BREAKFAST', repeatOf: 'm0' }]);
  });
});

describe('repeatOffers', () => {
  test("yesterday's meals whose slot today has not logged, in yesterday's order", () => {
    const yesterday = [meal('y1', at(8, 0, 28), 'BREAKFAST'), meal('y2', at(13, 0, 28), 'LUNCH'), meal('y3', at(19, 0, 28), 'DINNER')];
    const today = dayMeals([meal('m1', at(8), 'BREAKFAST')], [local(newMeal('w1', at(19), 'DINNER'), 'PENDING')], '2026-09-29');
    expect(repeatOffers(yesterday, today).map((m) => m.id)).toEqual(['y2']);
  });

  test('nothing yesterday, nothing offered', () => {
    expect(repeatOffers([], [])).toEqual([]);
  });
});

describe('defaultSlot', () => {
  test.each([
    [4, 'BREAKFAST'],
    [10, 'BREAKFAST'],
    [11, 'LUNCH'],
    [15, 'LUNCH'],
    [16, 'DINNER'],
    [21, 'DINNER'],
    [22, 'SNACK'],
    [23, 'SNACK'],
    [0, 'SNACK'],
    [3, 'SNACK'],
  ])('at %i h it is %s', (hour, slot) => {
    expect(defaultSlot(new Date(2026, 8, 29, hour, 30))).toBe(slot);
  });
});

describe('parseQuantity', () => {
  test.each([
    ['80', 80],
    ['1.5', 1.5],
    ['0,25', 0.25],
    [' 2 ', 2],
  ])('%s is %d', (text, value) => {
    expect(parseQuantity(text)).toBe(value);
  });

  test.each(['', '0', '-1', '1.234', 'abc', '1e3', '1,000.5'])('%s is not an amount', (text) => {
    expect(parseQuantity(text)).toBeNull();
  });
});

describe('amountGrams', () => {
  const food: Schemas['Food'] = {
    id: 'f1',
    name: 'Rice',
    per100g: { kcal: { low: 1, high: 2 }, proteinG: { low: 0, high: 1 }, carbsG: { low: 0, high: 1 }, fatG: { low: 0, high: 1 } },
    servings: [{ name: '1 cup', grams: 158 }],
  };

  test('grams are grams; a serving is its grams times the quantity', () => {
    expect(amountGrams(food, { quantity: 120, unit: 'g' })).toBe(120);
    expect(amountGrams(food, { quantity: 2, unit: '1 cup' })).toBe(316);
  });

  test('a unit the food does not have is unknown', () => {
    expect(amountGrams(food, { quantity: 1, unit: '1 slice' })).toBeNull();
  });
});
