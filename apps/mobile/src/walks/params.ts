/** The walk line's numbers, from data/parameters/walks.json (ADR-029: parameters the phone reads; K-1216). */
import params from '../../../../data/parameters/walks.json';

type Parameter = { key: string; value: unknown };
function param<T>(key: string): T {
  const found = (params.parameters as Parameter[]).find((p) => p.key === key);
  if (found === undefined) throw new Error(`walks.json has no ${key}`);
  return found.value as T;
}

export const walkParams = {
  routesMax: param<number>('walk_routes_max'),
  nameMaxChars: param<number>('walk_route_name_max_chars'),
  routeMaxKm: param<number>('walk_route_max_km'),
  distanceDecimals: param<number>('walk_distance_decimals'),
  /** Steps a minute of everyday walking. */
  cadence: param<number>('walk_cadence_steps_per_min'),
  strideHeightFactor: param<number>('walk_stride_height_factor'),
  stepsPerKmDefault: param<number>('walk_steps_per_km_default'),
  minRemainingSteps: param<number>('walk_min_remaining_steps'),
  maxOvershoot: param<number>('walk_max_overshoot_ratio'),
};
