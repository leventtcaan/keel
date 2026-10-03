/**
 * A meal the coach read, handed to the meal screen (K-509): in memory, once — never in a link (V3: the words a user
 * eats stay out of URLs).
 */
import { handOffMeal, takeMeal } from '@/food/handoff';

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
