/**
 * Finding a move to add to a session (K-416): by its name or what people also call it (the catalog's aliases,
 * data/copy/en.json › exercises.<id>.aliases), whatever the case — on the phone, offline too. A name that starts with what
 * was typed comes first, then a name that has it, then an alias that has it.
 */
import type { components } from '@/api/schema';
import { has, t } from '@/copy';

import { workoutParams } from './params';

type Schemas = components['schemas'];

const words = (text: string) => text.trim().toLocaleLowerCase('en');

export function findMoves(query: string, catalog: Schemas['Exercise'][], except: ReadonlySet<string> = new Set()): Schemas['Exercise'][] {
  const q = words(query);
  if (q === '') return [];
  const ranked: { move: Schemas['Exercise']; rank: number }[] = [];
  for (const move of catalog) {
    if (except.has(move.id)) continue;
    const name = words(has(move.nameKey) ? t(move.nameKey) : move.id);
    const aliasKey = `exercises.${move.id}.aliases`;
    const aliases = has(aliasKey) ? t(aliasKey).split(',').map(words) : [];
    const rank = name.startsWith(q) ? 0 : name.includes(q) ? 1 : aliases.some((alias) => alias.includes(q)) ? 2 : -1;
    if (rank >= 0) ranked.push({ move, rank });
  }
  return ranked
    .sort((a, b) => a.rank - b.rank)
    .slice(0, workoutParams.moveSearchResults)
    .map((r) => r.move);
}
