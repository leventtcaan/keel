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
};
