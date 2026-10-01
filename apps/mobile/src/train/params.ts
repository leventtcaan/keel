/** The session's rest band, RIR choices and a set's ceilings, from data/parameters/workout.json (ADR-029: parameters the phone reads). */
import params from '../../../../data/parameters/workout.json';

type Parameter = { key: string; value: unknown };
function param<T>(key: string): T {
  const found = (params.parameters as Parameter[]).find((p) => p.key === key);
  if (found === undefined) throw new Error(`workout.json has no ${key}`);
  return found.value as T;
}

export const workoutParams = {
  restSecondsMin: param<number>('rest_seconds_min'),
  restSecondsMax: param<number>('rest_seconds_max'),
  rirChoices: param<number[]>('rir_choices'),
  maxLoadKg: param<number>('set_max_load_kg'),
  maxReps: param<number>('set_max_reps'),
};
