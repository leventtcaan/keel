/**
 * A meal the coach read, handed to the meal screen (K-509): in memory, once — never in a link (V3: the words a user
 * eats stay out of URLs).
 */
import { clearMeal, handOffMeal, handedFrom, takeMeal } from '@/food/handoff';

beforeEach(() => void takeMeal());

test('what is handed over is taken once', () => {
  const items = [{ foodId: 'fdc-1', name: 'Egg', quantity: 2, unit: 'piece' }];
  handOffMeal(items);
  expect(takeMeal()).toEqual(items);
  expect(takeMeal()).toBeNull();
});

test('nothing handed over is nothing taken', () => {
  expect(takeMeal()).toBeNull();
});

test('a second hand-over replaces the first', () => {
  handOffMeal([{ foodId: 'a', name: 'A', quantity: 1, unit: 'g' }]);
  handOffMeal([{ foodId: 'b', name: 'B', quantity: 2, unit: 'g' }]);
  expect(takeMeal()).toEqual([{ foodId: 'b', name: 'B', quantity: 2, unit: 'g' }]);
});

test('a meal from a photo says so, once (K-408): the meal screen tells why it asks for grams', () => {
  handOffMeal([{ foodId: 'a', name: 'A', quantity: 180, unit: 'g' }], 'photo');
  expect(handedFrom()).toBe('photo');
  takeMeal();
  expect(handedFrom()).toBeNull();
  handOffMeal([{ foodId: 'a', name: 'A', quantity: 1, unit: 'cup' }]);
  expect(handedFrom()).toBe('coach');
  clearMeal();
  expect(handedFrom()).toBeNull();
});
