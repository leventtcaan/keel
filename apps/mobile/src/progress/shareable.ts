import { stickersFor } from '@/share/stickers';
import type { UnitSystem } from '@/units/units';

import type { ProgressRead } from './read';

/**
 * Whether the Share page would have a sticker to offer from this tab (K-612): the same facts it reads when started from Progress
 * (the consistency record and the training progress; no workout), through the same `stickersFor`. A page that can only say
 * "nothing to share yet" is a dead end, so the entry waits until there is something (a part not read yet counts as nothing).
 */
export function hasShareable(read: ProgressRead, units: UnitSystem): boolean {
  const facts = {
    workout: null,
    consistency: read.consistency.state === 'ready' ? read.consistency.value : null,
    progress: read.training.state === 'ready' ? read.training.value : null,
    moves: read.moves,
  };
  return stickersFor(facts, units).length > 0;
}
