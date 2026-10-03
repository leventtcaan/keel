/**
 * What the lock-screen widget says (K-515, ADR-048, V3): the week's call as its label — "Keep going", "Hold the weight" —
 * and when it is looked at again. Never a number (weight, calories, a percentage) and never the call's title or why: the
 * lock screen is seen without unlocking, and Apple hides a widget only if the user changed a setting, so the numberless
 * view is kept here — no number is ever handed to the widget. A safety call arrives as its general change of phase
 * (ADR-028 #24); its label is the general one here too, whatever key it came with. No call: says so. A call the app cannot
 * word (an action newer than its copy): that there is one, nothing more.
 *
 * The widget itself (expo-widgets, a native target) is the device step (K-308); this is what it will be given.
 */
import type { components } from '@/api/schema';
import { has, t } from '@/copy';
import { labelKey, weekdayDate } from '@/today/today';

export type LockScreenCall = { line: string; next: string | null };

const SAFETY_LABEL = 'decision.change_phase.label';

export function lockScreenCall(decision: components['schemas']['Decision'] | null): LockScreenCall {
  if (decision === null) return { line: t('widget.call.none'), next: null };
  // The server words a safety call as a change of phase; a screen anyone can see does not rely on that alone (review).
  const label = decision.safety === true ? SAFETY_LABEL : labelKey(decision.copyKey);
  if (!has(label)) return { line: t('widget.call.ready'), next: null };
  return { line: t(label), next: t('today.call.nextReview', { date: weekdayDate(decision.nextReview) }) };
}
