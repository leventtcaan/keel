/**
 * The program and the exercise catalog, for the Train tab and the session (K-405): read from the server, and kept on the
 * phone so a workout starts and runs offline (ADR-006). When the server cannot be reached, the copy kept from the last
 * read stands in, and says so (`kept`); the server's "none" (404) forgets it. Nothing here is computed — the program's
 * targets and this week's sets are the server's (K-217). Training is not health data: no consent gate (ADR-026).
 * The gym in use is kept the same way (K-417): the warm-ups and the plates per side are counted from its weights offline.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { type Loaded, load, localDay } from '@/today/today';
import type { GymWeights } from '@/train/loadSteps';
import { workoutParams } from '@/train/params';
import type { KeyValue } from '@/units/preference';

type Schemas = components['schemas'];

/**
 * A move as the session, the summary and the history read it: the catalog's, or the user's own (K-416, ADR-035) with
 * the name they gave it — the catalog's names are the app's copy (`nameKey`), an own move's is the user's words.
 */
export type Move = Schemas['Exercise'] & { name?: string };

/** An own move as the catalog's: the engine's questions answered by the user; no muscles, swaps or setup to show. */
export function ownMove(own: Schemas['CustomExercise']): Move {
  const { id, name, kind, load: loadModel, equipment, unilateral } = own;
  return { id, nameKey: '', name, kind, muscles: [], alternatives: [], load: loadModel, equipment, unilateral, setupFields: [] };
}

/** The catalog's moves and the user's own, by id: what a set's exerciseId names. */
export function movesOf(data: TrainData | null, own: Move[]): Map<string, Move> {
  const catalog: Move[] = data?.exercises.state === 'ready' ? data.exercises.value : [];
  return new Map([...catalog, ...own].map((m) => [m.id, m]));
}

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
const HISTORY = 'train.history';
const OWN = 'train.own';
const SETUP = 'train.setup';

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

/** The first day of a move's history: history_days days, today included (ADR-033). */
export function historyFrom(now: Date): string {
  return localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (workoutParams.historyDays - 1)));
}

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

  /** Every move's setup, by move id; a copy that cannot be read is none. */
  async function setups(): Promise<Record<string, Record<string, string>>> {
    const copy = await kv.getItemAsync(SETUP);
    if (copy === null) return {};
    try {
      return JSON.parse(copy) as Record<string, Record<string, string>>;
    } catch {
      return {};
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
    /** The workouts behind a move's history (K-415, ADR-033). */
    async history(api: ApiClient, now: Date): Promise<Loaded<Schemas['Workout'][]>> {
      const startedIn = generation;
      const [from, to] = [historyFrom(now), localDay(now)];
      const read = await load(() => api.GET('/v1/workouts', { params: { query: { from, to } } }));
      return (await withCopy(HISTORY, read, startedIn)).read;
    },
    /** The user's own moves (K-416), kept for offline like the catalog; none when unread and nothing kept. */
    async own(api: ApiClient): Promise<Move[]> {
      const startedIn = generation;
      const read = await load(() => api.GET('/v1/custom-exercises')).then((answer) => withCopy(OWN, answer, startedIn));
      return read.read.state === 'ready' ? read.read.value.map(ownMove) : [];
    },
    /** A move just saved (K-416): kept at once from the server's answer, so the next read offline has it. */
    async saved(move: Schemas['CustomExercise']): Promise<void> {
      const startedIn = generation;
      const copy = await kv.getItemAsync(OWN);
      let kept: Schemas['CustomExercise'][] = [];
      try {
        kept = copy === null ? [] : (JSON.parse(copy) as Schemas['CustomExercise'][]);
      } catch {
        kept = []; // a copy that cannot be read is no copy
      }
      if (startedIn !== generation) return; // signed out meanwhile: the move was the last account's
      await kv.setItemAsync(OWN, JSON.stringify([...kept.filter((m) => m.id !== move.id), move]));
    },
    /** The user's setup of a move — seat, pad, grip — kept on the phone only (K-418, ADR-017); none yet: empty. */
    async setup(exerciseId: string): Promise<Record<string, string>> {
      return (await setups())[exerciseId] ?? {};
    },
    async saveSetup(exerciseId: string, values: Record<string, string>): Promise<void> {
      const startedIn = generation;
      const kept = Object.fromEntries(
        Object.entries(values)
          .map(([field, value]) => [field, value.trim()])
          .filter(([, value]) => value !== ''),
      );
      const all = await setups();
      if (startedIn !== generation) return; // signed out meanwhile: the setup was the last account's
      await kv.setItemAsync(SETUP, JSON.stringify({ ...all, [exerciseId]: kept }));
    },
    /** The kept copies belong to the account: they go at sign-out. */
    async forget(): Promise<void> {
      generation += 1;
      await Promise.all([PROGRAM, EXERCISES, GYM, HISTORY, OWN, SETUP].map((key) => kv.removeItemAsync(key)));
    },
  };
}
