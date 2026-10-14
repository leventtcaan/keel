/**
 * Finding a move to add to a session (K-416): by its name or what people also call it (the catalog's aliases,
 * data/copy/en.json › exercises.<id>.aliases) — the user's own moves by the name they gave (K-416) —, whatever the case — on the phone, offline too. A name that starts with what
 * was typed comes first, then a name that has it, then an alias that has it.
 */
import { has, t } from '@/copy';

import { workoutParams } from './params';
import type { Move } from './trainData';

const words = (text: string) => text.trim().toLocaleLowerCase('en');
const nameOf = (move: Move) => move.name ?? (has(move.nameKey) ? t(move.nameKey) : move.id);

/**
 * "Add a move" with nothing typed (K-1013, 10 Oct walkthrough): the catalog itself, by name, so a move can be picked without
 * knowing what to type. A list, not a best guess: it is not cut at move_search_results. The search (`findMoves`) stays
 * empty for nothing typed, as the own-move form's "Is it one of these?" needs.
 */
export function browseMoves(catalog: Move[], except: ReadonlySet<string> = new Set()): Move[] {
  return catalog.filter((move) => !except.has(move.id)).sort((a, b) => words(nameOf(a)).localeCompare(words(nameOf(b)), 'en'));
}

export function findMoves(query: string, catalog: Move[], except: ReadonlySet<string> = new Set()): Move[] {
  const q = words(query);
  if (q === '') return [];
  const ranked: { move: Move; rank: number }[] = [];
  for (const move of catalog) {
    if (except.has(move.id)) continue;
    const name = words(nameOf(move));
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
