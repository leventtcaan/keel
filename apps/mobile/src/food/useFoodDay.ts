import { useCallback, useEffect, useRef } from 'react';

import type { components } from '@/api/schema';
import { useAppServices } from '@/services/ServicesProvider';
import { type Loaded, load } from '@/today/today';
import { useReadOnFocus } from '@/today/useReadOnFocus';

import { localDay } from '@/today/today';

import { addDays } from './dayLabel';
import { type DayMeal, dayBefore, dayMeals, repeatOffers } from './meals';
import { foodParams } from './params';
import { usedSlots } from './slots';

type Schemas = components['schemas'];

export type FoodDay = {
  /** The day these reads are of (YYYY-MM-DD). */
  day: string;
  budget: Loaded<Schemas['DayBudget']>;
  targets: Loaded<Schemas['Targets']>;
  /** The day's meals; null behind the health data consent (the server said so). */
  meals: DayMeal[] | null;
  /** Whether the server's list was read: if not, the meals are only the phone's, and "nothing logged" cannot be said. */
  mealsRead: boolean;
  /** "Same as yesterday", for the slots this day has nothing in; empty when the day before could not be read. */
  offers: Schemas['Meal'][];
  /** What the day can still hold (K-507): the user's own foods that fit what is likely left; empty when none, unread, or not today. */
  suggestions: Schemas['Suggestion'][];
  /** That day's own totals, when it has meals (the strip's read): what a day without a target shows. */
  summary: Schemas['DaySummary'] | undefined;
  /** The days of the strip with a meal logged: the day shown by the list the page shows, the others by the strip's read. */
  loggedDays: ReadonlySet<string>;
  /** Those days with what each came to, oldest first: the days a day's meals can be copied from. */
  summaries: Schemas['DaySummary'][];
  /** The slots the user's day is made of: those they logged into lately, and this day's (all four until a pattern shows). */
  slots: Schemas['MealSlot'][];
  /** On how many different days of the recent window the user logged a meal: the pattern the slots and the per-meal hint rest on. */
  patternDays: number;
};

/**
 * The Food page's reads (K-409, K-407, K-1063), on focus and on coming back to the front, for the day shown (`selected`, else today):
 * the budget, the targets, that day's meals, the day before's for "same as yesterday", and the last month's days with meals for the
 * strip. What waits on the phone is sent first, so a meal just saved is in the server's list; offline, the phone's own copies stand in
 * for it. Choosing another day reads again.
 */
export function useFoodDay(selected: string | null): { today: string; day: string; data: FoodDay | null; reload: () => void } {
  const { api, queue, mealRecords, report } = useAppServices();
  const latest = useRef({ queue, mealRecords, report });
  useEffect(() => {
    latest.current = { queue, mealRecords, report };
  });
  const read = useCallback(
    async (today: string): Promise<FoodDay> => {
      const day = selected ?? today;
      const { queue: waiting, mealRecords: records, report: tell } = latest.current;
      const named = (error: unknown) => tell({ name: error instanceof Error ? error.name : 'Unknown' });
      await waiting.drain().catch(named);
      const [budget, targets, shown, before, local, suggested, days, history] = await Promise.all([
        load(() => api.GET('/v1/days/{day}/budget', { params: { path: { day } } })),
        load(() => api.GET('/v1/targets')),
        load(() => api.GET('/v1/meals', { params: { query: { day } } })),
        load(() => api.GET('/v1/meals', { params: { query: { day: dayBefore(day) } } })),
        records().catch((error: unknown) => {
          named(error);
          return [];
        }),
        day === today ? load(() => api.GET('/v1/days/{day}/suggestions', { params: { path: { day } } })) : Promise.resolve(null),
        load(() => api.GET('/v1/days', { params: { query: { from: addDays(today, -(foodParams.dayStripDays - 1)), to: today } } })),
        load(() => api.GET('/v1/meals', { params: { query: { from: addDays(today, -(foodParams.slotsUsedWindowDays - 1)), to: today } } })),
      ]);
      const suggestions = suggested !== null && suggested.state === 'ready' ? suggested.value : [];
      const summaries = days.state === 'ready' ? days.value.filter((entry) => entry.meals > 0) : [];
      // A dot means the day has a meal: the strip's read says so for every day, the day shown is told by the list the page shows.
      const loggedDays = new Set(summaries.map((entry) => entry.day));
      const summary = summaries.find((entry) => entry.day === day);
      const shownSlots = (shown.state === 'ready' ? shown.value : []).map((meal) => meal.slot);
      const logged = history.state === 'ready' ? history.value : [];
      const slots = usedSlots(logged, shownSlots);
      const patternDays = new Set(logged.map((meal) => localDay(new Date(meal.eatenAt)))).size;
      if (shown.state === 'consent') return { day, budget, targets, meals: null, mealsRead: false, offers: [], suggestions: [], summary, loggedDays, summaries, slots, patternDays };
      const mealsRead = shown.state === 'ready';
      const meals = dayMeals(mealsRead ? shown.value : null, local, day);
      if (mealsRead) {
        if (meals.length > 0) loggedDays.add(day);
        else loggedDays.delete(day);
      }
      // Without the day's list a slot already logged could be offered again.
      const offers = mealsRead && before.state === 'ready' ? repeatOffers(before.value, meals) : [];
      return { day, budget, targets, meals, mealsRead, offers, suggestions, summary, loggedDays, summaries, slots, patternDays };
    },
    [api, selected],
  );
  const { day: today, data, reload } = useReadOnFocus(read);
  return { today, day: selected ?? today, data, reload };
}
