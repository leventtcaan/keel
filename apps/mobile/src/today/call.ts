/**
 * This week's call on Today (K-502, prototype 3.2-3.4): which face it shows, read from what the server said — never
 * decided here. The engine's "not yet" waits (U3); a call that moves the plan (the server says it is to be applied) is a
 * change, applied once from the phone (K-216/K-217); "continue" holds: nothing to do differently; advice that moves
 * nothing (fix the habit, the training, the recovery) says only its own words.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';

type Decision = components['schemas']['Decision'];

export type CallVariant = 'hold' | 'advice' | 'change' | 'wait';

export function variantOf(decision: Decision): CallVariant {
  if (decision.action.type === 'NO_DECISION_YET') return 'wait';
  if (decision.application.state !== 'NOT_NEEDED') return 'change';
  return decision.action.type === 'CONTINUE' ? 'hold' : 'advice';
}

/** What the call says once applied: its own action's words ("decision.<action>.<rule>" → "decision.<action>.applied"). */
export function appliedKey(copyKey: string): string {
  return `${copyKey.split('.').slice(0, 2).join('.')}.applied`;
}

/**
 * Apply the call from today. Throws NoConnection when nothing came back, ApplyRefused when the call is past (409: another
 * moved the plan, or it was undone), ApplyFailed for any other refusal — ours, worth another try.
 */
export async function applyCall(api: ApiClient, id: string): Promise<void> {
  let result;
  try {
    result = await api.POST('/v1/decisions/{id}/apply', { params: { path: { id } } });
  } catch {
    throw Object.assign(new Error('apply: no answer'), { name: 'NoConnection' });
  }
  if (result.data === undefined) {
    const name = result.response.status === 409 ? 'ApplyRefused' : 'ApplyFailed';
    throw Object.assign(new Error(`apply not done: HTTP ${result.response.status}`), { name });
  }
}

export type CallFace = {
  /** What the call's foot says of the plan: in it, kept off it (declined), undone; nothing for one not applied yet. */
  foot: 'inPlan' | 'notApplied' | 'undone' | null;
  /** The one second way (ADR-077 #3): keep last week's plan, where the server allows it; use the call, where it is not in the plan. */
  second: 'keep' | 'use' | null;
};

/**
 * The call screen's face (K-978, ADR-077 #3), from what the server said: "Keep last week's plan" only when it marks the
 * call declinable (never a safety call, U13; the phone does not know those rules); "Use this call" while the call is
 * not in the plan (declined, or pending). A past call, opened read only, says where it stands and offers nothing.
 */
export function callFace(decision: Decision, readOnly: boolean): CallFace {
  const state = decision.application.state;
  const foot = state === 'APPLIED' ? 'inPlan' : state === 'DECLINED' ? 'notApplied' : state === 'UNDONE' ? 'undone' : null;
  if (readOnly) return { foot, second: null };
  if (state === 'DECLINED' || state === 'PENDING') return { foot, second: 'use' };
  return { foot, second: state === 'APPLIED' && decision.declinable ? 'keep' : null };
}

/**
 * "Keep last week's plan" (K-963): the call stays on record, not applied. Throws NoConnection when nothing came back,
 * DeclineRefused when the server says not this call (409: a safety call, an older one, one that changes nothing),
 * DeclineFailed for any other refusal.
 */
export async function declineCall(api: ApiClient, id: string): Promise<void> {
  let result;
  try {
    result = await api.POST('/v1/decisions/{id}/decline', { params: { path: { id } } });
  } catch {
    throw Object.assign(new Error('decline: no answer'), { name: 'NoConnection' });
  }
  if (result.data === undefined) {
    const name = result.response.status === 409 ? 'DeclineRefused' : 'DeclineFailed';
    throw Object.assign(new Error(`decline not done: HTTP ${result.response.status}`), { name });
  }
}
