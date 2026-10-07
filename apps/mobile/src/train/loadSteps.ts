/**
 * The loads a gym can make, on the phone (K-417, ADR-032): the backend's LoadSteps in TypeScript, run against the same
 * cases (contracts/fixtures/load-steps.json), so a warm-up rounded here and a target rounded on the server agree.
 *
 * Counted in whole hundredths — of a kg, or of a lb when the gym's weights were entered in lb (a lb plate stored on its own
 * drifts from the same load typed in lb; counted in lb, both are one load). Plates in enough pairs; the fewest plates by
 * dynamic programming. Comments on the why live with the backend's (LoadSteps.java); this follows it line for line.
 */
import type { components } from '@/api/schema';
import type { UnitSystem } from '@/units/units';

type Equipment = components['schemas']['Equipment'];

/** A gym's weights in kg, as the contract's Gym has them (machines by move). */
export type GymWeights = {
  barKg: number | null;
  platesKg: number[];
  dumbbellsKg: number[];
  stackStepKg: number | null;
  machineStepsKg: Record<string, number>;
};
export type Rounding = { kind: 'to'; kg: number } | { kind: 'tooFar'; kg: number } | { kind: 'noHeavier' } | { kind: 'unknown' };

/** The pound, by definition (ADR-029). */
const KG_PER_LB = 0.45359237;
/** The quarter-pound grid a lb weight sits on, in hundredths of a lb. */
const LB_GRID = 25;
/** A kg weight is a multiple of 0.05 kg. */
const EXACT_KG = 5;
/** How far a stored kg value may be from its lb weight. A float's own error is far below a hundredth. */
const ON_GRID = 0.01 + 1e-9;

const hundredths = (kg: number) => Math.round(kg * 100);
const round2 = (x: number) => Math.round(x * 100) / 100;

/** The lb weight a kg value stands for, in hundredths of a lb on the quarter-pound grid, if it is one. */
function onLbGrid(kg: number): number | null {
  const lbHundredths = Math.round((kg / KG_PER_LB) * 10000) / 100;
  const grid = Math.round(lbHundredths / LB_GRID) * LB_GRID;
  return Math.abs((grid / 100) * KG_PER_LB - kg) <= ON_GRID ? grid : null;
}

const exactLb = (kg: number) => Math.round((kg / KG_PER_LB) * 100);

/**
 * `units` for a weight someone stored (a lb one goes back to its lb); `target` for the engine's, which no one entered in
 * lb: snapped to the quarter pound, a target just past the middle of two loads would tie, and go to the lighter.
 */
type Scale = { units(kg: number): number; target(kg: number): number; kg(units: number): number };
const KG: Scale = { units: hundredths, target: hundredths, kg: (units) => units / 100 };
const LB: Scale = {
  units: (kg) => onLbGrid(kg) ?? exactLb(kg),
  target: exactLb,
  kg: (units) => round2((units / 100) * KG_PER_LB),
};

/** lb when every weight sits on the lb grid and one at least is no kg weight; kg otherwise. */
function scaleOf(weights: number[]): Scale {
  const entered = weights.some((kg) => hundredths(kg) % EXACT_KG !== 0);
  return entered && weights.every((kg) => onLbGrid(kg) !== null) ? LB : KG;
}

/** The fewest plates that make each amount up to `ceiling` (unbounded of each); Infinity when none do. */
function fewest(plates: number[], ceiling: number): number[] {
  const best = new Array<number>(ceiling + 1).fill(Infinity);
  best[0] = 0;
  for (let amount = 1; amount <= ceiling; amount++) {
    for (const plate of plates) {
      if (plate <= amount && best[amount - plate] + 1 < best[amount]) best[amount] = best[amount - plate] + 1;
    }
  }
  return best;
}

/** Every load the plates make over `base`, `perLoad` of each plate (2 a pair, 1 a belt), up to the first past the target. */
function plateLoads(base: number, perLoad: number, plates: number[], target: number): number[] {
  if (plates.length === 0) return [];
  const ceiling = Math.floor(Math.max(0, target - base) / perLoad) + 1 + Math.max(...plates);
  const best = fewest(plates, ceiling);
  const loads: number[] = [];
  for (let side = 0; side <= ceiling; side++) if (best[side] !== Infinity) loads.push(base + perLoad * side);
  return loads;
}

/** A stack by its step: the multiples on either side of the target. */
function stack(step: number, target: number): number[] {
  const below = Math.floor(target / step) * step;
  return [below, below >= target ? below : below + step];
}

/**
 * The nearest load the gym makes to `targetKg` that is heavier than `lastKg`; a tie goes to the lighter. With `lastKg`
 * 0, simply the nearest load the gym makes (a warm-up). With `maxJump`, tooFar where the nearest is further than that many
 * of the engine's steps (target − last) over the last (K-430, ADR-037 #38; the server takes it once the sets at the last
 * are worth the bottom of the range there, ADR-041 #55). noHeavier where the weights end; unknown when the gym says
 * nothing about this equipment.
 */
export function round(equipment: Equipment, exerciseId: string, gym: GymWeights, lastKg: number, targetKg: number, maxJump?: number): Rounding {
  const { scale, loads } = made(equipment, exerciseId, gym, targetKg);
  const last = scale.units(lastKg);
  const target = scale.target(targetKg);
  if (loads.length === 0) return { kind: 'unknown' };
  const heavier = loads.filter((load) => load > last);
  if (heavier.length === 0) return { kind: 'noHeavier' };
  const nearest = heavier.reduce((best, load) => {
    const [d, bestD] = [Math.abs(load - target), Math.abs(best - target)];
    return d < bestD || (d === bestD && load < best) ? load : best;
  });
  if (maxJump !== undefined && nearest - last > maxJump * (target - last)) return { kind: 'tooFar', kg: scale.kg(nearest) };
  return { kind: 'to', kg: scale.kg(nearest) };
}

