/**
 * The subscription gate after onboarding (K-706, ADR-058 #1). An account that never subscribed reaches the tabs only through
 * the paywall (ADR-012: no free tier); an account with any subscription kept on the server — an ended one too — does not
 * meet it: the deterministic mode (K-703, ADR-056 #10) keeps its log, its calls, export and deletion open to it.
 *
 * The server decides (GET /v1/subscription: no `status` = never subscribed). Its last answer is kept on the phone, so airplane
 * mode does not open a closed gate and a subscriber is not locked out offline. With nothing kept and no answer, the gate is
 * open: never a lock with no answer to lift it. Without the store in the build (Expo Go, no SDK key) or without both legal
 * links (Apple 3.1.2, ADR-057 D3) nothing can be sold, so the gate is never closed — a development build is not locked.
 */
import type { ApiClient } from '@/api/client';
import { load } from '@/today/today';
import type { KeyValue } from '@/units/preference';

import { type LegalLink, legalComplete } from './links';
import type { SubscriptionStore } from './store';

export type GateState = 'unknown' | 'required' | 'open';
type Options = { kv: KeyValue; api: ApiClient; purchases: SubscriptionStore; links: LegalLink[]; report: (problem: { name: string }) => void };

const KEY = 'subscription.gate';

export type SubscriptionGate = Awaited<ReturnType<typeof createSubscriptionGate>>;

export async function createSubscriptionGate({ kv, api, purchases, links, report }: Options) {
  const sells = purchases.available && legalComplete(links);
  const kept = sells ? await kv.getItemAsync(KEY) : null;
  let state: GateState = !sells ? 'open' : kept === 'required' || kept === 'open' ? kept : 'unknown';
  const listeners = new Set<() => void>();
  // Bumped by a sign-out: an answer that started for the previous account must not land on the next one.
  let generation = 0;

  function become(next: GateState) {
    if (next === state) return;
    state = next;
    listeners.forEach((listener) => listener());
  }

  return {
    /** Synchronous, for rendering (useSyncExternalStore). */
    current: (): GateState => state,

    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /**
     * Asks the server; true when it answered. No answer keeps the kept one (reported by name). With nothing kept, only the
     * app's cold start (`openWithoutAnswer`) opens the gate — never a lock with no answer to lift it; after a sign-in it stays
     * unknown and the gate screen asks again (a failed request must not let a new account past the paywall, K-706 review).
     */
    refresh: async ({ openWithoutAnswer = false }: { openWithoutAnswer?: boolean } = {}): Promise<boolean> => {
      if (!sells) return true;
      const startedIn = generation;
      const read = await load(() => api.GET('/v1/subscription'));
      if (startedIn !== generation) return false;
      if (read.state !== 'ready') {
        report({ name: read.state === 'failed' ? read.problem : 'SubscriptionUnread' });
        if (state === 'unknown' && openWithoutAnswer) become('open');
        return false;
      }
      const next: GateState = read.value.status === undefined && !read.value.active ? 'required' : 'open';
      await kv.setItemAsync(KEY, next);
      if (startedIn !== generation) {
        await kv.removeItemAsync(KEY); // signed out while it was written: the write landed after the sign-out's removal
        return false;
      }
      become(next);
      return true;
    },

    /** Sign-out: the answer belongs to the account; the next one is asked afresh. */
    forget: async (): Promise<void> => {
      generation++;
      await kv.removeItemAsync(KEY);
      become(sells ? 'unknown' : 'open');
    },
  };
}
