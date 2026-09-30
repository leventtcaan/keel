/**
 * The session (ADR-025): a 15-minute access token and a refresh token the server rotates on every use. A used refresh
 * token that comes back makes the server revoke the whole family — so two refreshes in flight at once would sign the
 * user out. The manager keeps one refresh in flight at a time and shares its result with everyone who asks (K-311).
 * Where the session is kept (the keychain) is the storage's business (K-305).
 */
import createClient from 'openapi-fetch';

import type { components, paths } from '@/api/schema';

export type StoredSession = Pick<
  components['schemas']['Session'],
  'accessToken' | 'accessTokenExpiresAt' | 'refreshToken'
>;

export type SessionStorage = {
  load(): Promise<StoredSession | null>;
  save(session: StoredSession): Promise<void>;
  clear(): Promise<void>;
};

/** `rejected`: the server refused the refresh token, the session is over. A transport failure throws instead. */
export type RefreshOutcome = { kind: 'renewed'; session: StoredSession } | { kind: 'rejected' };

type Options = {
  storage: SessionStorage;
  refresh: (refreshToken: string) => Promise<RefreshOutcome>;
};

export type SessionManager = ReturnType<typeof createSessionManager>;

export function createSessionManager({ storage, refresh }: Options) {
  // Memory is the truth for this run; the keychain only keeps it across launches. A renewed session is in memory before
  // the (slow, fallible) keychain write, so no request can pick up the refresh token the server has just spent.
  let memory: StoredSession | null | undefined; // undefined: not read from the keychain yet
  // Bumped by sign-in and sign-out: a refresh that started before one of them must not write its answer after it.
  let generation = 0;
  let inFlight: Promise<string | null> | null = null;
  const listeners = new Set<(signedIn: boolean) => void>();
  const announce = (signedIn: boolean) => listeners.forEach((listener) => listener(signedIn));

  async function current(): Promise<StoredSession | null> {
    if (memory === undefined) {
      const loaded = await storage.load();
      memory ??= loaded;
    }
    return memory;
  }

  async function renew(session: StoredSession): Promise<string | null> {
    const startedIn = generation;
    let outcome: RefreshOutcome;
    try {
      outcome = await refresh(session.refreshToken);
    } catch {
      // Offline or a server error: the refresh token may still be good, so the session stays. The caller's request
      // fails this time; the next 401 tries again.
      return null;
    }
    if (generation !== startedIn) return null; // signed in or out meanwhile: this answer belongs to a session that is gone
    if (outcome.kind === 'rejected') {
      memory = null;
      announce(false);
      await storage.clear();
      return null;
    }
    memory = outcome.session;
    // A failed write fails this request; memory already holds the new session, so the next request uses it.
    await storage.save(outcome.session);
    return outcome.session.accessToken;
  }

  async function replace(next: StoredSession | null): Promise<void> {
    generation += 1;
    memory = next;
    announce(next !== null);
    await (next === null ? storage.clear() : storage.save(next));
  }

  return {
    /** The current access token, or null when signed out. */
    accessToken: async (): Promise<string | null> => (await current())?.accessToken ?? null,

    /**
     * Called with the token a request was refused with. Answers the token to retry with, or null (signed out, or the
     * refresh could not reach the server).
     */
    refresh: async (staleAccessToken: string): Promise<string | null> => {
      const session = await current();
      if (session === null) return null;
      // Someone else already refreshed since this request was signed: use their token, do not spend the refresh token.
      if (session.accessToken !== staleAccessToken) return session.accessToken;
      // A refresh in flight is joined, never doubled: `??=` starts one only when there is none.
      inFlight ??= renew(session).finally(() => {
        inFlight = null;
      });
      return inFlight;
    },

    isSignedIn: async (): Promise<boolean> => (await current()) !== null,
    refreshToken: async (): Promise<string | null> => (await current())?.refreshToken ?? null,
    /** Told on sign-in, sign-out and a refused refresh (the navigation switches screens on it). */
    subscribe: (listener: (signedIn: boolean) => void): (() => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    signIn: (session: StoredSession): Promise<void> => replace(session),
    signOut: (): Promise<void> => replace(null),
  };
}

/** The refresh call itself. It goes around the retrying client: a 401 here must end the session, not refresh again. */
export function refreshWithServer({ baseUrl, fetch }: { baseUrl: string; fetch?: (request: Request) => Promise<Response> }) {
  const client = createClient<paths>({ baseUrl, fetch, redirect: 'error' });
  return async (refreshToken: string): Promise<RefreshOutcome> => {
    const { data, response } = await client.POST('/v1/auth/refresh', { body: { refreshToken } });
    if (data !== undefined) {
      const { accessToken, accessTokenExpiresAt, refreshToken: next } = data;
      return { kind: 'renewed', session: { accessToken, accessTokenExpiresAt, refreshToken: next } };
    }
    // 401: unknown, used, revoked or expired; 400: malformed. Neither gets better by asking again.
    if (response.status === 400 || response.status === 401) return { kind: 'rejected' };
    throw new Error(`refresh failed with HTTP ${response.status}`);
  };
}
