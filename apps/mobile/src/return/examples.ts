import type { components } from '@/api/schema';
import { t } from '@/copy';
import { exerciseName } from '@/train/program';
import type { Move } from '@/train/trainData';
import { type UnitSystem, formatLoad } from '@/units/units';

/** How many moves "Ease back in" names (the prototype's squat and bench). */
const NAMED = 2;

/**
 * The weights "Ease back in" names (K-981, prototype #return): the first two compound moves with a load to name, in the
 * program's order, each at the target the server shows now. The phone works out no weight: after a long break the server
 * already shows a step lighter (`Program.backAfterBreak`, K-531), and that is what `nextLoadKg` is then. Where the program
 * does not show that, its targets are the usual ones, not a step lighter, and nothing is named. A move with no target yet,
 * or none to put a weight on (bodyweight), is passed over; the same move on two days once. Null when there is nothing to name.
 */
export function easeExamples(program: components['schemas']['Program'], moves: ReadonlyMap<string, Move>, units: UnitSystem): string | null {
  if (program.backAfterBreak !== true) return null;
  const seen = new Set<string>();
  const named: string[] = [];
  for (const planned of program.days.flatMap((day) => day.exercises)) {
    if (named.length === NAMED) break;
    const move = moves.get(planned.exerciseId);
    if (move?.kind !== 'COMPOUND' || move.load !== 'EXTERNAL' || planned.nextLoadKg === undefined || seen.has(planned.exerciseId)) continue;
    seen.add(planned.exerciseId);
    named.push(t('return.move', { name: exerciseName(planned.exerciseId, moves), load: formatLoad(planned.nextLoadKg, units) }));
  }
  return named.length === 0 ? null : named.join(t('return.moveJoin'));
}
