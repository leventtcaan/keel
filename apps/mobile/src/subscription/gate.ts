/**
 * The subscription gate after onboarding (K-706). ADR-091 #1 took ADR-058 › 107's place (K-1202): the paywall is no longer a wall.
 * An account that never subscribed reaches the tabs like any other, and its weekly call comes locked until it subscribes
 * (the server holds it back, ADR-091 Ek 1). What is left of the gate is the question to the server: what the account has
 * (GET /v1/subscription), for what follows it on the phone (the trial reminder, K-707). Its answer is kept, so a restart
 * starts from it; an answer 1.0 kept as "required" closes nothing and is read again.
 *
 * `GateState` still has a 'required' member for the retired gate screen (src/app/subscribe.tsx); nothing produces it.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { load } from '@/today/today';
import type { KeyValue } from '@/units/preference';

import { type LegalLink, legalComplete } from './links';
import type { SubscriptionStore } from './store';

export type GateState = 'unknown' | 'required' | 'open';
type Options = {
  kv: KeyValue;
  api: ApiClient;
  purchases: SubscriptionStore;
  links: LegalLink[];
  report: (problem: { name: string }) => void;
  /** Each subscription the server answers with, for what follows it on the phone (the trial reminder, K-707). */
  onRead?: (subscription: components['schemas']['Subscription']) => void;
};

const KEY = 'subscription.gate';

export type SubscriptionGate = Awaited<ReturnType<typeof createSubscriptionGate>>;

export async function createSubscriptionGate({ kv, api, purchases, links, report, onRead }: Options) {
  const sells = purchases.available && legalComplete(links);
  const kept = sells ? await kv.getItemAsync(KEY) : null;
  let state: GateState = !sells ? 'open' : kept === 'open' ? 'open' : 'unknown';
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
      onRead?.(read.value);
      const next: GateState = 'open';
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
