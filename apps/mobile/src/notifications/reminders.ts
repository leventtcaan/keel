/**
 * The reminders on the phone (K-410, ADR-036). Local notifications only: nothing goes to a server and no push token
 * exists. Off until the user turns them on and iOS allows them. From then on, every change — the schedule the profile
 * brings, the user's own sentence, the app opened — replaces everything scheduled with a fresh plan (plan.ts), one
 * change at a time, so a slow phone can never leave an older plan on top of a newer one.
 *
 * What is kept (expo-sqlite/kv-store, on the phone): on/off, the user's sentence, the last known schedule and when the
 * app was last opened. All of it belongs to the account and goes with a sign-out.
 */
import type { KeyValue } from '@/units/preference';

import { notificationParams as P } from './params';
import type { MealRhythm } from './mealRhythm';
import { type FirstCall, type Reminder, type ReminderKind, type Schedule, type WalkNudgeFacts, type WeighInFacts, dayOf, minutesOf, planReminders } from './plan';

/** What iOS answers about notifications: allowed or not, and whether its sheet can still be shown. */
export type NotificationPermission = { granted: boolean; canAskAgain: boolean };

/** The phone's notifications; the screens and this service never see the library (notificationAccess.ts). */
export type NotificationAccess = {
  permission(): Promise<NotificationPermission>;
  /** Shows iOS's permission sheet when it still can; the answer either way. */
  request(): Promise<NotificationPermission>;
  /** Everything this app scheduled is replaced by these. */
  replace(reminders: Reminder[]): Promise<void>;
  clear(): Promise<void>;
};

/**
 * `walkOn`: the evening walk nudge (K-1216) the user switched on; absent, it is off.
 * `only`: one kind alone, turned on that way (the plan's Monday morning switch, K-967); absent, all four. `mealsOff`: the meal reminder
 * (ADR-090 #2) switched off on its own; absent, it follows the rest. `noCalls`: the
 * server makes no calls (no health data consent, K-992), so no check-in morning is planned whatever is on.
 */
export type ReminderSettings = { enabled: boolean; cue: string; only?: ReminderKind; noCalls?: true; mealsOff?: true; walkOn?: true };

type Options = {
  kv: KeyValue;
  access: NotificationAccess;
  now: () => Date;
  /** By name only, like the queue's (V3): a message could quote the user's sentence. */
  report: (problem: { name: string }) => void;
  /** A declared state silences the reminders (K-516 plugs it in; until then nothing is declared). */
  muted?: () => Promise<boolean>;
  /** Its last day, if it has one (K-518): the slots after it are planned by date, so they return with no open needed. */
  mutedUntil?: () => Promise<string | null>;
  /** The evening walk nudge (K-1216), a fifth kind: the parameter's flag, OFF as shipped. */
  walkNudge?: boolean;
};

const KEY = {
  enabled: 'reminders.enabled',
  cue: 'reminders.cue',
  only: 'reminders.only',
  schedule: 'reminders.schedule',
  programDays: 'reminders.programDays',
  lastOpened: 'reminders.lastOpened',
  restUntil: 'reminders.restUntil',
  firstCall: 'reminders.firstCall',
  weighIns: 'reminders.weighIns',
  meals: 'reminders.meals',
  mealsOff: 'reminders.mealsOff',
  walkNudge: 'reminders.walkNudge',
  walkOn: 'reminders.walkOn',
  walkToday: 'reminders.walkToday',
};
const ON = 'on';

/** A schedule kept by an earlier run; anything that is not one counts as none. */
function scheduleOf(kept: string | null): Schedule | null {
  if (kept === null) return null;
  try {
    const value = JSON.parse(kept) as Partial<Schedule> | null;
    return value !== null && Array.isArray(value.trainingDays) && typeof value.checkInDay === 'string' ? (value as Schedule) : null;
  } catch {
    return null;
  }
}

/** The program's weekdays kept by an earlier run; anything that is not a list of them counts as none known. */
function programDaysOf(kept: string | null): Schedule['trainingDays'] | null {
  if (kept === null) return null;
  try {
    const value = JSON.parse(kept) as unknown;
    return Array.isArray(value) && value.every((day) => typeof day === 'string') ? (value as Schedule['trainingDays']) : null;
  } catch {
    return null;
  }
}

/** Kept as `off`, `weekly` or the day; nothing kept (or anything else) is weekly, as every account was before K-992. */
function firstCallOf(kept: string | null): FirstCall {
  if (kept === 'off') return 'off';
  return kept !== null && /^\d{4}-\d{2}-\d{2}$/.test(kept) ? { on: kept } : 'weekly';
}
const keptFirstCall = (firstCall: FirstCall) => (typeof firstCall === 'object' ? firstCall.on : firstCall);

