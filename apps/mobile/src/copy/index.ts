/**
 * User-facing text lives in data/copy/en.json at the repository root, never in components (K2, ADR-010).
 * Components ask for a key: t('tabs.today'). copy-keys.test.ts fails if a used key is missing.
 */
import en from '../../../../data/copy/en.json';

type Json = { [key: string]: string | Json };

function lookup(tree: Json, path: string[]): string | undefined {
  const [head, ...rest] = path;
  const node = tree[head];
  if (node === undefined) return undefined;
  if (rest.length === 0) return typeof node === 'string' ? node : undefined;
  return typeof node === 'string' ? undefined : lookup(node, rest);
}

export function t(key: string, vars: Record<string, string | number> = {}): string {
  const template = lookup(en as Json, key.split('.'));
  if (template === undefined) {
    // Visible in development so a missing key is noticed; the test catches it before merge.
    return `[missing: ${key}]`;
  }
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}
