/**
 * Word budgets for the new face's screens (K-952): the words a screen shows on its first view, counted from the copy
 * keys the screen lists in data/copy/word-budgets.json. Counted as the prototype counted its pages (prototip/yeni-yuz.html,
 * countWords): a word has a letter; numbers ("6", "610-720") and {placeholders}, which become numbers, are not words.
 */
export type Copy = { [key: string]: string | Copy };
/** A key, or several texts shown in the same place (one of them at a time): the longest counts. */
export type BudgetKey = string | string[];
export type ScreenBudget = {
  screen: string;
  budget: number;
  source: string;
  task: string;
  file: string | null;
  keys: BudgetKey[];
  notFirstView: string[];
  /** Words no copy key holds — a date the phone writes ("Mon, Oct 19") — counted as listed. */
  dynamic?: { what: string; words: number }[];
  /**
   * On the first view but not our words, as the prototype leaves them out of its count (`data-nc`): what the user typed
   * (a day's name) and short marks (the weekday chips).
   */
  uncounted?: string[];
  /** The components the route draws (K-969): their keys are the screen's too, so a word added there is counted. */
  parts?: string[];
  /**
   * The screen's other states, each its own first view (K-969: This week's first week, a call declined, no consent, a
   * workout under way): each is held to the budget with its own words, since two states never show at once.
   */
  faces?: { face: string; keys: BudgetKey[]; dynamic?: { what: string; words: number }[] }[];
};

export function wordsOf(text: string): number {
  return text
    .replace(/\{[^}]*\}/g, ' ')
    .split(/\s+/)
    .filter((token) => /\p{L}/u.test(token)).length;
}

export function lookup(copy: Copy, key: string): string | undefined {
  const value = key.split('.').reduce<string | Copy | undefined>((node, part) => (typeof node === 'object' ? node[part] : undefined), copy);
  return typeof value === 'string' ? value : undefined;
}

/** What breaks a screen's budget: a key that is not a text in the copy, or more words than allowed. */
export function budgetProblems(copy: Copy, screen: Pick<ScreenBudget, 'screen' | 'budget' | 'keys' | 'dynamic' | 'faces'>): string[] {
  const own = viewProblems(copy, screen.screen, screen.budget, screen.keys, screen.dynamic);
  const faces = (screen.faces ?? []).flatMap((f) => viewProblems(copy, `${screen.screen} (${f.face})`, screen.budget, f.keys, f.dynamic));
  return [...own, ...faces];
}

/** Every key a screen accounts for: its first view's, its faces', and those said to be off the first view or uncounted. */
export function accountedKeys(screen: Pick<ScreenBudget, 'keys' | 'notFirstView' | 'uncounted' | 'faces'>): Set<string> {
  const flat = (keys: BudgetKey[]) => keys.flatMap((k) => (typeof k === 'string' ? [k] : k));
  return new Set([...flat(screen.keys), ...(screen.faces ?? []).flatMap((f) => flat(f.keys)), ...screen.notFirstView, ...(screen.uncounted ?? [])]);
}

function viewProblems(copy: Copy, name: string, budget: number, keys: BudgetKey[], dynamic: ScreenBudget['dynamic']): string[] {
  const screen = { screen: name, budget, keys, dynamic };
  const problems: string[] = [];
  let words = (screen.dynamic ?? []).reduce((sum, entry) => sum + entry.words, 0);
  for (const entry of screen.keys) {
    const counts: number[] = [];
    for (const key of typeof entry === 'string' ? [entry] : entry) {
      const text = lookup(copy, key);
      if (text === undefined) problems.push(`${screen.screen}: ${key} is not a text in en.json`);
      else counts.push(wordsOf(text));
    }
    words += Math.max(0, ...counts);
  }
  if (words > screen.budget) problems.push(`${screen.screen}: ${words} words, budget ${screen.budget}`);
  return problems;
}

/** The literal copy keys a source file asks for: t('a.b') and t("a.b"). */
export function keysUsedIn(source: string): string[] {
  return [...source.matchAll(/\bt\(\s*['"]([\w.]+)['"]/g)].map((match) => match[1]);
}

/** The prototype's screens and their word targets: `id: { n: '…', t: N`. */
export function prototypeBudgets(html: string): Record<string, number> {
  return Object.fromEntries([...html.matchAll(/^\s*'?([a-z0-9-]+)'?: \{ n: '[^']+', t: (\d+)/gm)].map((m) => [m[1], Number(m[2])]));
}

/**
 * Each task's status in plan/backlog.yaml (`  - id: K-…` then its `    status: …`), read line by line: the app has no YAML
 * parser, and these two fields are written by one script (tools/sync_backlog.py reads the same file).
 */
export function taskStatuses(yaml: string): Map<string, string> {
  const statuses = new Map<string, string>();
  let current: string | null = null;
  for (const line of yaml.split('\n')) {
    const id = /^ {2}- id: (K-\d+)\s*$/.exec(line);
    if (id) current = id[1];
    const status = /^ {4}status: (\w+)\s*$/.exec(line);
    if (status && current !== null) statuses.set(current, status[1]);
  }
  return statuses;
}
