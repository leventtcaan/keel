/**
 * Word budgets for the new face's screens (K-952): the words a screen shows on its first view, counted from the copy
 * keys the screen lists in data/copy/word-budgets.json. A placeholder ("{days}") is one word, as the number it
 * becomes; "610-720" is one word, as a reader reads it.
 */
export type Copy = { [key: string]: string | Copy };
export type ScreenBudget = { screen: string; budget: number; source: string; keys: string[] };

export function wordsOf(text: string): number {
  return text.split(/\s+/).filter((word) => /[\p{L}\p{N}{]/u.test(word)).length;
}

export function lookup(copy: Copy, key: string): string | undefined {
  const value = key.split('.').reduce<string | Copy | undefined>((node, part) => (typeof node === 'object' ? node[part] : undefined), copy);
  return typeof value === 'string' ? value : undefined;
}

/** What breaks a screen's budget: a key that is not a text in the copy, or more words than allowed. */
export function budgetProblems(copy: Copy, screen: ScreenBudget): string[] {
  const problems: string[] = [];
  let words = 0;
  for (const key of screen.keys) {
    const text = lookup(copy, key);
    if (text === undefined) problems.push(`${screen.screen}: ${key} is not a text in en.json`);
    else words += wordsOf(text);
  }
  if (words > screen.budget) problems.push(`${screen.screen}: ${words} words, budget ${screen.budget}`);
  return problems;
}
