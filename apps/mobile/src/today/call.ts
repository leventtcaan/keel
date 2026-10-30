/**
 * This week's call on Today (K-502, prototype 3.2-3.4): which face it shows, read from what the server said — never
 * decided here. The engine's "not yet" waits (U3); a call that moves the plan (the server says it is to be applied) is a
 * change, applied once from the phone (K-216/K-217); "continue" holds: nothing to do differently; advice that moves
 * nothing (fix the habit, the training, the recovery) says only its own words.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import type { Save, Undone } from '@/saved/saved';
import type { UnitSystem } from '@/units/units';

import { appliedWords } from './callChanges';

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

/**
 * Puts the targets back as they were before the call (POST /v1/decisions/{id}/undo, the latest call, once applied). Said for
 * the banner's Undo: a refusal (409: a safety call is never taken back, or another call moved the plan) ends the try; no
 * connection, or a fault of ours, leaves it open to another.
 */
export async function undoCall(api: ApiClient, id: string): Promise<Undone> {
  let result;
  try {
    result = await api.POST('/v1/decisions/{id}/undo', { params: { path: { id } } });
  } catch {
    return { done: false, message: t('today.call.undoOffline'), again: true };
  }
  if (result.data !== undefined) return { done: true, said: t('today.call.undone') };
  if (result.response.status === 409) return { done: false, message: t('today.call.undoRefused'), again: false };
  return { done: false, message: t('undoBanner.failed'), again: true };
}

/**
 * The banner that follows "Use this call" from anywhere (This week, Train, the call screen): the call is applied, what it
 * moved, and Undo. Said from the call as it was read before the tap, whose changes are the call's own numbers.
 */
export function appliedSave(api: ApiClient, decision: Decision, units: UnitSystem): Save {
  const detail = appliedWords(decision, units);
  return { lead: t('today.call.appliedLead'), ...(detail === undefined ? {} : { detail }), undo: () => undoCall(api, decision.id) };
}

export type CallFace = {
  /**
   * What the call's foot says of the plan: in it (a past call: applied), kept off it (declined), undone; nothing for one
   * not applied yet.
   */
  foot: 'inPlan' | 'applied' | 'notApplied' | 'notAppliedYet' | 'undone' | null;
  /** The one second way (ADR-077 #3): keep last week's plan, where the server allows it; use the call, where it is not in the plan. */
  second: 'keep' | 'use' | null;
};

/**
 * The call screen's face (K-978, ADR-077 #3), from what the server said: "Keep last week's plan" only when it marks the
 * call declinable (never a safety call, U13; the phone does not know those rules); "Use this call" while the call is
 * not in the plan (declined, or pending: "Not applied yet"). A past call, opened read only, says where it stands and
 * offers nothing.
 */
export function callFace(decision: Decision, readOnly: boolean): CallFace {
  const state = decision.application.state;
  const foot = state === 'APPLIED' ? (readOnly ? 'applied' : 'inPlan') : state === 'DECLINED' ? 'notApplied' : state === 'UNDONE' ? 'undone' : null;
  if (readOnly) return { foot, second: null };
  if (state === 'PENDING') return { foot: 'notAppliedYet', second: 'use' };
  if (state === 'DECLINED') return { foot, second: 'use' };
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
