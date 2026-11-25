/** The walk map's words (K-1227): short, in both languages, the Apple Maps notice exact, nothing about location read, nothing that blames (U7). */
import en from '../../../../data/copy/en.json';
import tr from '../../../../data/copy/tr.json';

import { type Copy, localeBudget, wordsOf } from './support/copyBudget';

type Block = Record<string, string>;
const FIRST_VIEW = ['title', 'searchLabel', 'search', 'searchNote', 'holdHint', 'places', 'none', 'pick', 'saveWalk'];
const LONGEST_SHOWN_TOGETHER = ['leg', 'legApprox', 'round']; // the line under the map says one of the first two, with the third
const BUDGET = 60; // words on the screen's first view and the walk line; a screen of a search, a map and a list, not a paragraph
const walkMap = (copy: unknown) => (copy as { walkMap: Block }).walkMap;

test('the notice under the search box is the product owner\'s, in English and Turkish', () => {
  expect(walkMap(en).searchNote).toBe('Search uses Apple Maps; your places stay on this phone.');
  expect(walkMap(tr).searchNote).toBe("Arama Apple Haritalar'ı kullanır; yerlerin bu telefonda kalır.");
});

test.each([['en', en, 1], ['tr', tr, 1.25]] as const)('%s: the first view and the walk line stay within the budget', (_, copy, factor) => {
  const block = walkMap(copy);
  const first = FIRST_VIEW.reduce((sum, key) => sum + wordsOf(block[key]), 0);
  const walk = Math.max(wordsOf(block.leg), wordsOf(block.legApprox)) + wordsOf(block.round);
  expect(first + walk).toBeLessThanOrEqual(localeBudget(BUDGET, factor));
  expect(LONGEST_SHOWN_TOGETHER.every((key) => block[key] !== undefined)).toBe(true);
});

test('both languages have the same keys, with the same placeholders', () => {
  const holes = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join();
  expect(Object.keys(walkMap(tr)).sort()).toEqual(Object.keys(walkMap(en)).sort());
  for (const key of Object.keys(walkMap(en))) expect(holes(walkMap(tr)[key])).toBe(holes(walkMap(en)[key]));
  expect((tr as Copy).settings).toBeDefined();
});

test('it says nothing of reading where the phone is, and does not blame', () => {
  for (const copy of [en, tr]) {
    const text = Object.values(walkMap(copy)).join(' ');
    expect(text).not.toMatch(/\b(your location|current location|konumun|GPS)\b/i);
    expect(text).not.toMatch(/\b(should have|failed to|behind|make up|telafi|geri kal)\b/i);
  }
});
