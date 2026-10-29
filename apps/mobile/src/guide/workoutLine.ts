/**
 * What the guide's "Today's workout" step says (K-1066): the line has to match the card it points at. Tap Start with loads ready
 * is only true when the server has a target for the moves (nextReps, as the card writes them); in the first week the card shows
 * the plan ("3 × 6-10") and session 1 finds the weights; on a day whose workout is done there is no Start, the next session is
 * what comes; a card with no Start (rest, moved, skipped, under way) is not told to be pressed.
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { nextSession, weekdayOf } from '@/today/week';
import type { TodayCard } from '@/today/todayWorkout';
import { dayName } from '@/train/program';

type Program = components['schemas']['Program'];

export function workoutLine(card: TodayCard, program: Program | null, today: string): string {
  if (card.kind === 'session') return t(card.day.exercises.some((move) => move.nextReps !== undefined) ? 'guide.workout.body' : 'guide.workout.first');
  if (card.kind === 'done') {
    const next = program === null ? null : nextSession(program.week, program.days, today);
    if (next === null) return t('guide.workout.doneLast');
    return t('guide.workout.done', { session: dayName(next.day), weekday: t(`onboarding.schedule.dayName.${weekdayOf(next.date)}`) });
  }
  return t('guide.workout.other');
}
