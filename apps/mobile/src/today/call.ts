/**
 * This week's call on Today (K-502, prototype 3.2-3.4): which of its three faces it shows, read from what the server
 * said — never decided here. The engine's "not yet" waits (U3); a call that moves the plan is a change, applied once
 * from the phone (K-216); anything else holds: nothing to do differently.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';

type Decision = components['schemas']['Decision'];

export type CallVariant = 'hold' | 'change' | 'wait';

export function variantOf(decision: Decision): CallVariant {
  if (decision.action.type === 'NO_DECISION_YET') return 'wait';
  return decision.application.state === 'NOT_NEEDED' ? 'hold' : 'change';
}

/** Apply the call from today. Throws NoConnection when nothing came back, ApplyRefused when the server said no (409: past). */
export async function applyCall(api: ApiClient, id: string): Promise<void> {
  let result;
  try {
    result = await api.POST('/v1/decisions/{id}/apply', { params: { path: { id } } });
  } catch {
    throw Object.assign(new Error('apply: no answer'), { name: 'NoConnection' });
  }
  if (result.data === undefined) throw Object.assign(new Error(`apply refused: HTTP ${result.response.status}`), { name: 'ApplyRefused' });
}
