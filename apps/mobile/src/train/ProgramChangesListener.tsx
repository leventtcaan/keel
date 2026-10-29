import { useEffect } from 'react';

import { useSavedSignal } from '@/saved/saved';

import { onProgramChanged } from './programChanges';

/**
 * Mounted once at the root, inside the saved-changes channel: a program the server answered to a change (a day added, an edit, a
 * rebuild, an undo, from whichever screen) counts as a change the tabs in view read again on (ADR-090 Ek 1), so This week, Train
 * and Progress never go on showing the program before it.
 */
export function ProgramChangesListener() {
  const changed = useSavedSignal();
  useEffect(() => onProgramChanged(changed), [changed]);
  return null;
}
