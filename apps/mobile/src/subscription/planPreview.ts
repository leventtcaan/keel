/**
 * The plan just shown at the end of onboarding (#ob-plan), handed to the paywall that follows it (#paywall, ADR-072 #7):
 * its preview and the first call on its timeline. Kept in memory only, for this run of the app: the paywall met later
 * (the app opened again) shows its plans and timeline without them. It belongs to the account: a sign-out forgets it.
 */
import type { components } from '@/api/schema';

type Weekday = components['schemas']['Weekday'];

export type PlanPreview = {
  /** The user's own program (reviewed), or one built for their days. */
  own: boolean;
  /** Training days a week. */
  days: number;
  /** The first workout's weekday; none for a program without weekdays. */
  firstWorkout: Weekday | null;
  /** The first call's day (YYYY-MM-DD, the user's calendar); none without the health data consent (no calls). */
  firstCall: string | null;
  /** The weekday the calls come on. */
  checkInDay: Weekday;
};

export type PlanPreviews = ReturnType<typeof createPlanPreviews>;

export function createPlanPreviews() {
  let kept: PlanPreview | null = null;
  return {
    keep: (preview: PlanPreview) => void (kept = preview),
    current: (): PlanPreview | null => kept,
    forget: () => void (kept = null),
  };
}
