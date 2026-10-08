// constitution-audit (tools/anayasa-denetimi.sh)
/**
 * Word budgets (K-952; ADR-069 #4, ADR-072 #9, ADR-077 #3, ADR-078 #5): each new-face screen's first view stays within the
 * words the prototype measured. The table is data/copy/word-budgets.json, held here to the prototype's own targets; the
 * task that builds a screen lists its file and the keys of its first view, and from then on a longer text breaks this test.
 */
import * as fs from 'fs';
import * as path from 'path';

import budgets from '../../../../data/copy/word-budgets.json';
import en from '../../../../data/copy/en.json';

import { budgetProblems, type Copy, keysUsedIn, prototypeBudgets, type ScreenBudget, taskStatuses, wordsOf } from './support/copyBudget';

const ROOT = path.resolve(__dirname, '../../../..');
const MOBILE = path.resolve(__dirname, '../..');
const screens = budgets.screens as ScreenBudget[];
const built = screens.filter((s) => s.keys.length > 0);
const waiting = screens.filter((s) => s.keys.length === 0);
const flat = (keys: ScreenBudget['keys']) => keys.flatMap((k) => (typeof k === 'string' ? [k] : k));

describe('counting words as the prototype did', () => {
  test.each([
    ['Next call Monday, 6 days', 4],
    ['First call Monday, {days} days', 4],
    ['Stop guessing in the gym.', 5],
    ['1,650-1,820 kcal', 1],
    ['Rest · 2:00-3:00', 1],
    ["You're on track. check-in", 4],
    ['  spaced   out  ', 2],
    ['', 0],
  ])('"%s" is %i words', (text, words) => {
    expect(wordsOf(text)).toBe(words);
  });
});

describe('the checker', () => {
  const copy: Copy = { a: { one: 'One two three', two: 'Four five', long: 'Six seven eight nine' } };

  test('within budget: nothing to report', () => {
    expect(budgetProblems(copy, { screen: 's', budget: 5, keys: ['a.one', 'a.two'] })).toEqual([]);
  });

  test('over budget: the screen fails with its count', () => {
    expect(budgetProblems(copy, { screen: 's', budget: 4, keys: ['a.one', 'a.two'] })).toEqual(['s: 5 words, budget 4']);
  });

  test('of texts shown in the same place, the longest counts', () => {
    expect(budgetProblems(copy, { screen: 's', budget: 3, keys: [['a.two', 'a.long']] })).toEqual(['s: 4 words, budget 3']);
  });

  test('words no copy key holds (a date the phone writes) count as listed', () => {
    const dates = [{ what: 'a date (Mon, Oct 19)', words: 2 }];
    expect(budgetProblems(copy, { screen: 's', budget: 5, keys: ['a.one'], dynamic: dates })).toEqual([]);
    expect(budgetProblems(copy, { screen: 's', budget: 4, keys: ['a.one'], dynamic: dates })).toEqual(['s: 5 words, budget 4']);
  });

  test('a key that is not a text fails: a typo must not count as zero words', () => {
    expect(budgetProblems(copy, { screen: 's', budget: 9, keys: ['a.three', ['a', 'a.one']] })).toEqual([
      's: a.three is not a text in en.json',
      's: a is not a text in en.json',
    ]);
  });

  test('the keys a file asks for are read from it', () => {
    expect(keysUsedIn(`t('a.one'); t("a.two", { n }); other('x.y')`)).toEqual(['a.one', 'a.two']);
  });
});

describe('the table', () => {
  const html = fs.readFileSync(path.join(ROOT, 'prototip/yeni-yuz.html'), 'utf8');
  const status = taskStatuses(fs.readFileSync(path.join(ROOT, 'plan/backlog.yaml'), 'utf8'));

  test('the backlog reader finds every task with its status', () => {
    expect(taskStatuses('tasks:\n  - id: K-1\n    title: x\n    status: done\n  - id: K-2\n    status: todo\n')).toEqual(
      new Map([['K-1', 'done'], ['K-2', 'todo']]),
    );
    expect(status.size).toBeGreaterThan(200); // the reader saw the whole file, not one entry
  });

  test("is the prototype's screens with the prototype's targets: none dropped, none raised", () => {
    const prototype = prototypeBudgets(html);
    expect(Object.keys(prototype).length).toBeGreaterThan(20);
    expect(Object.fromEntries(screens.map((s) => [s.screen, s.budget]))).toEqual(prototype);
  });

  test.each(screens.map((s) => [s.screen, s] as const))('%s names a real decision and its building task', (_, s) => {
    if (s.source.startsWith('ADR-')) {
      const number = s.source.slice(0, 7);
      expect(fs.readdirSync(path.join(ROOT, 'plan/kararlar')).some((file) => file.startsWith(`${number}-`))).toBe(true);
    } else {
      expect(s.source).toBe('prototip/yeni-yuz.html');
    }
    expect(status.has(s.task)).toBe(true);
  });

  test('a screen whose task is done lists its file and keys: a budget cannot be left switched off', () => {
    expect(screens.filter((s) => status.get(s.task) === 'done' && (s.keys.length === 0 || s.file === null)).map((s) => s.screen)).toEqual([]);
  });
});

if (built.length > 0) {
  describe.each(built.map((s) => [s.screen, s] as const))('%s', (_, screen) => {
    test('stays within its words', () => {
      expect(budgetProblems(en as Copy, screen)).toEqual([]);
    });

    test('every key its file uses is counted, or said to be off the first view', () => {
      expect(screen.file).not.toBeNull();
      const used = keysUsedIn(fs.readFileSync(path.join(MOBILE, screen.file ?? ''), 'utf8'));
      const accounted = new Set([...flat(screen.keys), ...screen.notFirstView, ...(screen.uncounted ?? [])]);
      expect(used.filter((key) => !accounted.has(key))).toEqual([]);
    });
  });
}
for (const s of waiting) test.todo(`${s.screen}: ${s.task} lists the keys of its first view (budget ${s.budget})`);
