/**
 * Steps, sleep and active energy from Apple Health (K-404, ADR-018 §2): the inputs a step day (K-220) and energy
 * availability (U13) are judged on, with no typing. Read only with both consents — Apple Health's to read, the health
 * data consent to keep (K-309 review: the Health permission can outlive a withdrawn health data consent) — so a
 * withdrawal of either stops it at the next read. One activity day per calendar day (PUT replaces that day's values),
 * sent only when its values changed since it was last taken, so a read over the whole window costs a request or two.
 * Workouts logged in other apps reach the server as the active energy they burned; as sessions of their own they wait
 * for a product answer (DURUM question 37).
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { localDay } from '@/today/today';
import type { KeyValue } from '@/units/preference';

import type { HealthAccess, HealthSleep } from './health';
import { healthParams } from './params';

type ActivityDay = components['schemas']['ActivityDay'];

const DAY_MS = 24 * 3600 * 1000;
const MINUTE_MS = 60 * 1000;
const SENT = 'health.activityDaysSent';
export const HEALTH_ACTIVITY_READ_DAYS = healthParams.activityReadDays;

/**
 * Minutes asleep per calendar day — the day one wakes up, so a night that crosses midnight is one night. Records that
 * overlap (a watch and a phone both recorded the night) are merged first, so no minute counts twice; in bed and awake
 * are not sleep.
 */
export function sleepMinutesByDay(records: HealthSleep[]): Record<string, number> {
  const asleep = records
    .filter((record) => record.asleep)
    .map((record) => ({ start: Date.parse(record.start), end: Date.parse(record.end) }))
    .filter((span) => span.end > span.start)
    .sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const span of asleep) {
    const last = merged.at(-1);
    if (last !== undefined && span.start <= last.end) last.end = Math.max(last.end, span.end);
    else merged.push({ ...span });
  }
  const minutes: Record<string, number> = {};
  for (const span of merged) {
    const day = localDay(new Date(span.end));
    minutes[day] = (minutes[day] ?? 0) + Math.round((span.end - span.start) / MINUTE_MS);
  }
  return minutes;
}

type Deps = {
  health: HealthAccess;
  api: Pick<ApiClient, 'PUT'>;
  kv: KeyValue;
  /** Both consents given now: HEALTH_DATA and APPLE_HEALTH. */
  consented: () => Promise<boolean>;
  now: Date;
};

/** Sends the window's activity days that changed; answers today's steps as Health counts them (null when not read). */
export async function syncActivityDays({ health, api, kv, consented, now }: Deps): Promise<{ stepsToday: number | null }> {
  if (!health.available || !(await consented())) return { stepsToday: null };
  const from = new Date(now.getTime() - HEALTH_ACTIVITY_READ_DAYS * DAY_MS);
  const [totals, sleep] = await Promise.all([health.readDailyTotals(from, now), health.readSleep(from, now)]);

  const days = new Map<string, ActivityDay>();
  for (const total of totals) {
    const day: ActivityDay = { day: total.day };
    if (total.steps !== undefined) day.steps = Math.round(total.steps);
    if (total.activeEnergyKcal !== undefined) day.activeEnergyKcal = Math.round(total.activeEnergyKcal);
    days.set(total.day, day);
  }
  for (const [day, minutes] of Object.entries(sleepMinutesByDay(sleep))) {
    days.set(day, { ...(days.get(day) ?? { day }), sleepMinutes: minutes });
  }

  const sent = await readSent(kv);
  const oldest = localDay(from);
  const kept: Record<string, string> = Object.fromEntries(Object.entries(sent).filter(([day]) => day >= oldest));
  for (const day of [...days.values()].sort((a, b) => a.day.localeCompare(b.day))) {
    const values = JSON.stringify(day);
    if (kept[day.day] === values) continue;
    try {
      const answer = await api.PUT('/v1/activity-days', { body: day });
      if (answer.data !== undefined) kept[day.day] = values; // only what the server took counts as sent
    } catch {
      // No answer: the day is read and sent again next time.
    }
  }
  await kv.setItemAsync(SENT, JSON.stringify(kept));
  return { stepsToday: days.get(localDay(now))?.steps ?? null };
}

async function readSent(kv: KeyValue): Promise<Record<string, string>> {
  try {
    return JSON.parse((await kv.getItemAsync(SENT)) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * What was sent belongs to the account and to the consent: forgotten at sign-out, and when the health data consent is
 * withdrawn — the server deleted those days (K-231), so with the consent given again they are sent again.
 */
export async function forgetSentActivityDays(kv: KeyValue): Promise<void> {
  await kv.removeItemAsync(SENT);
}
