/**
 * The program and the exercise catalog, for the Train tab and the session (K-405): read from the server, and kept on the
 * phone so a workout starts and runs offline (ADR-006). When the server cannot be reached, the copy kept from the last
 * read stands in, and says so (`kept`); the server's "none" (404) forgets it. Nothing here is computed — the program's
 * targets and this week's sets are the server's (K-217). Training is not health data: no consent gate (ADR-026).
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { type Loaded, load } from '@/today/today';
import type { KeyValue } from '@/units/preference';

type Schemas = components['schemas'];

export type TrainData = {
  program: Loaded<Schemas['Program']>;
  exercises: Loaded<Schemas['Exercise'][]>;
  /** At least one part is the copy kept on the phone, not the server's answer just now. */
  kept: boolean;
};

const PROGRAM = 'train.program';
const EXERCISES = 'train.exercises';

/** The server's answer kept; a failure answered from the kept copy; "none" forgets it. */
async function withCopy<T>(kv: KeyValue, key: string, read: Loaded<T>): Promise<{ read: Loaded<T>; kept: boolean }> {
  if (read.state === 'ready') {
    await kv.setItemAsync(key, JSON.stringify(read.value));
    return { read, kept: false };
  }
  if (read.state === 'none') {
    await kv.removeItemAsync(key);
    return { read, kept: false };
  }
  if (read.state !== 'failed') return { read, kept: false };
  const copy = await kv.getItemAsync(key);
  return copy === null ? { read, kept: false } : { read: { state: 'ready', value: JSON.parse(copy) as T }, kept: true };
}

export async function readTraining(api: ApiClient, kv: KeyValue): Promise<TrainData> {
  const [program, exercises] = await Promise.all([
    load(() => api.GET('/v1/program')).then((read) => withCopy(kv, PROGRAM, read)),
    load(() => api.GET('/v1/exercises')).then((read) => withCopy(kv, EXERCISES, read)),
  ]);
  return { program: program.read, exercises: exercises.read, kept: program.kept || exercises.kept };
}

/** The kept copies belong to the account: they go at sign-out. */
export async function forgetTraining(kv: KeyValue): Promise<void> {
  await Promise.all([kv.removeItemAsync(PROGRAM), kv.removeItemAsync(EXERCISES)]);
}
