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
  e1rmEpleyDivisor: param<number>('e1rm_epley_divisor'),
  e1rmMaxRepsToFailure: param<number>('e1rm_max_reps_to_failure'),
  targetRirMax: param<number>('target_rir_max'),
  historyDays: param<number>('history_days'),
  noteMaxChars: param<number>('note_max_chars'),
  moveSearchResults: param<number>('move_search_results'),
  warmup: {
    first: {
      sets: param<number>('warmup_sets_first_move'),
      fractions: param<number[]>('warmup_fractions_first_move'),
      reps: param<number[]>('warmup_reps_first_move'),
    },
    other: {
      sets: param<number>('warmup_sets_other_move'),
      fractions: param<number[]>('warmup_fractions_other_move'),
      reps: param<number[]>('warmup_reps_other_move'),
    },
    roundKg: param<number>('warmup_round_kg'),
    roundLb: param<number>('warmup_round_lb'),
  },
};
