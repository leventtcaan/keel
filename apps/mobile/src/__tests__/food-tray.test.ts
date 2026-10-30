/**
 * The small, pure parts of the rebuilt meal log (Evre 7 A, ADR-090 Ek 6): what a meal already holds on the day (the tray and the
 * calories on each meal's pill), the past meals of a slot as one row each, and the meal the screen opens on from the user's own pattern.
 */
import type { components } from '@/api/schema';
import { foodParams } from '@/food/params';
import type { DayMeal } from '@/food/meals';
import { likelySlot } from '@/food/slots';
import { logsToRepeat, slotKcal, slotLogs, trayOf } from '@/food/tray';
import { rangeText } from '@/food/single';

type Schemas = components['schemas'];
const R = (low: number, high: number) => ({ low, high });
const at = (day: number, hour: number, minute = 0) => new Date(2026, 8, day, hour, minute).toISOString();
const meal = (id: string, slot: Schemas['MealSlot'], day: number, hour: number, ...items: [string, string, number, number][]): Schemas['Meal'] => ({
  id,
  clientId: `c-${id}`,
  eatenAt: at(day, hour),
  slot,
  items: items.map(([foodId, name, low, high]) => ({ foodId, name, amount: { quantity: 1, unit: 'bowl' }, kcal: R(low, high), proteinG: R(1, 2) })),
  kcal: R(items.reduce((sum, item) => sum + item[2], 0), items.reduce((sum, item) => sum + item[3], 0)),
  proteinG: R(1, 2),
});
const sent = (m: Schemas['Meal']): DayMeal => ({ kind: 'sent', meal: m });

describe('the tray and the calories on each pill', () => {
  const rows: DayMeal[] = [
    sent(meal('a', 'BREAKFAST', 29, 8, ['oats', 'Oats', 280, 320], ['milk', 'Milk', 140, 160])),
    sent(meal('b', 'LUNCH', 29, 13, ['rice', 'Rice', 190, 210])),
    { kind: 'waiting', clientId: 'w1', eatenAt: at(29, 9), slot: 'BREAKFAST' },
  ];

  test('the items of one slot in the order logged, each with where it is on the server', () => {
    const tray = trayOf(rows.slice(0, 2), 'BREAKFAST', new Map());
    expect(tray.map((item) => [item.name, item.kcal, item.index])).toEqual([
      ['Oats', 300, 0],
      ['Milk', 150, 1],
    ]);
    expect(tray[0].meal?.id).toBe('a');
  });

  test('a meal not sent yet is the names the screen put in; unknown, it is only "not sent yet", and cannot be changed', () => {
    const known = new Map([['w1', [{ name: 'Banana', amount: '1 medium', kcal: 105 }]]]);
    expect(trayOf(rows, 'BREAKFAST', known).map((item) => [item.name, item.kcal, item.meal === undefined])).toEqual([
      ['Oats', 300, false],
      ['Milk', 150, false],
      ['Banana', 105, true],
    ]);
    const last = trayOf(rows, 'BREAKFAST', new Map()).at(-1);
    expect(last?.kcal).toBeNull();
    expect(last?.meal).toBeUndefined();
  });

  test('a slot\'s calories add the server\'s middles and what the screen knows of the unsent; a slot with nothing is absent', () => {
    const known = new Map([['w1', [{ name: 'Banana', amount: null, kcal: 105 }]]]);
    expect(slotKcal(rows, known)).toEqual({ BREAKFAST: 450 + 105, LUNCH: 200 });
    expect(slotKcal(rows, new Map()).BREAKFAST).toBe(450); // the unsent one adds nothing it does not know
    expect(slotKcal([], new Map())).toEqual({});
  });
});

