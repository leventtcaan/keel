/**
 * Whether a consent is given, as the phone knows it (K-402, ADR-030 #25): asked of the server, and kept on the phone so a
 * health entry made offline can still check it before anything is kept. A grant or a withdrawal made here is
 * remembered at once. Unknown — never asked, or the server could not say — is "not given": nothing health is kept on a
 * guess. What is kept belongs to the account and goes at sign-out with it. It is kept with the version of the text the
 * phone shows (K-429): after the text is revised, a yes kept before is a yes to the old text, not given.
 */
import type { ApiClient } from '@/api/client';
import type { KeyValue } from '@/units/preference';

import { type ConsentKind, consentVersion, loadConsents, type PhoneConsentStatus } from './consents';

const KEY = (kind: ConsentKind) => `consent.${kind}`;
const KINDS: ConsentKind[] = ['HEALTH_DATA', 'APPLE_HEALTH', 'THIRD_PARTY_AI'];

export type ConsentState = ReturnType<typeof createConsentState>;

export function createConsentState({ api, kv }: { api: ApiClient; kv: KeyValue }) {
  const kept = (kind: ConsentKind, status: PhoneConsentStatus) => `${status}@${consentVersion(kind)}`;
  const remember = async (kind: ConsentKind, status: PhoneConsentStatus) => kv.setItemAsync(KEY(kind), kept(kind, status));
  /** The server's answer, kept. Throws like loadConsents. */
  const ask = async () => {
    const states = await loadConsents(api);
    await Promise.all(KINDS.map((k) => (states[k] === undefined ? Promise.resolve() : remember(k, states[k]))));
    return states;
  };
  const offline = (error: unknown) => error instanceof Error && error.name === 'NoConnection';
  return {
    async granted(kind: ConsentKind): Promise<boolean> {
      try {
        return (await ask())[kind] === 'GRANTED';
      } catch (error) {
        // Offline: what was last known here. A server that answered no is not "unknown": not given.
        if (!offline(error)) return false;
        return (await kv.getItemAsync(KEY(kind))) === kept(kind, 'GRANTED');
      }
    },
    /**
     * Whether the server holds a grant, to any text: for taking it back (K-986), where a guess must lean the other way
     * from `granted`. A server that answered with an error, or a phone that cannot read what it kept, cannot say:
     * "unknown", and the caller withdraws anyway (the server does nothing when nothing was given). Offline: what was kept.
     */
    async held(kind: ConsentKind): Promise<boolean | 'unknown'> {
      try {
        const status = (await ask())[kind];
        return status === 'GRANTED' || status === 'OUTDATED';
      } catch (error) {
        if (!offline(error)) return 'unknown';
        try {
          return /^(GRANTED|OUTDATED)(@|$)/.test((await kv.getItemAsync(KEY(kind))) ?? '');
        } catch {
          return 'unknown';
        }
      }
    },
    remember,
    async forget(): Promise<void> {
      await Promise.all(KINDS.map((kind) => kv.removeItemAsync(KEY(kind))));
    },
  };
}
