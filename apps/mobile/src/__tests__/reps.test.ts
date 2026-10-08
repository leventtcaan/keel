/**
 * The one way the app writes a move's reps (K-991): a range as a range, a fixed rep target (min = max, 5 x 5) as its
 * reps, never "5-5". The Train tab, the plan, the import draft and the program editor all print through it.
 */
import { repCount, repsText } from '@/train/reps';

test.each([
  ['a range', { min: 6, max: 10 }, '6-10', '6-10 reps'],
  ['a fixed rep target', { min: 5, max: 5 }, '5', '5 reps'],
  ['a single', { min: 1, max: 1 }, '1', '1 rep'],
  ['a range from one', { min: 1, max: 3 }, '1-3', '1-3 reps'],
])('%s: the numbers, and the numbers with their word', (_name, reps, count, text) => {
  expect(repCount(reps)).toBe(count);
  expect(repsText(reps)).toBe(text);
});
