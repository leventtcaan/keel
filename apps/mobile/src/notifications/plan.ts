/**
 * The reminders the phone schedules (K-410): three kinds and never a fourth (arastirma/04-faz3-urun.md §7.4, Levent
 * 29 Sep: the budget is kinds, not a weekly count). Pure — what is planned from what is known — so the slots are tested
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

export type PlanInput = {
  schedule: Schedule | null;
  /** The user's own routine sentence, kept on the phone; blank means none. */
  cue: string | null;
  lastOpened: Date | null;
  now: Date;
  /** A declared state (sick, exams — K-516) silences every slot. */
  muted: boolean;
  /** A week off in force (Program.restUntil, a calendar day): no training reminder until it ends (ADR-037 › 51b). */
  restUntil: string | null;
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

export function planReminders({ schedule, cue, lastOpened, now, muted, restUntil }: PlanInput): Reminder[] {
  if (muted) return [];
  const plan: Reminder[] = [];

  if (schedule?.usualTrainingTime !== undefined) {
    const usual = minutesOf(schedule.usualTrainingTime);
    const title = t('reminders.training.title', { minutes: P.trainingLeadMinutes });
    const body = cue?.trim() || t('reminders.training.body');
    if (restUntil === null || restUntil < dayOf(now)) {
      // In the week's order, so the plan reads Monday first whatever order the profile lists them in.
      for (const day of WEEKDAYS.filter((d) => schedule.trainingDays.includes(d))) {
        plan.push({ id: `training-${day}`, kind: 'training', when: weeklyAt(day, usual, P.trainingLeadMinutes), title, body });
      }
    } else {
      // A week off (ADR-037 › 51b): nothing until it ends — a weekly reminder cannot skip a week — then the training days of
      // the weeks after it, by date, so they come back with no open needed; the next open turns them weekly again.
      const [year, month, date] = restUntil.split('-').map(Number);
      for (let after = 1; after <= P.restResumeWeeks * 7; after++) {
        const day = new Date(year, month - 1, date + after);
        if (!schedule.trainingDays.includes(WEEKDAYS[day.getDay()])) continue;
        // Minutes past midnight, the lead taken off: a negative count is the evening before (Date carries it over).
        const at = new Date(year, month - 1, date + after, 0, usual - P.trainingLeadMinutes);
        if (at > now) plan.push({ id: `training-${dayOf(day)}`, kind: 'training', when: { at }, title, body });
      }
    }
  }

  if (schedule !== null) {
    const when = weeklyAt(schedule.checkInDay, minutesOf(P.checkInTime));
    plan.push({ id: 'check-in', kind: 'check_in', when, title: t('reminders.checkIn.title'), body: t('reminders.checkIn.body') });
  }

  if (lastOpened !== null) {
    // The calendar's days, not 7 × 24 hours: across a clock change the message keeps the time of day it was opened at.
    const at = new Date(lastOpened);
    at.setDate(at.getDate() + P.quietDays);
    // Already past: this spell's message was due (and went, if it could). One per spell — the next open starts another.
    if (at > now) plan.push({ id: 'quiet', kind: 'quiet', when: { at }, title: t('reminders.quiet.title'), body: t('reminders.quiet.body') });
  }

  return plan;
}