describe('a past meal of a slot, as one row', () => {
  const history = [
    meal('l1', 'LUNCH', 28, 12, ['rice', 'Rice', 190, 210]),
    meal('l1b', 'LUNCH', 28, 13, ['apple', 'Apple', 70, 90]),
    meal('l2', 'LUNCH', 27, 12, ['rice', 'Rice', 190, 210]),
    meal('l3', 'LUNCH', 26, 12, ['soup', 'Soup', 100, 120]),
    meal('d1', 'DINNER', 28, 19, ['fish', 'Fish', 300, 340]),
    meal('l0', 'LUNCH', 29, 12, ['egg', 'Egg', 70, 90]),
  ];

  test('every log of a day and slot is one meal: their foods together, their calories added', () => {
    const logs = slotLogs(history);
    const lunch = logs.find((log) => log.day === '2026-09-28' && log.slot === 'LUNCH');
    expect(lunch?.items.map((item) => item.name).sort()).toEqual(['Apple', 'Rice']);
    expect(lunch?.kcal).toBe(200 + 80);
    expect(lunch?.meals).toHaveLength(2);
  });

  test('the slot asked for only, not the day being logged, one of each kind, freshest first, at most the parameter', () => {
    const picked = logsToRepeat(slotLogs(history), 'LUNCH', '2026-09-29', foodParams.logAgainRowsMax);
    expect(picked.map((log) => log.day)).toEqual(['2026-09-28', '2026-09-27', '2026-09-26'].slice(0, foodParams.logAgainRowsMax));
    // 27th is rice alone, 28th is rice and apple: different kinds, so both stay; a second rice-alone would not.
    expect(logsToRepeat(slotLogs([...history, meal('l4', 'LUNCH', 25, 12, ['rice', 'Rice', 190, 210])]), 'LUNCH', '2026-09-29', 10).map((log) => log.day)).not.toContain('2026-09-25');
    expect(logsToRepeat(slotLogs(history), 'SNACK', '2026-09-29', 5)).toEqual([]);
  });
});

describe('the meal the screen opens on', () => {
  const lunches = [28, 27, 26].map((day) => ({ slot: 'LUNCH' as const, eatenAt: at(day, 15, 0) }));
  const breakfasts = [28, 27, 26].map((day) => ({ slot: 'BREAKFAST' as const, eatenAt: at(day, 9, 0) }));
  const history = [...lunches, ...breakfasts];

  test('the slot whose usual time is nearest to now, once the pattern has enough logs', () => {
    expect(foodParams.slotPatternMinLogs).toBe(3);
    expect(likelySlot(history, new Date(2026, 8, 29, 14, 30), 'DINNER')).toBe('LUNCH');
    expect(likelySlot(history, new Date(2026, 8, 29, 10, 0), 'LUNCH')).toBe('BREAKFAST');
  });

  test('fewer logs than that, or a usual time too far from now: the clock decides', () => {
    // Two lunches are not a pattern (the parameter asks three): the clock's word stands.
    expect(likelySlot(history.slice(1, 3), new Date(2026, 8, 29, 14, 30), 'DINNER')).toBe('DINNER');
    expect(likelySlot(history, new Date(2026, 8, 29, 22, 0), 'SNACK')).toBe('SNACK');
    expect(likelySlot([], new Date(2026, 8, 29, 13, 0), 'LUNCH')).toBe('LUNCH');
  });

  test('time of day is circular: a usual 23:50 is near 00:10', () => {
    const late = [28, 27, 26].map((day) => ({ slot: 'SNACK' as const, eatenAt: at(day, 23, 50) }));
    expect(likelySlot(late, new Date(2026, 8, 30, 0, 10), 'BREAKFAST')).toBe('SNACK');
  });
});

describe('a range whose ends are the same is one number', () => {
  test('"2,050 kcal", never "2,050-2,050"', () => {
    expect(rangeText(R(2050, 2050), 'kcal')).toBe('2,050 kcal');
    expect(rangeText(R(0, 0), 'kcal')).toBe('0 kcal');
    expect(rangeText(R(110, 204), 'kcal')).toBe('110-204 kcal');
  });
});
