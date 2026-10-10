/**
 * "The plan was shown" (K-993, ADR-077 Ek 3): the first time #ob-plan shows the plan the phone tells the server, so the
 * first week and the first call's day count from this day and the days before it are not planned for the first call
 * (no missed session the user never saw, U7). The server keeps the first time only, by its own clock; this sends it
 * once while the onboarding stack lives (`Progress.planSeen`) and not again from a kv key: sent again it changes nothing
 * on the server (204), so a persisted mark would be one more key to keep and to clear for nothing. A failed send marks
 * nothing, so the plan shown again (the app opened again with the plan still to be seen) says it again. Nothing here
 * stops the flow: a failure is reported by name (V3) and the plan goes on as it was.
 */
import type { ApiClient } from '@/api/client';

import { readFirstCall } from './prepare';

export type SeenResult =
  /** Not kept (no connection, or the server refused): nothing changes, it is tried again when the plan is shown again. */
  | { sent: false }
  /** Kept. `firstCall`: the day read again (the server may have moved it; null when it names none); undefined when it could not be read. */
  | { sent: true; firstCall?: string | null };

/** Says the plan was shown and, with the health data consent (there is a first call only then), reads the first call's day again. */
export async function sendPlanSeen(api: ApiClient, consented: boolean, report: (problem: { name: string }) => void): Promise<SeenResult> {
  try {
    const answer = await api.PUT('/v1/profile/plan-seen');
    if (!answer.response.ok) {
      report({ name: 'ServerError' });
      return { sent: false };
    }
  } catch {
    report({ name: 'NoConnection' });
    return { sent: false };
  }
  if (!consented) return { sent: true };
  try {
    return { sent: true, firstCall: await readFirstCall(api) };
  } catch (error) {
    report({ name: error instanceof Error ? error.name : 'Unknown' });
    return { sent: true };
  }
}
