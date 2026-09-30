/**
 * The API client: typed end to end from contracts/openapi.yaml through the generated schema.ts (K3, ADR-006), so a
 * path, body or response the contract does not have is a compile error, not a runtime surprise.
 * Every request is signed with the current access token. Refreshing an expired token (single flight, ADR-025) is
 * K-304; storing the session is K-305 — both plug in through AccessTokenSource.
 */
import createClient, { type Client, type Middleware } from 'openapi-fetch';

import type { paths } from './schema';

/** Returns the current access token, or null when signed out. Read before every request. */
export type AccessTokenSource = () => Promise<string | null>;
export type ApiClient = Client<paths>;

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
  /** For tests; defaults to the platform fetch. */
  fetch?: (request: Request) => Promise<Response>;
};

export function createApiClient({ baseUrl, accessToken, fetch }: Options): ApiClient {
  const client = createClient<paths>({ baseUrl, fetch });
  client.use(bearerAuth(accessToken));
  return client;
}
