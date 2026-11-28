/**
 * The plan just shown at the end of onboarding is kept for the rest of that day only (ADR-091 Ek 7 #1): a paywall opened later in
 * the same run shows it, but not on a later day, when its "today" workout and its first call date have gone stale.
 */
import { type PlanPreview, createPlanPreviews } from '@/subscription/planPreview';

const PLAN: PlanPreview = {
  own: false, days: 3, firstWorkout: 'MONDAY', firstCall: '2026-12-07', checkInDay: 'MONDAY', hasCardio: false, startingKcal: 2440,
  workoutName: 'Full body', workoutMoves: 5, workoutToday: true,
};

test('kept: the same day, the plan is there', () => {
  let now = new Date(2026, 11, 1, 9, 0);
  const previews = createPlanPreviews(() => now);
  previews.keep(PLAN);
  now = new Date(2026, 11, 1, 23, 30);
  expect(previews.current()).toEqual(PLAN);
});

test('a later day (the app left open overnight): no plan, its words would be stale', () => {
  let now = new Date(2026, 11, 1, 23, 30);
  const previews = createPlanPreviews(() => now);
  previews.keep(PLAN);
  now = new Date(2026, 11, 2, 0, 10);
  expect(previews.current()).toBeNull();
});

test('forgotten (a sign-out): none', () => {
  const previews = createPlanPreviews(() => new Date(2026, 11, 1, 9, 0));
  previews.keep(PLAN);
  previews.forget();
  expect(previews.current()).toBeNull();
});