/** The week's weigh-in facts kept by an earlier run; anything that is not them counts as none. */
function weighInsOf(kept: string | null): WeighInFacts | null {
  if (kept === null) return null;
  try {
    const v = JSON.parse(kept) as Partial<WeighInFacts> | null;
    const ok =
      v !== null && typeof v.from === 'string' && typeof v.to === 'string' && typeof v.weighed === 'number' && typeof v.needed === 'number' && typeof v.short === 'boolean';
    return ok ? (v as WeighInFacts) : null;
  } catch {
    return null;
  }
}

/** The meal rhythm kept by an earlier run; anything that is not one counts as none. */
function rhythmOf(kept: string | null): MealRhythm | null {
  if (kept === null) return null;
  try {
    const v = JSON.parse(kept) as Partial<MealRhythm> | null;
    return v !== null && typeof v.day === 'string' && Array.isArray(v.slots) && Array.isArray(v.loggedToday) ? (v as MealRhythm) : null;
  } catch {
    return null;
  }
}

/** The walk nudge's facts kept by an earlier run; anything that is not them counts as none. */
function walkNudgeOf(kept: string | null): WalkNudgeFacts | null {
  if (kept === null) return null;
  try {
    const v = JSON.parse(kept) as Partial<WalkNudgeFacts> | null;
    return v !== null && typeof v.day === 'string' && typeof v.remaining === 'number' && typeof v.body === 'string' ? (v as WalkNudgeFacts) : null;
  } catch {
    return null;
  }
}

function dateOf(kept: string | null): Date | null {
  const date = kept === null ? null : new Date(kept);
  return date !== null && !Number.isNaN(date.getTime()) ? date : null;
}

export type Reminders = Awaited<ReturnType<typeof createReminders>>;

