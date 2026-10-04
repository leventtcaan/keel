/** The progress photo capture's limits, from data/parameters/photos.json (ADR-029: parameters the phone reads). */
import params from '../../../../data/parameters/photos.json';

type Parameter = { key: string; value: unknown };
function param<T>(key: string): T {
  const found = (params.parameters as Parameter[]).find((p) => p.key === key);
  if (found === undefined) throw new Error(`photos.json has no ${key}`);
  return found.value as T;
}

export const photoParams = {
  levelToleranceDeg: param<number>('photo_level_tolerance_deg'),
  ghostOpacity: param<number>('photo_ghost_opacity'),
  timerSeconds: param<number>('photo_timer_seconds'),
  jpegQuality: param<number>('photo_jpeg_quality'),
  levelUpdateMs: param<number>('photo_level_update_ms'),
};
