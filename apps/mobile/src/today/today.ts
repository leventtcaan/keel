/**
 * What the Today screen reads (K-401): each part from its own endpoint, each with its own state, so a part that is not
 * there yet — or behind the health data consent — never blanks the others. Nothing here decides or counts what the
 * server does (the consistency, K-420; the call, K-212): this only reads, picks today's day out of the program, and
 * finds the words for what the server said.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { has } from '@/copy';
import type { ActiveWorkout } from '@/train/workout';

import type { Done, TodayParts } from './todayWorkout';

type Schemas = components['schemas'];

/**
 * ready · none yet (404) · the health data consent is needed (403 CONSENT_REQUIRED) · a subscription is needed (403
 * ENTITLEMENT_REQUIRED, K-703: the way to the plans, K-702) · failed, by name only (V3).
 */
export type Loaded<T> =
  | { state: 'ready'; value: T }
  | { state: 'none' }
  | { state: 'consent' }
  | { state: 'subscription' }
  | { state: 'failed'; problem: 'NoConnection' | 'ServerError' };

export type TodayData = {
  consistency: Loaded<Schemas['Consistency']>;
  decision: Loaded<Schemas['Decision']>;
  program: Loaded<Schemas['Program']>;
  weighIns: Loaded<Schemas['WeighIn'][]>;
  targets: Loaded<Schemas['Targets']>;
  /** What is left of today's food (K-409). */
  budget: Loaded<Schemas['DayBudget']>;
  /** Today's steps as Apple Health counts them, read on the phone (K-404); null when Health was not read. */
  stepsToday?: number | null;
  /** This week's check-in (K-501): offered on Today until it is answered. */
  checkIn?: Loaded<Schemas['CheckIn']>;
  /** A state the user declared, in force today (K-518): the week is paused. */
  state?: Loaded<Schemas['DeclaredState']>;
  /** The coach's own questions not answered yet (K-520). */
  prompts?: Loaded<Schemas['Prompt'][]>;
  /** The first eight weeks (K-521): this week's words and the risk's signals. */
  firstWeeks?: Loaded<Schemas['FirstWeeks']>;
  /** The day the app was opened before today, kept on the phone only (K-521); null the first time. */
  previousOpen?: string | null;
  /** This week as the server counts it (K-969): its Monday, and its workouts and weigh-ins from then to today. */
  monday?: string;
  week?: { workouts: Loaded<Schemas['Workout'][]>; weighIns: Loaded<Schemas['WeighIn'][]> };
  /** Today's workout (K-969): one under way on this phone, one finished today, and what its card needs. */
  active?: ActiveWorkout | null;
  doneToday?: Done | null;
  todayParts?: TodayParts;
};

type Answer<T> = { data?: T; error?: { code?: string }; response: Response };

export async function load<T>(request: () => Promise<Answer<T>>): Promise<Loaded<T>> {
  let answer: Answer<T>;
  try {
    answer = await request();
  } catch {
    return { state: 'failed', problem: 'NoConnection' };
  }
  if (answer.data !== undefined) return { state: 'ready', value: answer.data };
  if (answer.response.status === 404) return { state: 'none' };
  if (answer.response.status === 403 && answer.error?.code === 'CONSENT_REQUIRED') return { state: 'consent' };
  if (answer.response.status === 403 && answer.error?.code === 'ENTITLEMENT_REQUIRED') return { state: 'subscription' };
  return { state: 'failed', problem: 'ServerError' };
}

/** Every part at once; `day` is today on the phone's calendar (YYYY-MM-DD). */
export async function loadToday(api: ApiClient, day: string): Promise<TodayData> {
  const [consistency, decision, program, weighIns, targets, budget, checkIn, state, prompts, firstWeeks] = await Promise.all([
    load(() => api.GET('/v1/consistency')),
    load(() => api.GET('/v1/decisions/current')),
    load(() => api.GET('/v1/program')),
    load(() => api.GET('/v1/weigh-ins', { params: { query: { from: day, to: day } } })),
    load(() => api.GET('/v1/targets')),
    load(() => api.GET('/v1/days/{day}/budget', { params: { path: { day } } })),
    load(() => api.GET('/v1/check-ins/current')),
    load(() => api.GET('/v1/state')),
    load(() => api.GET('/v1/prompts')),
    load(() => api.GET('/v1/first-weeks')),
  ]);
  return { consistency, decision, program, weighIns, targets, budget, checkIn, state, prompts, firstWeeks };
}

// "Mon, Sep 28": a calendar day with its weekday, in English like every word of the app, read as a date only.
const WEEKDAY_DATE = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

export function weekdayDate(day: string): string {
  return WEEKDAY_DATE.format(new Date(`${day}T00:00:00Z`));
}

/** Today on the phone's calendar, as the API writes a day. */
export function localDay(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;

/** The weekday of a calendar day, read as a date only (no time zone can move it). */
function weekdayOf(day: string): (typeof WEEKDAYS)[number] {
  return WEEKDAYS[new Date(`${day}T00:00:00Z`).getUTCDay()];
}

export type ProgramToday = { kind: 'session'; day: Schemas['ProgramDay'] } | { kind: 'rest' } | { kind: 'restWeek' };

/** Today's session from the program as the server set it this week; a week off (restUntil, K-217) comes first. */
export function programToday(program: Schemas['Program'], day: string): ProgramToday {
  if (program.restUntil !== undefined && day <= program.restUntil) return { kind: 'restWeek' };
  const session = program.days.find((d) => d.weekday === weekdayOf(day));
  return session === undefined ? { kind: 'rest' } : { kind: 'session', day: session };
}

/** The action's label: "decision.<action>.<rule>" → "decision.<action>.label". */
export function labelKey(copyKey: string): string {
  return `${copyKey.split('.').slice(0, 2).join('.')}.label`;
}

export type ReasonLine = { sentenceKey: string | null; tag: Schemas['SourceTag'] };

/**
 * "Why this call" (U14, K-522): each reason in its own sentence ("decision.rule.<rule>" — the leading one too, in words
 * other than the call's title), and always the kind of source it rests on. A safety call says nothing of why (ADR-028
 * #24): its kinds of source only. The research file itself stays on the server: a path means nothing on a phone.
 */
export function reasonLines(decision: Schemas['Decision']): ReasonLine[] {
  return decision.reasons.map((reason) => {
    const key = `decision.rule.${reason.rule}`;
    return { sentenceKey: decision.safety !== true && has(key) ? key : null, tag: reason.source.tag };
  });
}

/**
 * The coach's chips, from the day's data (prototype 2.1): about the call when there is one, about the session when
 * there is one today, about the scale when today has no weigh-in yet. Never empty: the coach always has a way in.
 */
export function chips(today: TodayData, day: string): string[] {
  const found: string[] = [];
  if (today.decision.state === 'ready') found.push('today.chips.why');
  if (today.program.state === 'ready' && programToday(today.program.value, day).kind === 'session') found.push('today.chips.swap');
  if (today.weighIns.state === 'ready' && today.weighIns.value.length === 0) found.push('today.chips.weighIn');
  return found.length === 0 ? ['today.chips.start'] : found;
}
