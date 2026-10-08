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
  /** How long the server keeps a session open before it closes it (K-961); the session shows no time past it. */
  unfinishedSessionCloseHours: param<number>('unfinished_session_close_hours'),
  /** The session's weight stepper (K-971): one tap, in the user's unit. */
  loadStep: { kg: param<number>('set_load_step_kg'), lb: param<number>('set_load_step_lb') },
  e1rmEpleyDivisor: param<number>('e1rm_epley_divisor'),
  e1rmMaxRepsToFailure: param<number>('e1rm_max_reps_to_failure'),
  targetRirMax: param<number>('target_rir_max'),
  historyDays: param<number>('history_days'),
  noteMaxChars: param<number>('note_max_chars'),
  moveSearchResults: param<number>('move_search_results'),
  ownMoveNameMaxChars: param<number>('own_move_name_max_chars'),
  backMuscles: param<string[]>('back_muscles'),
  setupValueMaxChars: param<number>('setup_value_max_chars'),
  muscleMapAreas: param<Record<string, string[]>>('muscle_map_areas'),
  healthWorkoutMaxMinutes: param<number>('health_workout_max_minutes'),
  evaluationWindowDays: param<number>('evaluation_window_days'),
  effortCallWindowWeeks: param<number>('effort_call_window_weeks'),
  /** The user's own program as the contract takes it (OwnProgram). */
  programDaysMax: param<number>('program_days_max'),
  programDayMovesMax: param<number>('program_day_moves_max'),
  programMoveSetsMax: param<number>('program_move_sets_max'),
  programDayNameMaxChars: param<number>('program_day_name_max_chars'),
  /** Where a move added to a typed program starts (K-968): the sets, and the engine's rep range of its kind. */
  programNewMoveSets: param<number>('program_new_move_sets'),
  programNewMoveReps: {
    COMPOUND: { min: param<number>('rep_range_compound_min'), max: param<number>('rep_range_compound_max') },
    ISOLATION: { min: param<number>('rep_range_isolation_min'), max: param<number>('rep_range_isolation_max') },
  },
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
