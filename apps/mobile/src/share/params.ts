/** The share stickers (K-975), from data/parameters/share.json (ADR-029: parameters the phone reads). */
import params from '../../../../data/parameters/share.json';

type Parameter = { key: string; value: unknown };
function param<T>(key: string): T {
  const found = (params.parameters as Parameter[]).find((p) => p.key === key);
  if (found === undefined) throw new Error(`share.json has no ${key}`);
  return found.value as T;
}

export const shareParams = {
  storyWidth: param<number>('story_width_px'),
  storyHeight: param<number>('story_height_px'),
  progressLifts: param<number>('progress_lifts'),
};
