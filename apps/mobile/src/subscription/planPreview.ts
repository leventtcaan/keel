/**
 * The plan just shown at the end of onboarding (#ob-plan), for a paywall opened later in the same run (ADR-091 Ek 7 #1: none
 * opens by itself): its preview and the first call on its timeline, and the paywall's own-plan card (K-1058: where the food
 * starts, the first workout). Kept in memory only, for this run of the app: the paywall met after the app opened again shows
 * its plans and timeline without them. Kept for the rest of the day it was shown only: on a later day its "today" workout and its
 * first call date would be stale. It belongs to the account: a sign-out forgets it.
 */
import type { components } from '@/api/schema';
import { localDay } from '@/today/today';

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
  /** Whether the program sets cardio (none for very active work, ADR-074): only then is it promised. */
  hasCardio: boolean;
  /** Where the food starts, kcal a day, as the plan showed it (the server's); none without the consent or a weigh-in. */
  startingKcal: number | null;
  /** The first workout's name as the plan showed it (the user's own, or the catalog's, already in words). */
  workoutName: string;
  /** How many moves the first workout has. */
  workoutMoves: number;
  /** Whether the first workout is today's. */
  workoutToday: boolean;
};

export type PlanPreviews = ReturnType<typeof createPlanPreviews>;

export function createPlanPreviews(now: () => Date = () => new Date()) {
  let kept: { preview: PlanPreview; day: string } | null = null;
  return {
    keep: (preview: PlanPreview) => {
      kept = { preview, day: localDay(now()) };
    },
    current: (): PlanPreview | null => (kept !== null && kept.day === localDay(now()) ? kept.preview : null),
    forget: () => {
      kept = null;
    },
  };
}
