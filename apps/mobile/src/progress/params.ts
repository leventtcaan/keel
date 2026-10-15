/** Progress's windows and counts, from data/parameters/progress.json (ADR-029: parameters the phone reads). */
import params from '../../../../data/parameters/progress.json';

type Parameter = { key: string; value: unknown };
function param<T>(key: string): T {
  const found = (params.parameters as Parameter[]).find((p) => p.key === key);
  if (found === undefined) throw new Error(`progress.json has no ${key}`);
  return found.value as T;
}

export const progressParams = {
  weightChartDays: param<number>('weight_chart_days'),
  callsShown: param<number>('calls_shown'),
};
