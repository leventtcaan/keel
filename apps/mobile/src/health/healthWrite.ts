/**
 * Writing to Apple Health (K-412, ADR-018 §1, ADR-031): two switches, each off until the user turns it on — a finished
 * session as a workout (the Fitness rings credit it), and a weigh-in typed in. Turning one on asks iOS's write sheet
 * (apart from the read one); without iOS's yes, the switch stays off. Every write checks iOS again — the user can take
 * it back in the Health app — and with no permission, no write call is made (ADR-018 › Doğrulama).
 *
 * A write that fails is reported by name and goes no further: the session and the weigh-in are kept either way. The
 * switches live on the phone (kv) and belong to the account: a sign-out forgets them.
 */
import { workoutParams } from '@/train/params';
import type { KeyValue } from '@/units/preference';

import type { HealthWriteAccess, HealthWriteKind } from './health';

export type HealthWriteSettings = { workouts: boolean; weighIns: boolean };
type Switch = keyof HealthWriteSettings;

type Options = {
  kv: KeyValue;
  access: HealthWriteAccess;
  /** By name only (V3): a message could carry a weight. */
  report: (problem: { name: string }) => void;
};

const KEY: Record<Switch, string> = { workouts: 'healthWrite.workouts', weighIns: 'healthWrite.weighIns' };
const KIND: Record<Switch, HealthWriteKind> = { workouts: 'workout', weighIns: 'weight' };
const ON = 'on';

export type HealthWriting = Awaited<ReturnType<typeof createHealthWriting>>;

export async function createHealthWriting({ kv, access, report }: Options) {
  let settings: HealthWriteSettings = {
    workouts: (await kv.getItemAsync(KEY.workouts)) === ON,
    weighIns: (await kv.getItemAsync(KEY.weighIns)) === ON,
  };
  const listeners = new Set<() => void>();
  const become = (next: HealthWriteSettings) => {
    settings = next;
    listeners.forEach((listener) => listener());
  };
  const reportError = (error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' });

  /** On, and iOS still allows it (read at the moment of writing — the Health app can take it back). */
  const allowed = (which: Switch) => access.available && settings[which] && access.canWrite(KIND[which]);

  return {
    /** Synchronous, for rendering (useSyncExternalStore). */
    current: (): HealthWriteSettings => settings,

    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /** Asks iOS's write sheet; on only if iOS then allows this kind. Whether it is on now. */
    turnOn: async (which: Switch): Promise<boolean> => {
      if (!access.available) return false;
      await access.requestWrite(KIND[which]);
      if (!access.canWrite(KIND[which])) return false;
      await kv.setItemAsync(KEY[which], ON);
      become({ ...settings, [which]: true });
      return true;
    },

    turnOff: async (which: Switch): Promise<void> => {
      await kv.removeItemAsync(KEY[which]);
      become({ ...settings, [which]: false });
    },

    /**
     * What the switch shows: on only while iOS still allows it — taken back in the Health app, "refused", never an "On"
     * that writes nothing (K-412 review).
     */
    shown: (which: Switch): 'off' | 'on' | 'refused' => (!settings[which] ? 'off' : allowed(which) ? 'on' : 'refused'),

    /**
     * A session finished with work in it: one workout, its start to its finish. Sets carry no times, so the finish is the
     * only end known: a session left open far longer than any session is not written (Health would keep a made-up length).
     */
    workoutFinished: async (workout: { id: string; start: Date; end: Date }): Promise<void> => {
      if (!allowed('workouts')) return;
      if (workout.end.getTime() - workout.start.getTime() > workoutParams.healthWorkoutMaxMinutes * 60_000) {
        report({ name: 'WorkoutTooLongForHealth' });
        return;
      }
      await access.writeWorkout(workout).catch(reportError);
    },

    /** A weigh-in typed in (never one read from Health: that one is Health's already). */
    weighInSaved: async (weighIn: { id: string; kg: number; at: Date }): Promise<void> => {
      if (!allowed('weighIns')) return;
      await access.writeWeight(weighIn).catch(reportError);
    },

    /** Sign-out: the switches belong to the account. What was written stays in Health — it is the user's. */
    forget: async (): Promise<void> => {
      await Promise.all(Object.values(KEY).map((key) => kv.removeItemAsync(key)));
      become({ workouts: false, weighIns: false });
    },
  };
}
