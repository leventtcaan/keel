/**
 * The reminders the phone schedules (K-410): three kinds and never a fourth (arastirma/04-faz3-urun.md §7.4, product
 * decision 29 Sep: the budget is kinds, not a weekly count). Pure — what is planned from what is known — so the slots are tested
 * without a phone; reminders.ts hands the plan to the device.
 *
 * 1. Training: each training day of the PROGRAM (ADR-090 Ek 1: the program is where the days are made; the profile's list is only
 *    what is used before the program has been read), the lead before the user's own usual time (a default when they gave none:
 *    onboarding no longer asks, ADR-072 #4), in the user's own sentence (I1 F4, C2-C3). On the
 *    block's training days before the check-in day, while the week's weigh-ins are behind and still reachable, one more line
 *    (ADR-089 Ek 2): the weigh-in count rides this reminder, it is no fourth kind (ADR-036).
 * 2. Check-in: the check-in day, in the morning (I1 F4, D1).
 * 3. Quiet: once, a quiet spell after the app was last opened, framed in self-compassion (I1 F4, C6; U7: no blame).
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';

import { notificationParams as P } from './params';

export type Schedule = components['schemas']['Schedule'];
export type ReminderKind = 'training' | 'check_in' | 'quiet';
/** Weekly: the phone's calendar, weekday 1 = Sunday … 7 = Saturday (expo-notifications' WeeklyTriggerInput). Once: a moment. */
export type ReminderTime = { weekday: number; hour: number; minute: number } | { at: Date };
export type Reminder = { id: string; kind: ReminderKind; when: ReminderTime; title: string; body: string };
/**
 * Where the first call stands (K-992, ADR-077 Ek 2), from the server's FirstWeeks: its day still to come (`firstCallOn`);
 * `weekly`, made or the first weeks over (and what an account kept nothing of before K-992 counts as); `off`, no calls at
 * all (no health data consent).
 */
export type FirstCall = { on: string } | 'weekly' | 'off';

/**
 * The week's weigh-ins as the server counted them (FirstWeeks.weighInWeek, ADR-089), as much as the plan reads: the block
 * (`from`..`to`, `to` the check-in day), the days weighed in it, the count needed, and whether the block can no longer
 * reach it (the server gave `callsFrom`). Kept on the phone from the last read.
 */
export type WeighInFacts = { from: string; to: string; weighed: number; needed: number; short: boolean };

/** The facts the plan keeps of a FirstWeeks.weighInWeek: its count of days weighed inside the block, and whether it is short. */
export function weighInFactsOf(week: components['schemas']['WeighInWeek']): WeighInFacts {
  const weighed = week.weighedDays.filter((day) => day >= week.from && day <= week.to).length;
  return { from: week.from, to: week.to, weighed, needed: week.needed, short: week.callsFrom !== undefined };
}

export type PlanInput = {
  schedule: Schedule | null;
  /**
   * The weekdays the program trains on, as last read (ADR-090 Ek 1): the training days of the plan. None known, or a program
   * with no day on a weekday: the schedule's own list.
   */
  programDays?: Schedule['trainingDays'] | null;
  /** The user's own routine sentence, kept on the phone; blank means none. */
  cue: string | null;
  lastOpened: Date | null;
  now: Date;
  /** A declared state (sick, exams — K-516) silences every slot. */
  muted: boolean;
  /**
   * Its last day, when it has one (K-518): nothing until it ends, then the training days and the check-in mornings of the
   * weeks after it by date, so they come back with no open needed — as after a week off. Null: until the user is back.
   */
  mutedUntil: string | null;
  /** A week off in force (Program.restUntil, a calendar day): no training reminder until it ends (ADR-037 › 51b). */
  restUntil: string | null;
  firstCall: FirstCall;
  /** The week's weigh-ins, while no call has read the scale (ADR-089 Ek 2); none or absent: no line. */
  weighInWeek?: WeighInFacts | null;
};

