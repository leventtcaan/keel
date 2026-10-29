import type { SyncProblem } from '@/sync/queue';

import type { Undone } from './saved';

/** What the take-back of a record came to (`takeBack`, src/sync/takeBack.ts). */
export type Removal = 'taken' | 'conflict' | 'offline';

type Words = {
  /** Told to VoiceOver when it is taken back. */
  said: string;
  /** No way to reach the server. */
  offline: string;
  /** Anything else that went wrong. */
  failed: string;
  /** The server refused for good (409): said, and the save is not offered again. Without it a conflict is `failed`, to try again. */
  conflict?: string;
};

/**
 * The `undo` of a save made through `takeBack`: asks for the removal and turns its three answers into what the banner
 * shows. An error thrown is reported by name only (V3) and counts as a failure that can be tried again.
 */
export function undoThrough(take: () => Promise<Removal>, report: (problem: SyncProblem) => void, words: Words): () => Promise<Undone> {
  return async () => {
    try {
      const result = await take();
      if (result === 'taken') return { done: true, said: words.said };
      if (result === 'conflict' && words.conflict !== undefined) return { done: false, message: words.conflict, again: false };
      return { done: false, message: result === 'offline' ? words.offline : words.failed, again: true };
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      return { done: false, message: words.failed, again: true };
    }
  };
}
