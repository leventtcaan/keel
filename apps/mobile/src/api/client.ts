/**
 * The API client: typed end to end from contracts/openapi.yaml through the generated schema.ts (K3, ADR-006), so a
 * path, body or response the contract does not have is a compile error, not a runtime surprise.
 * Every request is signed with the current access token. A 401 is refreshed once and retried once (K-311, single
 * flight in session.ts); storing the session is K-305.
 */
import createClient, { type Client, type Middleware } from 'openapi-fetch';

import type { paths } from './schema';

/** Returns the current access token, or null when signed out. Read before every request. */
export type AccessTokenSource = () => Promise<string | null>;
/** Given the token a request was refused with, the token to retry with, or null. */
export type RefreshSource = (staleAccessToken: string) => Promise<string | null>;
export type ApiClient = Client<paths>;
type Fetch = (request: Request) => Promise<Response>;

export function bearerAuth(accessToken: AccessTokenSource): Middleware {
  return {
    async onRequest({ request }) {
      // A token source that throws (e.g. a locked keychain) fails the request: sending it unsigned would only
      // come back as a confusing 401.
      const token = await accessToken();
      if (token !== null) request.headers.set('Authorization', `Bearer ${token}`);
      return request;
    },
  };
}

type Options = {
  /** From configuration (config.ts), never a literal. */
  baseUrl: string;
  accessToken: AccessTokenSource;
  /** Answers the token to retry a 401 with, or null (session.ts). Without it a 401 is the answer. */
  refresh?: RefreshSource;
  /** For tests; defaults to the platform fetch. */
  fetch?: Fetch;
};

const BEARER = 'Bearer ';

/**
 * Wraps fetch, not openapi-fetch's onResponse: the retry needs the request's body, and fetch consumes it on the first
 * send, so the copy is taken before. The sign-in endpoints are left alone: their 401 is the answer, and a refresh
 * there would be a refresh inside a refresh.
 */
export function retryOnceAfterRefresh(fetch: Fetch, refresh: RefreshSource, authPrefix: string): Fetch {
  return async (request) => {
    const authorization = request.headers.get('Authorization');
    if (authorization === null || !authorization.startsWith(BEARER) || request.url.startsWith(authPrefix)) {
      return fetch(request);
    }
    const copy = request.clone();
    const response = await fetch(request);
    if (response.status !== 401) return response;
    const fresh = await refresh(authorization.slice(BEARER.length));
    if (fresh === null) return response;
    copy.headers.set('Authorization', `${BEARER}${fresh}`);
    return fetch(copy);
  };
}

export function createApiClient({ baseUrl, accessToken, refresh, fetch }: Options): ApiClient {
  const send: Fetch = fetch ?? ((request) => globalThis.fetch(request));
  const signed = refresh === undefined ? send : retryOnceAfterRefresh(send, refresh, `${baseUrl}/v1/auth/`);
  // The API never redirects; refusing one keeps the Authorization header from following it to another host.
  const client = createClient<paths>({ baseUrl, fetch: signed, redirect: 'error' });
  client.use(bearerAuth(accessToken));
  return client;
}
