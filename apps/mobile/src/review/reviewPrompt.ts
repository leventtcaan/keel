/**
 * Asking for an App Store rating (K-1254, ADR-095): only Apple's own prompt (App Store Review Guidelines 5.6.1: no custom
 * prompt, no reward, no "do you like it?" filter), only after a workout finish with a new best, and only once the person has
 * used the app: enough finished workouts, a week since first use, two weeks since the last request, never on a day the
 * paywall was opened. Apple then decides whether to show anything (at most three times in 365 days) and says nothing back.
 * What it remembers — counts and days — stays on the phone (V1-V3). The thresholds are data/parameters/review.json's (K2).
 */
import params from '../../../../data/parameters/review.json';

import { localDay } from '@/today/today';
import type { KeyValue } from '@/units/preference';

type Parameter = { key: string; value: unknown };
function param<T>(key: string): T {
  const found = (params.parameters as Parameter[]).find((p) => p.key === key);
  if (found === undefined) throw new Error(`review.json has no ${key}`);
  return found.value as T;
}

export const reviewParams = {
  minFinishedWorkouts: param<number>('review_min_finished_workouts'),
  minDaysSinceFirstUse: param<number>('review_min_days_since_first_use'),
  minDaysBetweenRequests: param<number>('review_min_days_between_requests'),
  /** The finish screen is seen first; the request never follows a tap (StoreKit). */
  promptDelayMs: param<number>('review_prompt_delay_ms'),
  /** Apple's write-review page, added to the App Store address for Settings' rate row. */
  writeReviewQuery: param<string>('review_write_query'),
};

const KEYS = {
  firstUse: 'review.firstUseDay',
  finished: 'review.finishedWorkouts',
  lastFinish: 'review.lastFinishedWorkout',
  lastAsked: 'review.lastAskedDay',
  paywall: 'review.paywallDay',
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;
/** Whole days from one calendar day to another (read as dates only: no time zone moves them). */
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / DAY_MS);

export type ReviewPrompt = {
  /** A workout was finished (its end screen opened): counted once by its id. */
  noteFinish(workoutId: string): Promise<void>;
  /** The paywall was opened today: no rating is asked for on a day money was on the table. */
  notePaywall(): Promise<void>;
  /** After a finish: asks Apple for its prompt when everything allows it; true when it was asked. */
  maybeAsk(finish: { newBest: boolean }): Promise<boolean>;
  /** At sign-out: the counts are this account's; the next person starts afresh. */
  forget(): Promise<void>;
};

/** Where there is no prompt (tests, a build without it): asking throws, so nothing is counted as asked. */
export const noStoreReview = async (): Promise<void> => {
  throw Object.assign(new Error('no rating prompt here'), { name: 'StoreReviewUnavailable' });
};

/** `ask` is Apple's prompt (expo-store-review on the phone); it throws where there is none (TestFlight, Expo Go). */
export async function createReviewPrompt({ kv, now = () => new Date(), ask }: { kv: KeyValue; now?: () => Date; ask: () => Promise<void> }): Promise<ReviewPrompt> {
  const today = () => localDay(now());
  if ((await kv.getItemAsync(KEYS.firstUse)) === null) await kv.setItemAsync(KEYS.firstUse, today());

  return {
    noteFinish: async (workoutId) => {
      if ((await kv.getItemAsync(KEYS.lastFinish)) === workoutId) return;
      const count = Number((await kv.getItemAsync(KEYS.finished)) ?? '0') + 1;
      await kv.setItemAsync(KEYS.finished, String(count));
      await kv.setItemAsync(KEYS.lastFinish, workoutId);
    },
    notePaywall: async () => kv.setItemAsync(KEYS.paywall, today()),
    maybeAsk: async ({ newBest }) => {
      if (!newBest) return false;
      const day = today();
      const [firstUse, finished, lastAsked, paywall] = await Promise.all([KEYS.firstUse, KEYS.finished, KEYS.lastAsked, KEYS.paywall].map((key) => kv.getItemAsync(key)));
      if (Number(finished ?? '0') < reviewParams.minFinishedWorkouts) return false;
      if (firstUse === null || daysBetween(firstUse, day) < reviewParams.minDaysSinceFirstUse) return false;
      if (lastAsked !== null && daysBetween(lastAsked, day) < reviewParams.minDaysBetweenRequests) return false;
      if (paywall === day) return false;
      try {
        await ask();
      } catch {
        // No prompt here (TestFlight, Expo Go): nothing was asked, so nothing is counted.
        return false;
      }
      await kv.setItemAsync(KEYS.lastAsked, day);
      return true;
    },
    forget: async () => {
      await Promise.all(Object.values(KEYS).map((key) => kv.removeItemAsync(key)));
    },
  };
}