export async function createReminders({ kv, access, now, report, muted = async () => false, mutedUntil = async () => null, walkNudge = P.walkNudgeEnabled }: Options) {
  const keptOnly = await kv.getItemAsync(KEY.only);
  let settings: ReminderSettings = {
    enabled: (await kv.getItemAsync(KEY.enabled)) === ON,
    cue: (await kv.getItemAsync(KEY.cue)) ?? '',
    ...(keptOnly === 'check_in' ? { only: keptOnly } : {}),
    ...(firstCallOf(await kv.getItemAsync(KEY.firstCall)) === 'off' ? { noCalls: true as const } : {}),
    ...((await kv.getItemAsync(KEY.mealsOff)) === ON ? { mealsOff: true as const } : {}),
    ...((await kv.getItemAsync(KEY.walkOn)) === ON ? { walkOn: true as const } : {}),
  };
  const listeners = new Set<() => void>();

  function become(next: ReminderSettings) {
    settings = next;
    listeners.forEach((listener) => listener());
  }

  // Bumped by a sign-out. The chain runs in order, so a step queued before the sign-out's clearing runs before it and is
  // cleared; what can still land late is what waits outside the chain (iOS's sheet in turnOn) and a step's own `become`
  // after a sign-out reset the settings mid-step (the same guard as the session's, K-311).
  let generation = 0;

  const reportError = (error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' });

  // Every change waits for the one before it: a step's failure is reported and does not stop the next. The user's own
  // changes (on, off, the sentence) also reach the caller when they could not be kept, so the screen can say so; the
  // phone failing to schedule is only reported — the next open tries again.
  let chain: Promise<void> = Promise.resolve();
  function inTurn(step: () => Promise<void>, { rethrow = false } = {}): Promise<void> {
    const run = chain.then(step);
    const settled = run.catch(reportError);
    chain = settled;
    return rethrow ? run : settled;
  }
  const quietly = (scheduling: Promise<void>) => scheduling.catch(reportError);

  /** The coach's "Add to plan" (K-1236): the walk nudge for this one day, kept as the day it was asked for. */
  const walkPlannedToday = async () => (await kv.getItemAsync(KEY.walkToday)) === dayOf(now());

  /** The facts Today kept for the walk nudge, when they are today's; none while the kind is removed (the flag). */
  async function todaysWalk(): Promise<WalkNudgeFacts | null> {
    if (!walkNudge) return null;
    const facts = walkNudgeOf(await kv.getItemAsync(KEY.walkNudge));
    return facts !== null && facts.day === dayOf(now()) ? facts : null;
  }

  /** The plan as it stands now, or none when nothing may be planned (off, not allowed, a state with no last day). */
  async function planNow(): Promise<Reminder[] | null> {
    const silenced = settings.enabled && (await muted());
    const until = silenced ? await mutedUntil() : null;
    // A state with no last day says nothing of when to come back: nothing is planned until it ends.
    if (!settings.enabled || !(await access.permission()).granted || (silenced && until === null)) return null;
    const plan = planReminders({
      schedule: scheduleOf(await kv.getItemAsync(KEY.schedule)),
      programDays: programDaysOf(await kv.getItemAsync(KEY.programDays)),
      cue: settings.cue,
      lastOpened: dateOf(await kv.getItemAsync(KEY.lastOpened)),
      now: now(),
      muted: silenced,
      mutedUntil: until,
      restUntil: await kv.getItemAsync(KEY.restUntil),
      firstCall: firstCallOf(await kv.getItemAsync(KEY.firstCall)),
      weighInWeek: weighInsOf(await kv.getItemAsync(KEY.weighIns)),
      meals: rhythmOf(await kv.getItemAsync(KEY.meals)),
      mealsOff: settings.mealsOff === true,
      walkNudge: walkNudge && (settings.walkOn === true || (await walkPlannedToday())) ? walkNudgeOf(await kv.getItemAsync(KEY.walkNudge)) : null,
    });
    return settings.only === undefined ? plan : plan.filter((reminder) => reminder.kind === settings.only);
  }

  /** What should be scheduled now, from what is kept — read inside the turn, so the plan is never older than a change. */
  async function reschedule(): Promise<void> {
    const plan = await planNow();
    if (plan === null) await access.clear();
    else await access.replace(plan);
  }

  /** Whether today's walk is in what the phone will ring: what "set" and "planned" say (K-1236 review), never only what was asked. */
  const walkRings = async () => ((await planNow()) ?? []).some((reminder) => reminder.kind === 'walk');

  return {
    /** Synchronous, for rendering (useSyncExternalStore). */
    current: (): ReminderSettings => settings,

    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /** iOS's answer as it stands (the user may have changed it in iOS Settings). */
    permission: (): Promise<NotificationPermission> => access.permission(),

    /**
     * Asks iOS; allowed, they are on and scheduled — all three, or `only` one kind (the plan's Monday morning switch).
     * Refused, they stay off. The answer is returned for the screen.
     */
    turnOn: async ({ only }: { only?: 'check_in' } = {}): Promise<NotificationPermission> => {
      const startedIn = generation;
      const answer = await access.request();
      await inTurn(
        async () => {
          if (answer.granted && startedIn === generation) {
            await kv.setItemAsync(KEY.enabled, ON);
            await (only === undefined ? kv.removeItemAsync(KEY.only) : kv.setItemAsync(KEY.only, only));
            if (startedIn === generation) {
              const { only: _, ...rest } = settings;
              become({ ...rest, enabled: true, ...(only === undefined ? {} : { only }) });
            }
          }
          await quietly(reschedule());
        },
        { rethrow: true },
      );
      return answer;
    },

    turnOff: (): Promise<void> =>
      inTurn(
        async () => {
          await kv.removeItemAsync(KEY.enabled);
          await kv.removeItemAsync(KEY.only);
          const { only: _, ...rest } = settings;
          become({ ...rest, enabled: false });
          await quietly(reschedule());
        },
        { rethrow: true },
      ),

    /** The user's own routine sentence, the training reminder's words (I1 C3); blank removes it. */
    setCue: (text: string): Promise<void> => {
      const startedIn = generation;
      const cue = Array.from(text.trim()).slice(0, P.cueMaxChars).join('').trim();
      return inTurn(
        async () => {
          if (cue === '') await kv.removeItemAsync(KEY.cue);
          else await kv.setItemAsync(KEY.cue, cue);
          if (startedIn === generation) become({ ...settings, cue });
          await quietly(reschedule());
        },
        { rethrow: true },
      );
    },

    /** The schedule the server holds, kept whenever the profile is read or saved (training days, time, check-in day). */
    keepSchedule: (schedule: Schedule): Promise<void> =>
      inTurn(async () => {
        await kv.setItemAsync(KEY.schedule, JSON.stringify(schedule));
        await reschedule();
      }),

    /**
     * The weekdays the program trains on (ADR-090 Ek 1), kept whenever the program is read or changed: the training reminders go
     * by these, never by the profile's older list. Days on no weekday count for none; the same days again change nothing.
     * `era` as keepRestUntil's.
     */
    keepProgramDays: (days: Schedule['trainingDays'], era: number = generation): Promise<void> =>
      inTurn(async () => {
        if (era !== generation) return;
        const kept = JSON.stringify([...days].sort());
        if ((await kv.getItemAsync(KEY.programDays)) === kept) return;
        await kv.setItemAsync(KEY.programDays, kept);
        await reschedule();
      }),

    /** The account's era: taken when a read begins, so what it brings back is dropped if the account left meanwhile. */
    era: (): number => generation,

    /**
     * A week off as the program has it (Program.restUntil, ADR-037 › 51b), kept whenever the program is read — on Today,
     * and wherever the training copy is read (the Train tab, the session, a move's screens). Training reminders stop
     * until it ends; null, none. `era`: when the read began — a read that began for the account that left is dropped.
     * The same day again changes nothing (no rebuild).
     */
    keepRestUntil: (day: string | null, era: number = generation): Promise<void> =>
      inTurn(async () => {
        if (era !== generation) return;
        if ((await kv.getItemAsync(KEY.restUntil)) === day) return;
        if (day === null) await kv.removeItemAsync(KEY.restUntil);
        else await kv.setItemAsync(KEY.restUntil, day);
        await reschedule();
      }),

    /**
     * Where the first call stands (K-992), kept whenever the server's FirstWeeks is read — the plan at onboarding's end and
     * Today: no check-in morning before its day. `era` as keepRestUntil's; the same answer again changes nothing.
     */
    keepFirstCall: (firstCall: FirstCall, era: number = generation): Promise<void> =>
      inTurn(async () => {
        if (era !== generation) return;
        const kept = keptFirstCall(firstCall);
        if ((await kv.getItemAsync(KEY.firstCall)) === kept) return;
        await kv.setItemAsync(KEY.firstCall, kept);
        const { noCalls: _, ...rest } = settings;
        become({ ...rest, ...(firstCall === 'off' ? { noCalls: true as const } : {}) });
        await reschedule();
      }),

    /**
     * The week's weigh-ins as the server counted them (FirstWeeks.weighInWeek, ADR-089 Ek 2), kept whenever it is read —
     * Today, and again after a weigh-in is saved. While behind and reachable the block's training reminders carry one more
     * line; null (a call has read the scale, or none yet): none. No new kind, no permission asked. `era` as keepRestUntil's;
     * the same facts again change nothing.
     */
    keepWeighInWeek: (facts: WeighInFacts | null, era: number = generation): Promise<void> =>
      inTurn(async () => {
        if (era !== generation) return;
        const kept = facts === null ? null : JSON.stringify(facts);
        if ((await kv.getItemAsync(KEY.weighIns)) === kept) return;
        if (kept === null) await kv.removeItemAsync(KEY.weighIns);
        else await kv.setItemAsync(KEY.weighIns, kept);
        await reschedule();
      }),

    /**
     * The user's usual meal times and which slots today already has (ADR-090 #2, the fourth kind), learned from the meals read and
     * kept at each read — Today, and again after a meal is saved. No permission asked and nothing sent: the plan only gains meal
     * reminders. `era` as keepRestUntil's; the same facts again change nothing.
     */
    keepMealRhythm: (rhythm: MealRhythm | null, era: number = generation): Promise<void> =>
      inTurn(async () => {
        if (era !== generation) return;
        const kept = rhythm === null ? null : JSON.stringify(rhythm);
        if ((await kv.getItemAsync(KEY.meals)) === kept) return;
        if (kept === null) await kv.removeItemAsync(KEY.meals);
        else await kv.setItemAsync(KEY.meals, kept);
        await reschedule();
      }),

    /**
     * The steps left today (K-1216), kept at each read of Today for the evening walk nudge: the day, how many, and the line. Nothing
     * while the flag is off (as shipped): nothing kept, nothing planned. No permission asked. `era` as keepRestUntil's; the same
     * facts again change nothing.
     */
    keepWalkNudge: (facts: WalkNudgeFacts | null, era: number = generation): Promise<void> =>
      inTurn(async () => {
        if (!walkNudge || era !== generation) return;
        const kept = facts === null ? null : JSON.stringify(facts);
        if ((await kv.getItemAsync(KEY.walkNudge)) === kept) return;
        if (kept === null) await kv.removeItemAsync(KEY.walkNudge);
        else await kv.setItemAsync(KEY.walkNudge, kept);
        await reschedule();
      }),

    /**
     * Today's walk as the coach offers it (K-1236, ADR-092 Ek 2 #2): the steps left and the line Today last read (the engine's target
     * less Health's count, against the user's routes, K-1216), the nudge's time, and whether it will ring today (the user's switch or
     * "Add to plan" earlier today, with the reminders on, allowed, not quieted, and the time still ahead). None when Today has read nothing today.
     */
    walkToday: async (): Promise<(WalkNudgeFacts & { at: string; planned: boolean }) | null> => {
      const facts = await todaysWalk();
      if (facts === null) return null;
      return { ...facts, at: P.walkNudgeTime, planned: await walkRings() };
    },

    /**
     * "Add to plan" (K-1236): today's evening walk reminder alone, by date; the user's own switch, the plan, the targets and the call
     * stay as they are. What it says back: `set`; `off` while the reminders are off or not allowed (the way is Settings); `late` once
     * the time has passed; `quiet` when a declared state (or the check-in-only switch) keeps it from ringing; `none` when nothing is left to walk (too few steps, or nothing read today).
     */
    planWalkToday: async (): Promise<'set' | 'off' | 'late' | 'quiet' | 'none'> => {
      let said: 'set' | 'off' | 'late' | 'quiet' | 'none' = 'none';
      await inTurn(
        async () => {
          const facts = await todaysWalk();
          if (facts === null || facts.remaining < P.walkNudgeMinRemaining) return;
          const moment = now();
          const at = new Date(moment.getFullYear(), moment.getMonth(), moment.getDate(), 0, minutesOf(P.walkNudgeTime));
          if (moment >= at) {
            said = 'late';
            return;
          }
          if (!settings.enabled || !(await access.permission()).granted) {
            said = 'off';
            return;
          }
          await kv.setItemAsync(KEY.walkToday, facts.day);
          await reschedule();
          // Asked, but a declared state (or the check-in-only switch) keeps it from ringing: said so, and not kept as asked.
          if (await walkRings()) said = 'set';
          else {
            await kv.removeItemAsync(KEY.walkToday);
            said = 'quiet';
          }
        },
        { rethrow: true },
      );
      return said;
    },

    /** The evening walk nudge on or off on its own (Settings > Reminders); off by default (ADR-090 Ek 10). */
    setWalk: (on: boolean): Promise<void> =>
      inTurn(
        async () => {
          if (on) await kv.setItemAsync(KEY.walkOn, ON);
          else await kv.removeItemAsync(KEY.walkOn);
          const { walkOn: _, ...rest } = settings;
          become(on ? { ...rest, walkOn: true } : rest);
          await quietly(reschedule());
        },
        { rethrow: true },
      ),

    /** The meal reminder on or off on its own (Settings › Reminders); the others stay as they are. */
    setMeals: (on: boolean): Promise<void> =>
      inTurn(
        async () => {
          if (on) await kv.removeItemAsync(KEY.mealsOff);
          else await kv.setItemAsync(KEY.mealsOff, ON);
          const { mealsOff: _, ...rest } = settings;
          become(on ? rest : { ...rest, mealsOff: true });
          await quietly(reschedule());
        },
        { rethrow: true },
      ),

    /** Something the plan reads changed outside this service — a state declared or ended (K-518): plan again. */
    refresh: (): Promise<void> => inTurn(() => reschedule()),

    /** The app came to the front: the quiet spell starts again from now. */
    opened: (): Promise<void> =>
      inTurn(async () => {
        await kv.setItemAsync(KEY.lastOpened, now().toISOString());
        await reschedule();
      }),

    /** Sign-out: nothing stays scheduled or kept for the next account — after any change still on its way. */
    forget: (): Promise<void> => {
      generation += 1;
      become({ enabled: false, cue: '' });
      return inTurn(async () => {
        await Promise.all(Object.values(KEY).map((key) => kv.removeItemAsync(key)));
        await access.clear();
      });
    },
  };
}

/**
 * The opens that count (K-410): at start and each time the app comes to the front, while someone is signed in — so the
 * quiet spell starts again from the last real use, however long iOS keeps the app in memory. A keychain that cannot say
 * whether anyone is signed in skips that one. Answers the function that stops listening.
 */
export function trackOpens(
  opened: () => Promise<void>,
  isSignedIn: () => Promise<boolean>,
  foreground: (listener: () => void) => () => void,
): () => void {
  const open = () =>
    void isSignedIn()
      .then((signedIn) => (signedIn ? opened() : undefined))
      .catch(() => undefined);
  const stop = foreground(open);
  open();
  return stop;
}
