/**
 * Where a call lands in the day (K-1217): the daily places the call changed, so "In practice" can point to them.
 * The server's call decides, the phone chooses nothing: a calorie (or phase) target is the food page's, a move's load or the week's
 * sessions are Train's, a step target is the walk on Home. Only a call in the plan points anywhere: one kept off it, undone, or not
 * applied yet changed nothing (U2), and the safety call says only that the plan changed (U13). In a fixed order, each place once.
 */
import type { components } from '@/api/schema';

type Decision = components['schemas']['Decision'];

export type Practice = 'food' | 'train' | 'walk';

const FOOD_ACTIONS: ReadonlySet<string> = new Set(['ADJUST_CALORIES', 'INCREASE_CALORIES', 'MINI_CUT', 'CHANGE_PHASE']);
const TRAIN_ACTIONS: ReadonlySet<string> = new Set(['DELOAD', 'FULL_REST_WEEK', 'STOP_LOAD_INCREASE', 'CHANGE_MOVEMENT', 'ADD_TRAINING_DAY', 'MOVE_MISSED_SESSIONS']);

export function practiceOf(decision: Decision): Practice[] {
  const { state } = decision.application;
  if (decision.safety === true || (state !== 'APPLIED' && state !== 'NOT_NEEDED')) return [];
  const moved = new Set(decision.changes.map((change) => change.what));
  const type = decision.action.type;
  const places: Practice[] = [];
  if (moved.has('CALORIES') || moved.has('PHASE') || FOOD_ACTIONS.has(type)) places.push('food');
  if (moved.has('MOVE') || TRAIN_ACTIONS.has(type)) places.push('train');
  if (moved.has('STEPS')) places.push('walk');
  return places;
}
