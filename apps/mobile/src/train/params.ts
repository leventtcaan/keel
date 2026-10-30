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
  /** Today's card (Evre 7 C1): a set's own seconds, the rounding of the estimate, how many headline moves say their last time. */
  sessionSetSeconds: param<number>('session_set_seconds'),
  sessionMinutesRound: param<number>('session_minutes_round'),
  headlineMovesShown: param<number>('headline_moves_shown'),
  /** One tap of the rest timer's minus and plus (Evre 7 C2). */
  restAdjustSeconds: param<number>('rest_adjust_seconds'),
  /** How long the undo banner stays after a save (ADR-070 Ek 2 #6, UndoBanner). */
  undoBannerMs: param<number>('undo_banner_ms'),
  rirChoices: param<number[]>('rir_choices'),
  /** Reps left from which a first-session set says its weight is light (ADR-075 #3, Ek 1; the picker's last choice, "2+"). */
  calibrationRirMin: param<number>('calibration_rir_min'),
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
  /** The "Add a move" picker (Evre 7 B2): the muscle groups of its chips, the popular moves of each, how many groups open the list. */
  movePickerGroups: param<Record<string, string[]>>('move_picker_groups'),
  movePickerPopular: param<Record<string, string[]>>('move_picker_popular'),
  movePickerFeaturedGroups: param<number>('move_picker_featured_groups'),
  /** How many other-equipment moves the workout's Taken sheet offers (ADR-090 Ek 2, K-1064; G1 K-77). */
  takenAlternativesMax: param<number>('taken_alternatives_max'),
  /** How many moves the workout end's "What moved" lists (K-974); the rest are counted. */
  summaryMovesShown: param<number>('summary_moves_shown'),
  ownMoveNameMaxChars: param<number>('own_move_name_max_chars'),
  backMuscles: param<string[]>('back_muscles'),
  setupValueMaxChars: param<number>('setup_value_max_chars'),
  muscleMapAreas: param<Record<string, string[]>>('muscle_map_areas'),
  healthWorkoutMaxMinutes: param<number>('health_workout_max_minutes'),
  evaluationWindowDays: param<number>('evaluation_window_days'),
  effortCallWindowWeeks: param<number>('effort_call_window_weeks'),
  /** The sets a move added in a workout, outside the day's plan, has (Evre 7, issue 684): after them it is done. */
  addedMoveSets: param<number>('session_added_move_sets'),
  /** The user's own program as the contract takes it (OwnProgram). */
  programDaysMax: param<number>('program_days_max'),
  /** A program of more days than this carries the short rest-day note (ADR-090 #3). */
  restNoteAboveDays: param<number>('rest_note_above_days'),
  programDayMovesMax: param<number>('program_day_moves_max'),
  programMoveSetsMax: param<number>('program_move_sets_max'),
  programDayNameMaxChars: param<number>('program_day_name_max_chars'),
  /** Where a move added to a typed program starts (K-968): the sets, and the engine's rep range of its kind. */
  programNewMoveSets: param<number>('program_new_move_sets'),
  programNewMoveReps: {
    COMPOUND: { min: param<number>('rep_range_compound_min'), max: param<number>('rep_range_compound_max') },
    ISOLATION: { min: param<number>('rep_range_isolation_min'), max: param<number>('rep_range_isolation_max') },
  },
  /** Edit › Cardio (ADR-074 #4): where the user's own starts, one step of its minutes, the contract's most. */
  cardioMinutesStart: param<number>('cardio_minutes_start'),
  cardioMinutesStep: param<number>('cardio_minutes_step'),
  cardioMinutesMax: param<number>('cardio_minutes_max'),
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
