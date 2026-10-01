/**
 * Consents from the phone (K-312; K-204, ADR-007). A grant names the version of the text the user saw — the version in
 * data/copy/en.json › consent, which the server must hold as current (consent-versions.test.ts), or it refuses.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import type { HealthAccess } from '@/health/health';

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
  const answer = await reach(() => api.PUT('/v1/consents/{kind}', { params: { path: { kind } }, body: { textVersion: consentVersion(kind) } }));
  if (answer.data === undefined) throw named('ConsentRefused', `consent ${kind} not recorded: HTTP ${answer.response.status}`);
}

/**
 * Takes the consent back; the features it covers stop at once (K-204). Withdrawing HEALTH_DATA also deletes, for good,
 * the health data it covered (K-231), so the server takes it only with `confirmDataDeletion` — after the user was told
 * (Settings asks first and offers the export). Throws like grantConsent.
 */
export async function withdrawConsent(api: ApiClient, kind: ConsentKind, confirmDataDeletion = false): Promise<void> {
  const params = confirmDataDeletion ? { path: { kind }, query: { confirmDataDeletion } } : { path: { kind } };
  const answer = await reach(() => api.DELETE('/v1/consents/{kind}', { params }));
  if (answer.data === undefined) throw named('ConsentRefused', `consent ${kind} not withdrawn: HTTP ${answer.response.status}`);
}

/**
 * Connecting Apple Health (onboarding and Settings, ADR-018): Apple's sheet first, then the consent recorded — a sheet
 * that fails leaves no consent behind for a connection that never happened, and nothing is read from Apple Health before
 * the consent is recorded (K-404 reads only with it). A failing sheet is HealthSheetFailed; the grant fails like any.
 */
export async function connectAppleHealth(api: ApiClient, health: HealthAccess): Promise<void> {
  try {
    await health.requestRead();
  } catch {
    throw named('HealthSheetFailed', 'Apple Health sheet failed');
  }
  await grantConsent(api, 'APPLE_HEALTH');
}

export type ConsentStatus = components['schemas']['Consent']['status'];

/** Each consent's state, from the server. Throws like the others. */
export async function loadConsents(api: ApiClient): Promise<Partial<Record<ConsentKind, ConsentStatus>>> {
  const answer = await reach(() => api.GET('/v1/consents'));
  if (answer.data === undefined) throw named('ConsentRefused', `consents not read: HTTP ${answer.response.status}`);
  return Object.fromEntries(answer.data.map((consent) => [consent.kind, consent.status]));
}

/** By name, so a screen tells no connection from a server that answered no (V3: never the message). */
function named(name: 'NoConnection' | 'ConsentRefused' | 'HealthSheetFailed', message: string): Error {
  return Object.assign(new Error(message), { name });
}

async function reach<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch {
    throw named('NoConnection', 'consent: no answer');
  }
}
