/**
 * Another app's move names, mapped to the catalog on the phone (K-609, ADR-053 §5). A name is its words and, in brackets,
 * the equipment ("Bench Press (Barbell)", H13 B2). It is matched — `sure` — only when its words are exactly a catalog
 * name's or alias's (data/copy/en.json › exercises.<id>) with the move's equipment, or an own move's name, and only one
 * move is so. Anything less is never matched for the user: the closest few are offered instead (U5), the closest first.
 */
import type { components } from '@/api/schema';
import { has, t } from '@/copy';
import type { Move } from '@/train/trainData';

import { importParams } from './params';

type Equipment = components['schemas']['Equipment'];

export type Matched = {
  /** The name as the file has it. */
  name: string;
  /** How many of the file's sets carry it. */
  sets: number;
  /** The move it is, when that is certain; null when the user picks. */
  sure: string | null;
  /** The closest moves, the closest first, at most import_match_suggestions, none under import_match_suggest_min. */
  suggestions: string[];
};

/** The words an equipment in brackets is written with; the bracket's other words are just more words. */
const EQUIPMENT_WORDS: Record<string, Equipment> = {
  barbell: 'BARBELL',
  dumbbell: 'DUMBBELL',
  cable: 'CABLE',
  machine: 'MACHINE',
  smith: 'MACHINE',
  bodyweight: 'BODYWEIGHT',
  // A weighted pull-up is the pull-up with a load added (BODYWEIGHT_PLUS_EXTERNAL). "Assisted" is not here on purpose: an
  // assisted pull-up takes weight off, and is not the move with a load on (K-609 review) — it stays a word, never sure.
  weighted: 'BODYWEIGHT',
};
/** Shortenings people write for the same word. */
const SAME_WORD: Record<string, string> = { db: 'dumbbell', bb: 'barbell' };
const EQUIPMENT_TOKEN: Record<Equipment, string> = {
  BARBELL: 'barbell',
  DUMBBELL: 'dumbbell',
  CABLE: 'cable',
  MACHINE: 'machine',
  PLATE_LOADED: 'plate loaded',
  BODYWEIGHT: 'bodyweight',
};

export function matchNames(names: Map<string, number>, moves: Move[]): Matched[] {
  const candidates = moves.map((move) => ({ move, spellings: spellings(move) }));
  // A word many moves share ("press", "dumbbell") tells less than one few do ("incline"): it orders the offers, while
  // the plain share of words decides whether a move is offered at all (import_match_suggest_min keeps its meaning).
  const movesWith = new Map<string, number>();
  for (const { spellings: own } of candidates) {
    for (const word of new Set(own.flatMap((words) => [...words]))) movesWith.set(word, (movesWith.get(word) ?? 0) + 1);
  }
  const weight = (word: string) => 1 + Math.log((candidates.length + 1) / ((movesWith.get(word) ?? 0) + 1));
  return [...names.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, sets]) => {
      const file = split(name);
      const scored = candidates.map(({ move, spellings: own }) => {
        // The move's equipment is part of its words only when the file names one: "Pull Up" is the pull-up as it is.
        const theirs = own.map((words) => (file.equipment === null ? words : withWords(words, tokens(EQUIPMENT_TOKEN[move.equipment]))));
        const exact = file.equipment === null || file.equipment === move.equipment ? theirs.some((words) => equal(words, file.words)) : false;
        const score = Math.max(...theirs.map((words) => dice(words, file.words, () => 1)));
        const rank = Math.max(...theirs.map((words) => dice(words, file.words, weight)));
        return { id: move.id, exact, score, rank };
      });
      const exact = scored.filter((s) => s.exact);
      const suggestions = scored
        .filter((s) => s.score >= importParams.matchSuggestMin)
        .sort((a, b) => b.rank - a.rank || a.id.localeCompare(b.id))
        .slice(0, importParams.matchSuggestions)
        .map((s) => s.id);
      return { name, sets, sure: exact.length === 1 ? exact[0].id : null, suggestions };
    });
}

/** A file's name: its words, and the equipment in its brackets when it is one we know (its other words join the rest). */
function split(name: string): { words: Set<string>; equipment: Equipment | null } {
  const m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(name);
  if (m === null) return { words: tokens(name), equipment: null };
  const hint = [...tokens(m[2])];
  const known = hint.map((word) => EQUIPMENT_WORDS[word]).find((e) => e !== undefined) ?? null;
  const words = tokens(m[1]);
  // "(Machine)" is the equipment's word, kept as it; an unknown bracket ("(Band)") is just more words.
  if (known === null) hint.forEach((word) => words.add(word));
  else words.add(EQUIPMENT_TOKEN[known]);
  return { words, equipment: known };
}

/** The catalog's name and aliases of a move (the app's copy), or the name the user gave their own. */
function spellings(move: Move): Set<string>[] {
  if (move.name !== undefined) return [tokens(move.name)];
  const aliasKey = `exercises.${move.id}.aliases`;
  const names = [has(move.nameKey) ? t(move.nameKey) : move.id, ...(has(aliasKey) ? t(aliasKey).split(',') : [])];
  return names.map(tokens);
}

/** Lower case, words only, a shortening as its word, a plural as its singular ("Pull-Ups" → pull up; "press" stays). */
function tokens(text: string): Set<string> {
  const words = text
    .toLocaleLowerCase('en')
    .split(/[^a-z0-9]+/)
    .filter((w) => w !== '')
    .map((w) => SAME_WORD[w] ?? w)
    .map((w) => (w.length >= 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w));
  return new Set(words);
}

const withWords = (a: Set<string>, b: Set<string>) => new Set([...a, ...b]);
const equal = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((w) => b.has(w));

/** Twice the shared words over both counts, each word counted by its weight: 1 the same words, 0 none shared. */
function dice(a: Set<string>, b: Set<string>, weight: (word: string) => number): number {
  const sum = (words: Iterable<string>) => [...words].reduce((total, w) => total + weight(w), 0);
  const both = sum(a) + sum(b);
  return both === 0 ? 0 : (2 * sum([...a].filter((w) => b.has(w)))) / both;
}
