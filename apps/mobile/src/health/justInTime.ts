/**
 * Apple Health, asked when it is first used (K-980, ADR-018 Ek 1, ADR-072 #8): at the first weigh-in or at the end of the
 * first workout, whichever comes first, and only once. "Not now" is free and is the once; Settings gives it later. Nothing
 * is asked where Apple Health cannot be (Expo Go), before the health data consent (what it reads is health data), or when
 * it is on already. Connecting is Apple's sheet first, then the consent to the text shown, as in Settings (connectAppleHealth),
 * so a sheet that fails leaves no consent behind and is not the once.
 */
import type { ApiClient } from '@/api/client';
import { type ConsentKind, connectAppleHealth } from '@/consent/consents';
import type { KeyValue } from '@/units/preference';

import type { HealthAccess } from './health';

/** Kept on the phone for the account: a sign-out forgets it, the next person is asked afresh. */
const KEY = 'health.asked';

export type HealthAsk = ReturnType<typeof createHealthAsk>;

export function createHealthAsk({ kv }: { kv: KeyValue }) {
  return {
    asked: async (): Promise<boolean> => (await kv.getItemAsync(KEY)) !== null,
    markAsked: (): Promise<void> => kv.setItemAsync(KEY, '1'),
    forget: async (): Promise<void> => void (await kv.removeItemAsync(KEY)),
  };
}

type Consents = {
  granted(kind: ConsentKind): Promise<boolean>;
  remember(kind: ConsentKind, status: 'GRANTED'): Promise<unknown>;
};

export async function healthJitDue({
  health,
  consents,
  healthAsk,
}: {
  health: Pick<HealthAccess, 'available'>;
  consents: Pick<Consents, 'granted'>;
  healthAsk: Pick<HealthAsk, 'asked'>;
}): Promise<boolean> {
  if (!health.available || (await healthAsk.asked())) return false;
  if (!(await consents.granted('HEALTH_DATA'))) return false;
  return !(await consents.granted('APPLE_HEALTH'));
}

/** connected: on · sheetFailed: Apple's sheet did not come up · failed: the server did not take the consent. Either failure can be tried again. */
export async function connectHealthJit({
  api,
  health,
  consents,
  healthAsk,
}: {
  api: Pick<ApiClient, 'PUT'>;
  health: Pick<HealthAccess, 'requestRead'>;
  consents: Pick<Consents, 'remember'>;
  healthAsk: Pick<HealthAsk, 'markAsked'>;
}): Promise<'connected' | 'sheetFailed' | 'failed'> {
  try {
    await connectAppleHealth(api, health);
  } catch (error) {
    return error instanceof Error && error.name === 'HealthSheetFailed' ? 'sheetFailed' : 'failed';
  }
  await consents.remember('APPLE_HEALTH', 'GRANTED').catch(() => undefined); // the phone knows at once (K-402)
  await healthAsk.markAsked().catch(() => undefined);
  return 'connected';
}
