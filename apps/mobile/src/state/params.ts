/** State mode's choices, from data/parameters/state.json (ADR-029: parameters the phone reads; K-518). */
import params from '../../../../data/parameters/state.json';

type Parameter = { key: string; value: unknown };
function param<T>(key: string): T {
  const found = (params.parameters as Parameter[]).find((p) => p.key === key);
  if (found === undefined) throw new Error(`state.json has no ${key}`);
  return found.value as T;
}

export const stateParams = {
  untilChoicesDays: param<number[]>('state_until_choices_days'),
};
