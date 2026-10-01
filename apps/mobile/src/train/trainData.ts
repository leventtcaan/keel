/**
 * The program and the exercise catalog, for the Train tab and the session (K-405): read from the server, and kept on the
 * phone so a workout starts and runs offline (ADR-006). When the server cannot be reached, the copy kept from the last
 * read stands in, and says so (`kept`); the server's "none" (404) forgets it. Nothing here is computed — the program's
 * targets and this week's sets are the server's (K-217). Training is not health data: no consent gate (ADR-026).
 * The gym in use is kept the same way (K-417): the warm-ups and the plates per side are counted from its weights offline.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { type Loaded, load } from '@/today/today';
import type { GymWeights } from '@/train/loadSteps';
import type { KeyValue } from '@/units/preference';

type Schemas = components['schemas'];

export type TrainData = {
  program: Loaded<Schemas['Program']>;
  exercises: Loaded<Schemas['Exercise'][]>;
  /** The weights of the gym in use; absent when no gym is in use, or none was ever read. */
  gym?: GymWeights;
  /** At least one part is the copy kept on the phone, not the server's answer just now. */
  kept: boolean;
};

const PROGRAM = 'train.program';
const EXERCISES = 'train.exercises';
const GYM = 'train.gym';

/** The gym marked current, as weights to round to: "none" when no gym is in use (its kept copy goes). */
function gymInUse(read: Loaded<Schemas['Gym'][]>): Loaded<GymWeights> {
  if (read.state !== 'ready') return read;
  const gym = read.value.find((g) => g.current);
  if (gym === undefined) return { state: 'none' };
  return {
    state: 'ready',
    value: {
      barKg: gym.barKg ?? null,
      platesKg: gym.platesKg,
      dumbbellsKg: gym.dumbbellsKg,
      stackStepKg: gym.stackStepKg ?? null,
      machineStepsKg: Object.fromEntries(gym.machines.map((m) => [m.exerciseId, m.stepKg])),
    },
  };
}

export type TrainingCache = ReturnType<typeof createTrainingCache>;

/**
 * The reads and the kept copies. A sign-out bumps the generation: a read still on its way then keeps nothing — the
 * program it brings is the last account's (the same guard as the unit preference's, K-310).
 */
export function createTrainingCache(kv: KeyValue) {
  let generation = 0;

  /** The server's answer kept; a failure answered from the kept copy; "none" forgets it. */
  async function withCopy<T>(key: string, read: Loaded<T>, startedIn: number): Promise<{ read: Loaded<T>; kept: boolean }> {
    if (read.state === 'ready' || read.state === 'none') {
      if (startedIn === generation) {
        await (read.state === 'ready' ? kv.setItemAsync(key, JSON.stringify(read.value)) : kv.removeItemAsync(key));
      }
      return { read, kept: false };
    }
    if (read.state !== 'failed') return { read, kept: false };
    const copy = await kv.getItemAsync(key);
    if (copy === null) return { read, kept: false };
    try {
      return { read: { state: 'ready', value: JSON.parse(copy) as T }, kept: true };
    } catch {
      return { read, kept: false }; // a copy that cannot be read is no copy
    }
  }

  return {
    async read(api: ApiClient): Promise<TrainData> {
      const startedIn = generation;
      const [program, exercises, gym] = await Promise.all([
        load(() => api.GET('/v1/program')).then((read) => withCopy(PROGRAM, read, startedIn)),
        load(() => api.GET('/v1/exercises')).then((read) => withCopy(EXERCISES, read, startedIn)),
        load(() => api.GET('/v1/gyms')).then((read) => withCopy(GYM, gymInUse(read), startedIn)),
      ]);
      // The gym's copy does not mark the read as kept: the screen's "kept" note is about the program it shows.
      return {
        program: program.read,
        exercises: exercises.read,
        ...(gym.read.state === 'ready' ? { gym: gym.read.value } : {}),
        kept: program.kept || exercises.kept,
      };
    },
    /** The kept copies belong to the account: they go at sign-out. */
    async forget(): Promise<void> {
      generation += 1;
      await Promise.all([kv.removeItemAsync(PROGRAM), kv.removeItemAsync(EXERCISES), kv.removeItemAsync(GYM)]);
    },
  };
}
