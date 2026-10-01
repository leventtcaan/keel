/**
 * Weigh-ins from a smart scale, through Apple Health (K-402, ADR-018 §2). Read only with both consents: Apple Health's
 * (to read) and the health data consent (to keep them, ADR-030 #25 — nothing health is kept on the phone without it).
 * Each sample keeps its Health id as its clientId, so reading the same days again stores nothing twice (the queue keeps a
 * clientId once, the server too, ADR-024). A weight no body could have is left out rather than sent to be refused.
 */
import type { Outbound } from '@/sync/queue';
import { roundTo, storedKgDecimals } from '@/units/units';
import { onboardingParams } from '@/onboarding/params';

import type { HealthAccess } from './health';
import { healthParams } from './params';

const DAY_MS = 24 * 3600 * 1000;
export const HEALTH_WEIGHT_READ_DAYS = healthParams.weightReadDays;

type Deps = {
  health: HealthAccess;
  queue: { record(record: Outbound): Promise<boolean>; drain(): Promise<void> };
  /** Both consents given now: HEALTH_DATA and APPLE_HEALTH. */
  consented: () => Promise<boolean>;
  now: Date;
};

/** How many weigh-ins were new on the phone. */
export async function syncHealthWeights({ health, queue, consented, now }: Deps): Promise<number> {
  if (!health.available || !(await consented())) return 0;
  const weights = await health.readWeights(new Date(now.getTime() - HEALTH_WEIGHT_READ_DAYS * DAY_MS), now);
  let added = 0;
  for (const weight of weights) {
    const kg = roundTo(weight.kg, storedKgDecimals);
    if (!(kg > 0 && kg <= onboardingParams.weighInMaxKg)) continue;
    const isNew = await queue.record({
      kind: 'weighIn',
      body: { clientId: weight.id.toLowerCase(), measuredAt: weight.at, kg, source: 'APPLE_HEALTH' },
    });
    if (isNew) added++;
  }
  if (added > 0) await queue.drain();
  return added;
}
