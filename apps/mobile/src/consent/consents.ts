/**
 * Consents from the phone (K-312; K-204, ADR-007). A grant names the version of the text the user saw — the version in
 * data/copy/en.json › consent, which the server must hold as current (consent-versions.test.ts), or it refuses.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { t } from '@/copy';

export type ConsentKind = components['schemas']['ConsentKind'];

/** The copy key of each consent's text. */
export const CONSENT_COPY: Record<ConsentKind, string> = {
  HEALTH_DATA: 'consent.health_data',
  APPLE_HEALTH: 'consent.apple_health',
  THIRD_PARTY_AI: 'consent.third_party_ai',
};

export function consentVersion(kind: ConsentKind): string {
  return t(`${CONSENT_COPY[kind]}.version`);
}

/**
 * Records the consent on the server. Only the health consents are granted here; the AI consent names its provider and
 * data (K-511). Throws when the server did not record it, so a screen never goes on as if it had.
 */
export async function grantConsent(api: ApiClient, kind: Exclude<ConsentKind, 'THIRD_PARTY_AI'>): Promise<void> {
  const { data, response } = await api.PUT('/v1/consents/{kind}', {
    params: { path: { kind } },
    body: { textVersion: consentVersion(kind) },
  });
  if (data === undefined) throw new Error(`consent ${kind} not recorded: HTTP ${response.status}`);
}
