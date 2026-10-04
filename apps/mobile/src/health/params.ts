/** Apple Health's reads and the weigh-in chart, from data/parameters/health.json (ADR-029: parameters the phone reads). */
import params from '../../../../data/parameters/health.json';

type Parameter = { key: string; value: unknown };
function param<T>(key: string): T {
  const found = (params.parameters as Parameter[]).find((p) => p.key === key);
  if (found === undefined) throw new Error(`health.json has no ${key}`);
  return found.value as T;
}

export const healthParams = {
  weightReadDays: param<number>('health_weight_read_days'),
  weightImportDays: param<number>('health_weight_import_days'),
  chartDays: param<number>('weigh_in_chart_days'),
  activityReadDays: param<number>('health_activity_read_days'),
};
