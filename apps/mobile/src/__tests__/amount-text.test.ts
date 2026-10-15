/**
 * How an amount reads beside a food's name (K-1029, Tour 4 B10): the server's `unit` is grams, millilitres or the name of a
 * serving, and a serving's name may begin with its own count ("1 medium", "2 tbsp"), so quantity and name are not run together.
 */
import { amountLine } from '@/food/amountText';

const amount = (quantity: number, unit: string) => ({ quantity, unit });

describe('amountLine', () => {
  test('grams and millilitres: quantity, unit', () => {
    expect(amountLine('Greek yogurt', amount(170, 'g'))).toBe('Greek yogurt · 170 g');
    expect(amountLine('Milk', amount(250, 'ml'))).toBe('Milk · 250 ml');
  });

  test('a serving named with its count, once: the name alone', () => {
    expect(amountLine('Potato, baked', amount(1, '1 medium'))).toBe('Potato, baked · 1 medium');
    expect(amountLine('Olive oil', amount(1, '2 tbsp'))).toBe('Olive oil · 2 tbsp');
  });

  test('a serving named with its count, several: times the serving', () => {
    expect(amountLine('Potato, baked', amount(2, '1 medium'))).toBe('Potato, baked · 2 × 1 medium');
    expect(amountLine('Potato, baked', amount(1.5, '1 medium'))).toBe('Potato, baked · 1.5 × 1 medium');
  });

  test('a serving named without a count: quantity, name', () => {
    expect(amountLine('Chicken rice bowl', amount(1, 'bowl'))).toBe('Chicken rice bowl · 1 bowl');
    expect(amountLine('Bread', amount(2, 'slice'))).toBe('Bread · 2 slice');
  });

  test('a fraction counts as a count', () => {
    expect(amountLine('Pizza', amount(1, '1/2 pie'))).toBe('Pizza · 1/2 pie');
    expect(amountLine('Cheese', amount(1, '½ cup'))).toBe('Cheese · ½ cup');
  });
});
