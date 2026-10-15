/**
 * The effort line under a lift's chart (K-979, ADR-078 #2, Ek 2): a sentence from the server's `EffortLine` facts, for its
 * three kinds only; nothing is worked out here and no other sentence is written. Without an effort, no line.
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { shortDate } from '@/train/program';
import { type UnitSystem, formatLoad } from '@/units/units';

type Effort = components['schemas']['EffortLine'];

export function effortLine(effort: Effort | undefined, units: UnitSystem): string | null {
  if (effort === undefined) return null;
  const load = formatLoad(effort.loadKg, units);
  switch (effort.kind) {
    case 'STUCK':
      return t(effort.held === true ? 'progress.strength.effort.stuckHeld' : 'progress.strength.effort.stuck', { load, sessions: effort.sessions ?? 0 });
    case 'EASIER': {
      const left = effort.repsLeft ?? 0;
      return left === 1 ? t('progress.strength.effort.easierOne', { load }) : t('progress.strength.effort.easierMany', { load, repsLeft: left });
    }
    case 'REPS_RISING': {
      const count = effort.repsGained ?? 0;
      const gained = t(count === 1 ? 'progress.strength.effort.repOne' : 'progress.strength.effort.repMany', { count });
      return t('progress.strength.effort.rising', { gained, load, date: shortDate(effort.since ?? '') });
    }
  }
}
