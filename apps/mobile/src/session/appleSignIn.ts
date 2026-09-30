/**
 * Sign in with Apple (K-305, ADR-011, ADR-025). A random nonce is made on the phone; Apple gets its SHA-256 (lowercase
 * hex) and puts it in the identity token, our server gets the raw value and checks the two match (K-203,
 * AppleIdentityVerifier) — so a token caught from someone else's sign-in cannot be replayed here. No name and no email
 * are asked for: the server keeps only Apple's user id (ADR-025 §3).
 */
import { CryptoDigestAlgorithm, digestStringAsync, getRandomBytes } from 'expo-crypto';

import type { ApiClient } from '@/api/client';

import type { SessionManager } from './session';

/** The part of expo-apple-authentication used; passed in so the flow is testable without Apple. */
export type AppleAuth = {
  signInAsync(options: { requestedScopes: never[]; nonce: string }): Promise<{
    identityToken: string | null;
    authorizationCode: string | null;
  }>;
};

export type Nonce = { raw(): string; hash(raw: string): Promise<string> };

/** `failed.reason`: APPLE — Apple's side; REFUSED — our server said no; NO_ANSWER — no connection. */
export type SignInResult =
  | { kind: 'signedIn'; newAccount: boolean }
  | { kind: 'canceled' }
  | { kind: 'failed'; reason: 'APPLE' | 'REFUSED' | 'NO_ANSWER' };

const NONCE_BYTES = 32;
const CANCELED = 'ERR_REQUEST_CANCELED';

export const deviceNonce: Nonce = {
  raw: () => Array.from(getRandomBytes(NONCE_BYTES), (byte) => byte.toString(16).padStart(2, '0')).join(''),
  // digestStringAsync answers lowercase hex by default — the same text the server computes.
  hash: (raw) => digestStringAsync(CryptoDigestAlgorithm.SHA256, raw),
};

type Options = { apple: AppleAuth; nonce: Nonce; api: ApiClient; session: SessionManager };

export async function signInWithApple({ apple, nonce, api, session }: Options): Promise<SignInResult> {
  const raw = nonce.raw();
  let credential: Awaited<ReturnType<AppleAuth['signInAsync']>>;
  try {
    credential = await apple.signInAsync({ requestedScopes: [], nonce: await nonce.hash(raw) });
  } catch (error) {
    if ((error as { code?: unknown }).code === CANCELED) return { kind: 'canceled' };
    return { kind: 'failed', reason: 'APPLE' };
  }
  if (credential.identityToken === null) return { kind: 'failed', reason: 'APPLE' };

  let answer;
  try {
    answer = await api.POST('/v1/auth/apple', {
      body: {
        identityToken: credential.identityToken,
        nonce: raw,
        ...(credential.authorizationCode === null ? {} : { authorizationCode: credential.authorizationCode }),
      },
    });
  } catch {
    return { kind: 'failed', reason: 'NO_ANSWER' };
  }
  if (answer.data === undefined) return { kind: 'failed', reason: 'REFUSED' };
  const { accessToken, accessTokenExpiresAt, refreshToken, newAccount } = answer.data;
  await session.signIn({ accessToken, accessTokenExpiresAt, refreshToken });
  return { kind: 'signedIn', newAccount };
}
