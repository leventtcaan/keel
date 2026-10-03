/**
 * What the lock-screen widget says (K-515, ADR-048, V3): the week's call as its label — "Keep going", "Hold the weight" —
 * and when it is looked at again. Never a number (weight, calories, a percentage) and never the call's title or why: the
 * lock screen is seen without unlocking, and Apple hides a widget only if the user changed a setting, so the numberless
 * view is kept here — no number is ever handed to the widget. A safety call arrives as its general change of phase
 * (ADR-028 #24), so its label is general too. No call, or one the app cannot word: one neutral line.
 *
 * The widget itself (expo-widgets, a native target) is the device step (K-308); this is what it will be given.
 */
import type { components } from '@/api/schema';
import { has, t } from '@/copy';
import { labelKey, weekdayDate } from '@/today/today';

export type LockScreenCall = { line: string; next: string | null };

const NONE: LockScreenCall = { line: t('widget.call.none'), next: null };

export function lockScreenCall(decision: components['schemas']['Decision'] | null): LockScreenCall {
  if (decision === null) return NONE;
  const label = labelKey(decision.copyKey);
  if (!has(label)) return NONE;
  return { line: t(label), next: t('today.call.nextReview', { date: weekdayDate(decision.nextReview) }) };
}
