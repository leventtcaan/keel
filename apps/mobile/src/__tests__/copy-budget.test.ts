// constitution-audit (tools/anayasa-denetimi.sh)
/**
 * Word budgets (K-952; ADR-069 #4, ADR-072 #9, ADR-077, ADR-078 #5): each new-face screen's first view stays within the
 * words the prototype measured. The table is data/copy/word-budgets.json, not this file; the task that builds a screen
 * lists the keys its first view shows, and from then on a longer text breaks this test.
 */
import budgets from '../../../../data/copy/word-budgets.json';
import en from '../../../../data/copy/en.json';

import { budgetProblems, type Copy, type ScreenBudget, wordsOf } from './support/copyBudget';

const screens = budgets.screens as ScreenBudget[];
const built = screens.filter((s) => s.keys.length > 0);
const waiting = screens.filter((s) => s.keys.length === 0);

describe('counting words', () => {
  test.each([
    ['Next call Monday, 6 days', 5],
    ['First call Monday, {days} days', 5],
    ['Stop guessing in the gym.', 5],
    ['1,650-1,820 kcal', 2],
    ['Rest · 2:00-3:00', 2],
    ['  spaced   out  ', 2],
    ['', 0],
  ])('"%s" is %i words', (text, words) => {
    expect(wordsOf(text)).toBe(words);
  });
});

describe('the checker', () => {
  const copy: Copy = { a: { one: 'One two three', two: 'Four five' } };

  test('within budget: nothing to report', () => {
    expect(budgetProblems(copy, { screen: 's', budget: 5, source: 'x', keys: ['a.one', 'a.two'] })).toEqual([]);
  });

  test('over budget: the screen fails with its count', () => {
    expect(budgetProblems(copy, { screen: 's', budget: 4, source: 'x', keys: ['a.one', 'a.two'] })).toEqual(['s: 5 words, budget 4']);
  });

  test('a key that is not a text fails: a typo must not count as zero words', () => {
    expect(budgetProblems(copy, { screen: 's', budget: 9, source: 'x', keys: ['a.three', 'a'] })).toEqual([
      's: a.three is not a text in en.json',
      's: a is not a text in en.json',
    ]);
  });
});

describe('the table', () => {
  test('each screen once, with a budget and the decision it comes from', () => {
    expect(new Set(screens.map((s) => s.screen)).size).toBe(screens.length);
    for (const s of screens) {
      expect(s.budget).toBeGreaterThan(0);
      expect(s.source).toMatch(/ADR-0\d\d/);
    }
  });

  test('the screens ADR-069 names hold the budgets it set', () => {
    const budget = (name: string) => screens.find((s) => s.screen === name)?.budget;
    expect(budget('home')).toBeLessThanOrEqual(40);
    expect(budget('ob-goal')).toBeLessThanOrEqual(25);
  });
});

if (built.length > 0) {
  test.each(built.map((s) => [s.screen, s] as const))('%s stays within its words', (_, screen) => {
    expect(budgetProblems(en as Copy, screen)).toEqual([]);
  });
}
for (const s of waiting) test.todo(`${s.screen}: its task lists the keys of its first view (budget ${s.budget})`);
