/**
 * Whether a consent is given, as the phone knows it (K-402, ADR-030 #25): asked of the server, and kept on the phone so a
 * health entry made offline can still check it before anything is kept. A grant or a withdrawal made here is
 * remembered at once. Unknown — never asked, or the server could not say — is "not given": nothing health is kept on a
 * guess. What is kept belongs to the account and goes at sign-out with it.
 */
import type { ApiClient } from '@/api/client';
import type { KeyValue } from '@/units/preference';

import { type ConsentKind, type ConsentStatus, loadConsents } from './consents';

const KEY = (kind: ConsentKind) => `consent.${kind}`;
const KINDS: ConsentKind[] = ['HEALTH_DATA', 'APPLE_HEALTH', 'THIRD_PARTY_AI'];

export type ConsentState = ReturnType<typeof createConsentState>;

export function createConsentState({ api, kv }: { api: ApiClient; kv: KeyValue }) {
  const remember = async (kind: ConsentKind, status: ConsentStatus) => kv.setItemAsync(KEY(kind), status);
  return {
    async granted(kind: ConsentKind): Promise<boolean> {
      try {
        const states = await loadConsents(api);
        await Promise.all(KINDS.map((k) => (states[k] === undefined ? Promise.resolve() : remember(k, states[k]))));
        return states[kind] === 'GRANTED';
      } catch (error) {
        // Offline: what was last known here. A server that answered no is not "unknown": not given.
        if (!(error instanceof Error) || error.name !== 'NoConnection') return false;
        return (await kv.getItemAsync(KEY(kind))) === 'GRANTED';
      }
    },
    remember,
    async forget(): Promise<void> {
      await Promise.all(KINDS.map((kind) => kv.removeItemAsync(KEY(kind))));
    },
  };
}
