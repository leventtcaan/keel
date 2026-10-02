/**
 * State mode on the phone (K-518, ADR-038): what the user declared — traveling, sick, in pain, busy, a new gym — as the
 * server answered it. The server is the truth; the phone keeps the last answer (expo-sqlite/kv-store) so the reminders
 * stay quiet while a state is in force (ADR-036 #7), offline too. Sickness and pain are health data: forgotten with the
 * account and with the health data consent.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { type Loaded, localDay } from '@/today/today';
import type { KeyValue } from '@/units/preference';

type Schemas = components['schemas'];
export type DeclaredState = Schemas['DeclaredState'];
export type StateKind = Schemas['StateKind'];

const KEY = 'state.current';

type Options = {
  api: ApiClient;
  kv: KeyValue;
  now: () => Date;
  /** A state began or ended on the phone's knowledge: the reminders plan again. */
  onChange: () => void;
};

/** By name, so a screen tells no connection from a refusal (V3: never the message). */
function named(name: 'NoConnection' | 'StateRefused', message: string): Error {
  return Object.assign(new Error(message), { name });
}

async function reach<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch {
    throw named('NoConnection', 'state: no answer');
  }
}

export type StateService = ReturnType<typeof createStateService>;

export function createStateService({ api, kv, now, onChange }: Options) {
  async function kept(): Promise<DeclaredState | null> {
    const text = await kv.getItemAsync(KEY);
    if (text === null) return null;
    try {
      return JSON.parse(text) as DeclaredState;
    } catch {
      return null;
    }
  }

  async function remember(state: DeclaredState | null): Promise<void> {
    const before = await kv.getItemAsync(KEY);
    const after = state === null ? null : JSON.stringify(state);
    if (before === after) return;
    if (after === null) await kv.removeItemAsync(KEY);
    else await kv.setItemAsync(KEY, after);
    onChange();
  }

  async function current(): Promise<DeclaredState | null> {
    const state = await kept();
    return state !== null && (state.until === undefined || state.until >= localDay(now())) ? state : null;
  }

  return {
    /** A state in force today, as last known on the phone: none past its last day. */
    inForce: async (): Promise<boolean> => (await current()) !== null,

    /** The last day of the state in force, if it has one — the reminders come back after it by date (K-518). */
    until: async (): Promise<string | null> => (await current())?.until ?? null,

    /** What a read of the server said (Today reads it): a state, or none; a read that failed says nothing new. */
    keep: async (loaded: Loaded<DeclaredState>): Promise<void> => {
      if (loaded.state === 'ready') await remember(loaded.value);
      if (loaded.state === 'none') await remember(null);
    },

    /** From today on the user's calendar; `until` its last day, if given. Throws by name when not recorded. */
    declare: async (kind: StateKind, until?: string): Promise<DeclaredState> => {
      const answer = await reach(() => api.PUT('/v1/state', { body: until === undefined ? { kind } : { kind, until } }));
      if (answer.data === undefined) throw named('StateRefused', `state not declared: HTTP ${answer.response.status}`);
      await remember(answer.data);
      return answer.data;
    },

    /** "I'm back": the state ends yesterday on the server, and the phone knows none. */
    back: async (): Promise<void> => {
      const answer = await reach(() => api.DELETE('/v1/state'));
      if (!answer.response.ok) throw named('StateRefused', `state not ended: HTTP ${answer.response.status}`);
      await remember(null);
    },

    forget: async (): Promise<void> => {
      await kv.removeItemAsync(KEY);
    },
  };
}