/** A move of at most one step: a load, none the gym makes there, or no word on this equipment. */
export type Within = { kind: 'to'; kg: number } | { kind: 'none' } | { kind: 'unknown' };

/**
 * A move of at most one step (K-960, ADR-075 Ek 1; the backend's LoadSteps.within): the load the gym makes between
 * `fromKg` (excluded) and `toKg` (included) nearest `toKg` — the heaviest when `toKg` is over, the lightest when under.
 * none when it makes nothing there; unknown when it says nothing about this equipment.
 */
export function within(equipment: Equipment, exerciseId: string, gym: GymWeights, fromKg: number, toKg: number): Within {
  const { scale, loads } = made(equipment, exerciseId, gym, toKg);
  if (loads.length === 0) return { kind: 'unknown' };
  const from = scale.units(fromKg);
  const to = scale.target(toKg);
  const between = loads.filter((load) => (to > from ? load > from && load <= to : load < from && load >= to));
  if (between.length === 0) return { kind: 'none' };
  return { kind: 'to', kg: scale.kg(to > from ? Math.max(...between) : Math.min(...between)) };
}

/** The loads a gym makes for an equipment, around a target, on the scale its weights were entered in. */
function made(equipment: Equipment, exerciseId: string, gym: GymWeights, targetKg: number): { scale: Scale; loads: number[] } {
  const stepKg = gym.machineStepsKg[exerciseId] ?? gym.stackStepKg;
  let scale: Scale;
  switch (equipment) {
    case 'DUMBBELL':
      scale = scaleOf(gym.dumbbellsKg);
      break;
    case 'MACHINE':
    case 'CABLE':
      scale = stepKg === null ? KG : scaleOf([stepKg]);
      break;
    case 'BARBELL':
      scale = scaleOf([...(gym.barKg === null ? [] : [gym.barKg]), ...gym.platesKg]);
      break;
    case 'PLATE_LOADED':
      scale = scaleOf(gym.platesKg);
      break;
    case 'BODYWEIGHT':
      scale = scaleOf([...gym.platesKg, ...gym.dumbbellsKg]);
      break;
  }
  const target = scale.target(targetKg);
  const plates = gym.platesKg.map((kg) => scale.units(kg));
  let loads: number[];
  switch (equipment) {
    case 'DUMBBELL':
      loads = gym.dumbbellsKg.map((kg) => scale.units(kg));
      break;
    case 'MACHINE':
    case 'CABLE':
      loads = stepKg === null ? [] : stack(scale.units(stepKg), target);
      break;
    case 'BARBELL':
      loads = gym.barKg === null ? [] : plateLoads(scale.units(gym.barKg), 2, plates, target);
      break;
    case 'PLATE_LOADED':
      loads = plateLoads(0, 2, plates, target);
      break;
    case 'BODYWEIGHT':
      loads = [...plateLoads(0, 1, plates, target), ...gym.dumbbellsKg.map((kg) => scale.units(kg))];
      break;
  }
  return { scale, loads };
}

/** The plates on each side that make `totalKg` over `baseKg`: the fewest, heavier first on a tie, as stored. Null when none do. */
export function platesPerSide(totalKg: number, baseKg: number, platesKg: number[]): number[] | null {
  const scale = scaleOf([...(baseKg > 0 ? [baseKg] : []), ...platesKg]);
  const both = scale.units(totalKg) - scale.units(baseKg);
  if (both < 0 || both % 2 !== 0) return null;
  const side = both / 2;
  const heaviestFirst = [...platesKg].sort((a, b) => b - a);
  const plates = heaviestFirst.map((kg) => scale.units(kg));
  const best = fewest(plates, side);
  if (best[side] === Infinity) return null;
  const found: number[] = [];
  for (let left = side; left > 0;) {
    const i = plates.findIndex((plate) => plate <= left && best[left - plate] === best[left] - 1);
    found.push(heaviestFirst[i]);
    left -= plates[i];
  }
  return found;
}

/** The unit the gym's plates were entered in, as they read on the rack (a 20 kg plate is no 44 lb plate). */
export function plateUnits(gym: GymWeights): UnitSystem {
  return unitsOf([...(gym.barKg === null ? [] : [gym.barKg]), ...gym.platesKg]) ?? 'METRIC';
}

/** The unit stored weights were entered in (lb when they sit on the lb grid and are no kg weights); null for none. */
export function unitsOf(weightsKg: number[]): UnitSystem | null {
  if (weightsKg.length === 0) return null;
  return scaleOf(weightsKg) === LB ? 'IMPERIAL' : 'METRIC';
}

/**
 * The plates on each side for a load on a barbell (over the gym's bar; none is the bar alone) or a sled (an empty sled
 * is nothing to load); null for anything else, a gym without a bar, or a load its plates do not make.
 */
export function platesFor(equipment: Equipment, loadKg: number, gym: GymWeights): number[] | null {
  if (equipment === 'BARBELL') return gym.barKg === null ? null : platesPerSide(loadKg, gym.barKg, gym.platesKg);
  if (equipment === 'PLATE_LOADED' && loadKg > 0) return platesPerSide(loadKg, 0, gym.platesKg);
  return null;
}
