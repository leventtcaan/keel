/**
 * "What moved" on the workout's end (K-974, ADR-075 #7 and Ek 2 "Ne arttı", K-1008). The server compares each move's
 * best working set with last time (`WorkoutSummary.moves`: LOAD / REPS with the signed `by`, SAME, HELD, FIRST); the
 * phone only writes it: the set and the difference in the user's unit, the move by the catalog's name. It subtracts
 * nothing and ranks nothing: the server's order, the first few (a parameter) and how many more. A drop is said calmly
 * ("lighter", "fewer"; U7), never as a warning. A session whose every move is a first has nothing that moved: no list
 * (the baseline card is its card). No estimated max (B10).
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { type UnitSystem, formatLoad, loadValue } from '@/units/units';

import { exerciseName } from './program';
import { workoutParams } from './params';
import type { Move as Known } from './trainData';

type Move = components['schemas']['MoveChange'];

export type MovedRow = {
  key: string;
  name: string;
  /** The best set as numbers ("72.5 × 8"; the unit is on the screen's kg/lb lifted). */
  set: string;
  /** What changed against last time, or none (a change the server sent without its amount is not guessed). */
  change: string | null;
  /** Up is felt in the accent; everything else, a lighter day included, is plain text. */
  tone: 'up' | 'flat';
  /** The row as one line to VoiceOver, the set with its unit. */
  label: string;
};

/** `known`: the catalog's moves and the user's own by id; an own move is named by the user, not by the catalog. */
export function whatMoved(moves: Move[], units: UnitSystem, known?: ReadonlyMap<string, Known>): { rows: MovedRow[]; more: number } {
  if (moves.every((m) => m.change === 'FIRST')) return { rows: [], more: 0 };
  const shown = moves.slice(0, workoutParams.summaryMovesShown);
  return {
    rows: shown.map((m, i) => row(m, i, units, known)),
    more: moves.length - shown.length,
  };
}

function row(move: Move, index: number, units: UnitSystem, known?: ReadonlyMap<string, Known>): MovedRow {
  const name = exerciseName(move.exerciseId, known);
  const change = changeText(move, units);
  const spoken = t('workoutEnd.set', {
    load: formatLoad(move.best.loadKg, units),
    reps: move.best.reps,
  });
  return {
    key: `${index}-${move.exerciseId}`,
    name,
    set: t('workoutEnd.set', {
      load: loadValue(move.best.loadKg, units),
      reps: move.best.reps,
    }),
    change,
    tone: move.by !== undefined && move.by > 0 && (move.change === 'LOAD' || move.change === 'REPS') ? 'up' : 'flat',
    label: change === null ? t('workoutEnd.move.labelPlain', { move: name, set: spoken }) : t('workoutEnd.move.label', { move: name, set: spoken, change }),
  };
}

function changeText(move: Move, units: UnitSystem): string | null {
  const plural = (key: string, count: number) => t(`${key}.${count === 1 ? 'one' : 'other'}`, { count });
  switch (move.change) {
    case 'SAME':
      return t('workoutEnd.move.same');
    case 'HELD':
      return t('workoutEnd.move.held');
    case 'FIRST':
      return t('workoutEnd.move.first');
    case 'LOAD':
      if (move.by === undefined || move.by === 0) return null;
      return t(move.by > 0 ? 'workoutEnd.move.loadUp' : 'workoutEnd.move.loadDown', { amount: formatLoad(Math.abs(move.by), units) });
    case 'REPS':
      if (move.by === undefined || move.by === 0) return null;
      return plural(move.by > 0 ? 'workoutEnd.move.repsUp' : 'workoutEnd.move.repsDown', Math.abs(move.by));
  }
}
