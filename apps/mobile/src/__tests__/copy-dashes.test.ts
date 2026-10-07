// constitution-audit (tools/anayasa-denetimi.sh)
/**
 * No long (—) or middle (–) dash in the app's words (ADR-070 #7: the trace of machine-written text). Ranges are written
 * "610-720"; clauses join with a full stop or a comma. The store listing is held to it too.
 */
import en from '../../../../data/copy/en.json';
import store from '../../../../data/copy/store.en.json';

type Tree = { [key: string]: unknown };

function texts(tree: unknown, prefix = ''): [string, string][] {
  if (typeof tree === 'string') return [[prefix, tree]];
  if (Array.isArray(tree)) return tree.flatMap((item, i) => texts(item, `${prefix}[${i}]`));
  if (tree !== null && typeof tree === 'object') {
    return Object.entries(tree as Tree).flatMap(([k, v]) => texts(v, prefix === '' ? k : `${prefix}.${k}`));
  }
  return [];
}

// En and em dash, and their look-alikes (figure dash, horizontal bar).
const DASH = /[\u2012\u2013\u2014\u2015]/;

test('the check sees both dashes', () => {
  expect(DASH.test('6–10')).toBe(true);
  expect(DASH.test('one — two')).toBe(true);
  expect(DASH.test('6-10')).toBe(false);
});

test.each([
  ['en.json', en],
  ['store.en.json', store],
])('%s has no long or middle dash', (_, copy) => {
  expect(texts(copy).filter(([, text]) => DASH.test(text)).map(([key]) => key)).toEqual([]);
});
