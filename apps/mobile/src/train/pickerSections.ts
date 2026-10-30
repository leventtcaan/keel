/**
 * What the "Add a move" picker offers (Evre 7 B2, plan/evre-7-inceleme.md §12): not a flat list of names, because most people do not
 * know move names. Five muscle groups to filter by, equipment to filter by, "Popular for <group>" first, then the rest; a typed
 * search runs across all of it. The groups and the popular lists are data/parameters/workout.json (K2); a move belongs to the group
 * of its first (main) muscle. The server's catalog is what is offered; nothing is counted here.
 */
import type { components } from '@/api/schema';
import { has, t } from '@/copy';

import { findMoves } from './moves';
import { workoutParams as P } from './params';
import type { Move } from './trainData';

type Equipment = components['schemas']['Equipment'];

export type Group = string;

/** The groups, in the order of the chips. */
export const groupsOf = (): Group[] => Object.keys(P.movePickerGroups);

/** The muscle group of a move: its first muscle's; none for the user's own move (it names no muscles). */
export function groupOf(move: Move): Group | undefined {
  // `?? []`: a move read before the catalog is complete (and a test's partial one) names no muscles.
  const main = (move.muscles ?? [])[0];
  if (main === undefined) return undefined;
  return groupsOf().find((group) => P.movePickerGroups[group].includes(main));
}

const nameOf = (move: Move) => (move.name ?? (has(move.nameKey) ? t(move.nameKey) : move.id)).toLocaleLowerCase('en');
const byName = (a: Move, b: Move) => nameOf(a).localeCompare(nameOf(b), 'en');
/** Compound moves first (the big lifts), then by name. */
const bigFirst = (a: Move, b: Move) => (a.kind === b.kind ? byName(a, b) : a.kind === 'COMPOUND' ? -1 : 1);

export type Kind = 'popular' | 'popularMix' | 'more' | 'all' | 'results';
export type Section = { kind: Kind; group?: Group; moves: Move[] };

type Input = {
  /** The moves the day does not have yet: what can be offered. */
  offered: Move[];
  /** The day's own moves: they say which groups the day is about. */
  day: Move[];
  query: string;
  group: Group | null;
  equipment: Equipment | null;
};

/** The sections to draw, in order; none when nothing matches. */
export function pickerSections({ offered, day, query, group, equipment }: Input): Section[] {
  const fits = (move: Move) => (group === null || groupOf(move) === group) && (equipment === null || move.equipment === equipment);
  const pool = offered.filter(fits);
  if (query.trim() !== '') {
    const moves = findMoves(query, pool);
    return moves.length === 0 ? [] : [{ kind: 'results', moves }];
  }
  const popularOf = (g: Group) => P.movePickerPopular[g].flatMap((id) => pool.filter((m) => m.id === id));
  const sections: Section[] = [];
  const shown = new Set<string>();
  const show = (section: Section) => {
    if (section.moves.length === 0) return;
    sections.push(section);
    for (const move of section.moves) shown.add(move.id);
  };
  if (group !== null) {
    show({ kind: 'popular', group, moves: popularOf(group) });
    show({ kind: 'more', group, moves: pool.filter((m) => !shown.has(m.id)).sort(bigFirst) });
    return sections;
  }
  // The groups the day trains most come first; a day with no moves (or only the user's own) gets a main lift of each group.
  const counts = new Map<Group, number>();
  for (const move of day) {
    const g = groupOf(move);
    if (g !== undefined) counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  const featured = groupsOf()
    .filter((g) => counts.has(g))
    .sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))
    .slice(0, P.movePickerFeaturedGroups);
  if (featured.length === 0) {
    show({ kind: 'popularMix', moves: groupsOf().flatMap((g) => popularOf(g).slice(0, 1)) });
  } else {
    for (const g of featured) show({ kind: 'popular', group: g, moves: popularOf(g) });
  }
  show({ kind: 'all', moves: pool.filter((m) => !shown.has(m.id)).sort(byName) });
  return sections;
}

/** The line under a move's name: its main muscle and what it is lifted with ("Chest · Barbell"); the user's own names no muscle. */
export function subtitleOf(move: Move): string {
  const main = (move.muscles ?? [])[0];
  const equipment = move.equipment === undefined ? '' : t(`ownMove.equipments.${move.equipment}`);
  if (main === undefined) return equipment;
  return equipment === '' ? t(`demo.muscle.${main}`) : t('movePicker.subtitle', { muscle: t(`demo.muscle.${main}`), equipment });
}