const WEEKDAYS: Schedule['checkInDay'][] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const MINUTES_A_DAY = 24 * 60;
const MINUTES_A_WEEK = 7 * MINUTES_A_DAY;

/** "HH:mm" as minutes after midnight; the contract's pattern (Schedule.usualTrainingTime) guarantees the shape. */
function minutesOf(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

/** A weekday and a minute of that day, moved back by some minutes — across midnight, and Sunday into Saturday. */
function weeklyAt(day: Schedule['checkInDay'], minuteOfDay: number, earlier = 0): ReminderTime {
  const ofWeek = (((WEEKDAYS.indexOf(day) * MINUTES_A_DAY + minuteOfDay - earlier) % MINUTES_A_WEEK) + MINUTES_A_WEEK) % MINUTES_A_WEEK;
  const inDay = ofWeek % MINUTES_A_DAY;
  return { weekday: Math.floor(ofWeek / MINUTES_A_DAY) + 1, hour: Math.floor(inDay / 60), minute: inDay % 60 };
}

/** The phone's calendar day of a moment, as the API writes a day. */
const dayOf = (moment: Date) =>
  `${moment.getFullYear()}-${String(moment.getMonth() + 1).padStart(2, '0')}-${String(moment.getDate()).padStart(2, '0')}`;

/** The days after a calendar day, for the weeks the reminders come back by date (rest_resume_weeks). */
function daysAfter(day: string): Date[] {
  const [year, month, date] = day.split('-').map(Number);
  return Array.from({ length: P.restResumeWeeks * 7 }, (_, i) => new Date(year, month - 1, date + i + 1));
}

/** The calendar day before one, so a day itself can start the dated weeks (daysAfter counts from the day after). */
function dayBefore(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  return dayOf(new Date(year, month - 1, date - 1));
}

const DAY_MS = 24 * 60 * 60 * 1000;
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

/**
 * The weigh-in line for a training day (ADR-089 Ek 2), or none: the block is behind and, with every morning from that day
 * to the check-in day weighed, still reachable. The day is inside the block and before the check-in day; a short week,
 * enough, or no calls at all say nothing. The count is the server's; only the mornings left are counted here.
 */
function weighInLine(facts: PlanInput['weighInWeek'], firstCall: FirstCall, day: string): string | null {
  if (facts == null || facts.short || firstCall === 'off') return null;
  const missing = facts.needed - facts.weighed;
  if (missing <= 0 || day < facts.from || day >= facts.to) return null;
  // That day's morning and every one after it up to the check-in day.
  if (missing > daysBetween(day, facts.to) + 1) return null;
  const weekday = WEEKDAYS[new Date(`${facts.to}T00:00:00Z`).getUTCDay()];
  return t(missing === 1 ? 'reminders.training.weighIns.one' : 'reminders.training.weighIns.other', { count: missing, day: t(`onboarding.schedule.dayName.${weekday}`) });
}

export function planReminders({ schedule: kept, programDays, cue, lastOpened, now, muted, mutedUntil, restUntil, firstCall, weighInWeek }: PlanInput): Reminder[] {
  // The program's weekdays are the training days (one source, ADR-090 Ek 1); the schedule keeps the rest (check-in day, time).
  const schedule: Schedule | null = kept === null ? null : { ...kept, trainingDays: programDays != null && programDays.length > 0 ? programDays : kept.trainingDays };
  if (muted && mutedUntil === null) return [];
  const plan: Reminder[] = [];
  // A state with a last day still on (K-518): every slot waits for it to end.
  const until = muted && mutedUntil !== null && mutedUntil >= dayOf(now) ? mutedUntil : null;
  // Training waits for the later of a week off and a state.
  const offUntil = [restUntil, until].filter((day): day is string => day !== null && day >= dayOf(now)).sort().at(-1) ?? null;

  if (schedule !== null) {
    // The time the user gave, else the default one: no training reminder was ever planned for a new user without it (K-1060).
    const usual = minutesOf(schedule.usualTrainingTime ?? P.defaultTrainingTime);
    const title = t('reminders.training.title', { minutes: P.trainingLeadMinutes });
    const body = cue?.trim() || t('reminders.training.body');
    // The training days that carry the weigh-in line (ADR-089 Ek 2): a weekly reminder repeats its words every week, so
    // while one of the days ahead carries the line the days are planned by date, from today, and the next open (after the
    // week's weigh-ins are enough, or the block is over) turns them weekly again.
    const today = dayOf(now);
    const timeOf = (day: Date) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, usual - P.trainingLeadMinutes);
    const lines = daysAfter(dayBefore(today)).some(
      (day) => schedule.trainingDays.includes(WEEKDAYS[day.getDay()]) && timeOf(day) > now && weighInLine(weighInWeek, firstCall, dayOf(day)) !== null,
    );
    if (offUntil === null && !lines) {
      // In the week's order, so the plan reads Monday first whatever order the profile lists them in.
      for (const day of WEEKDAYS.filter((d) => schedule.trainingDays.includes(d))) {
        plan.push({ id: `training-${day}`, kind: 'training', when: weeklyAt(day, usual, P.trainingLeadMinutes), title, body });
      }
    } else {
      // A week off (ADR-037 › 51b) or a state (K-518): nothing until it ends — a weekly reminder cannot skip a week — then
      // the training days of the weeks after it, by date, so they come back with no open needed; the next open turns them
      // weekly again.
      for (const day of daysAfter(offUntil ?? dayBefore(today))) {
        if (!schedule.trainingDays.includes(WEEKDAYS[day.getDay()])) continue;
        // Minutes past midnight, the lead taken off: a negative count is the evening before (Date carries it over).
        const at = timeOf(day);
        const line = weighInLine(weighInWeek, firstCall, dayOf(day));
        if (at > now) plan.push({ id: `training-${dayOf(day)}`, kind: 'training', when: { at }, title, body: line === null ? body : `${body}\n${line}` });
      }
    }
  }

  // The first call's day still to come (K-992): a weekly morning would ring on a check-in day the server opens no check-in
  // on, so the mornings from that day are planned by date and the next open after it turns them weekly. No calls, none.
  const firstOn = typeof firstCall === 'object' && firstCall.on > dayOf(now) ? dayBefore(firstCall.on) : null;
  // The mornings by date start after the later of a state and the day before the first call.
  const checkInAfter = [until, firstOn].filter((day): day is string => day !== null).sort().at(-1) ?? null;
  if (schedule === null || firstCall === 'off') {
    // Nothing to plan a check-in on.
  } else if (checkInAfter === null) {
    const when = weeklyAt(schedule.checkInDay, minutesOf(P.checkInTime));
    plan.push({ id: 'check-in', kind: 'check_in', when, title: t('reminders.checkIn.title'), body: t('reminders.checkIn.body') });
  } else {
    // The check-in mornings after a state (K-518) or from the first call's day (K-992), by date.
    for (const day of daysAfter(checkInAfter).filter((d) => WEEKDAYS[d.getDay()] === schedule.checkInDay)) {
      const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutesOf(P.checkInTime));
      plan.push({ id: `check-in-${dayOf(day)}`, kind: 'check_in', when: { at }, title: t('reminders.checkIn.title'), body: t('reminders.checkIn.body') });
    }
  }

  if (lastOpened !== null) {
    // The calendar's days, not 7 × 24 hours: across a clock change the message keeps the time of day it was opened at.
    const at = new Date(lastOpened);
    at.setDate(at.getDate() + P.quietDays);
    // Already past: this spell's message was due (and went, if it could). One per spell — the next open starts another.
    // Not inside a state still on: the user said why the app is quiet (K-518).
    if (at > now && (until === null || dayOf(at) > until)) {
      plan.push({ id: 'quiet', kind: 'quiet', when: { at }, title: t('reminders.quiet.title'), body: t('reminders.quiet.body') });
    }
  }

  return plan;
}
