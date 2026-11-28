/** Progress's windows and counts, from data/parameters/progress.json (ADR-029: parameters the phone reads). */
import params from '../../../../data/parameters/progress.json';

type Parameter = { key: string; value: unknown };
/** A chart's range (K-1260): `days` back from today, today included (null: everything); `free` without a subscription. */
export type ChartRange = { key: string; days: number | null; free: boolean };
function param<T>(key: string): T {
  const found = (params.parameters as Parameter[]).find((p) => p.key === key);
  if (found === undefined) throw new Error(`progress.json has no ${key}`);
  return found.value as T;
}

export const progressParams = {
  weightChartDays: param<number>('weight_chart_days'),
  callsShown: param<number>('calls_shown'),
  callsFolded: param<number>('calls_folded'),
  weightRanges: param<ChartRange[]>('weight_chart_ranges'),
  strengthRanges: param<ChartRange[]>('strength_chart_ranges'),
  weightAllWindowDays: param<number>('weight_all_window_days'),
};
