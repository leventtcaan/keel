/** Bringing in another app's history (K-609), from data/parameters/import.json (ADR-029: parameters the phone reads). */
import params from '../../../../data/parameters/import.json';

type Parameter = { key: string; value: unknown };
function param<T>(key: string): T {
  const found = (params.parameters as Parameter[]).find((p) => p.key === key);
  if (found === undefined) throw new Error(`import.json has no ${key}`);
  return found.value as T;
}

export const importParams = {
  workoutsPerRequest: param<number>('import_workouts_per_request'),
  setsPerSessionMax: param<number>('import_sets_per_session_max'),
  matchSuggestMin: param<number>('import_match_suggest_min'),
  matchSuggestions: param<number>('import_match_suggestions'),
  /** The program draft (K-957, ADR-073 Ek 2, D1). */
  draft: {
    weeks: param<number>('program_draft_weeks'),
    routineMinSessions: param<number>('program_draft_routine_min_sessions'),
    moveMinShare: param<number>('program_draft_move_min_share'),
    weekdayMinShare: param<number>('program_draft_weekday_min_share'),
    repsMiddleShare: param<number>('program_draft_reps_middle_share'),
    repSpanMin: param<number>('program_draft_rep_span_min'),
  },
};
