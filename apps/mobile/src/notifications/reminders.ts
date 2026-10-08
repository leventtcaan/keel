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
import { type Reminder, type ReminderKind, type Schedule, planReminders } from './plan';

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

/** `only`: one kind alone, turned on that way (the plan's Monday morning switch, K-967); absent, all three. */
export type ReminderSettings = { enabled: boolean; cue: string; only?: ReminderKind };

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
};

const KEY = {
  enabled: 'reminders.enabled',
  cue: 'reminders.cue',
  only: 'reminders.only',
  schedule: 'reminders.schedule',
  lastOpened: 'reminders.lastOpened',
  restUntil: 'reminders.restUntil',
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

function dateOf(kept: string | null): Date | null {
  const date = kept === null ? null : new Date(kept);
  return date !== null && !Number.isNaN(date.getTime()) ? date : null;
}

export type Reminders = Awaited<ReturnType<typeof createReminders>>;

export async function createReminders({ kv, access, now, report, muted = async () => false, mutedUntil = async () => null }: Options) {
  const keptOnly = await kv.getItemAsync(KEY.only);
  let settings: ReminderSettings = {
    enabled: (await kv.getItemAsync(KEY.enabled)) === ON,
    cue: (await kv.getItemAsync(KEY.cue)) ?? '',
    ...(keptOnly === 'check_in' ? { only: keptOnly } : {}),
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

  /** What should be scheduled now, from what is kept — read inside the turn, so the plan is never older than a change. */
  async function reschedule(): Promise<void> {
    const silenced = settings.enabled && (await muted());
    const until = silenced ? await mutedUntil() : null;
    // A state with no last day says nothing of when to come back: nothing is planned until it ends.
    if (!settings.enabled || !(await access.permission()).granted || (silenced && until === null)) {
      await access.clear();
      return;
    }
    const plan = planReminders({
      schedule: scheduleOf(await kv.getItemAsync(KEY.schedule)),
      cue: settings.cue,
      lastOpened: dateOf(await kv.getItemAsync(KEY.lastOpened)),
      now: now(),
      muted: silenced,
      mutedUntil: until,
      restUntil: await kv.getItemAsync(KEY.restUntil),
    });
    await access.replace(settings.only === undefined ? plan : plan.filter((reminder) => reminder.kind === settings.only));
  }

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
     * A week off as the program has it (Program.restUntil, ADR-037 › 51b), kept whenever the program is read — on Today and
     * on the Train tab. Training reminders stop until it ends; null, none.
     */
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
