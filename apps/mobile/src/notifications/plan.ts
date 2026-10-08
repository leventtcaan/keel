/**
 * The reminders the phone schedules (K-410): three kinds and never a fourth (arastirma/04-faz3-urun.md §7.4, product
 * decision 29 Sep: the budget is kinds, not a weekly count). Pure — what is planned from what is known — so the slots are tested
 * without a phone; reminders.ts hands the plan to the device.
 *
 * 1. Training: each training day, the lead before the user's own usual time, in the user's own sentence (I1 F4, C2-C3).
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

export type PlanInput = {
  schedule: Schedule | null;
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

export function planReminders({ schedule, cue, lastOpened, now, muted, mutedUntil, restUntil, firstCall }: PlanInput): Reminder[] {
  if (muted && mutedUntil === null) return [];
  const plan: Reminder[] = [];
  // A state with a last day still on (K-518): every slot waits for it to end.
  const until = muted && mutedUntil !== null && mutedUntil >= dayOf(now) ? mutedUntil : null;
  // Training waits for the later of a week off and a state.
  const offUntil = [restUntil, until].filter((day): day is string => day !== null && day >= dayOf(now)).sort().at(-1) ?? null;

  if (schedule?.usualTrainingTime !== undefined) {
    const usual = minutesOf(schedule.usualTrainingTime);
    const title = t('reminders.training.title', { minutes: P.trainingLeadMinutes });
    const body = cue?.trim() || t('reminders.training.body');
    if (offUntil === null) {
      // In the week's order, so the plan reads Monday first whatever order the profile lists them in.
      for (const day of WEEKDAYS.filter((d) => schedule.trainingDays.includes(d))) {
        plan.push({ id: `training-${day}`, kind: 'training', when: weeklyAt(day, usual, P.trainingLeadMinutes), title, body });
      }
    } else {
      // A week off (ADR-037 › 51b) or a state (K-518): nothing until it ends — a weekly reminder cannot skip a week — then
      // the training days of the weeks after it, by date, so they come back with no open needed; the next open turns them
      // weekly again.
      for (const day of daysAfter(offUntil)) {
        if (!schedule.trainingDays.includes(WEEKDAYS[day.getDay()])) continue;
        // Minutes past midnight, the lead taken off: a negative count is the evening before (Date carries it over).
        const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, usual - P.trainingLeadMinutes);
        if (at > now) plan.push({ id: `training-${dayOf(day)}`, kind: 'training', when: { at }, title, body });
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
