import type { ApiClient } from '@/api/client';
import { load, localDay } from '@/today/today';

import { learnRhythm } from './mealRhythm';
import { notificationParams as P } from './params';
import type { Reminders } from './reminders';

/**
 * Reads the meals of the learning window and keeps the usual meal times for the meal reminder (ADR-090 #2, K-1063). A read that did
 * not land (offline, an error) says nothing new: what was kept stays; without the health data consent nothing is kept at all.
 * The only request is for the user's own meals.
 */
export async function keepMealRhythm(api: ApiClient, reminders: Pick<Reminders, 'keepMealRhythm'>, now: Date, era: number): Promise<void> {
  const from = localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (P.mealWindowDays - 1)));
  const to = localDay(now);
  const answer = await load(() => api.GET('/v1/meals', { params: { query: { from, to } } }));
  if (answer.state === 'ready') await reminders.keepMealRhythm(learnRhythm(answer.value, now), era);
  else if (answer.state === 'consent') await reminders.keepMealRhythm(null, era);
}
