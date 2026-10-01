/**
 * The gym profile form (K-421, ADR-032): what the user types, in their unit, and the gym as the server stores it — kg to
 * the hundredth (ADR-029), a lb plate as its lb (45 is 20.41 kg, the server's rounding reads it back as 45 lb). A list
 * is weights separated by spaces: a comma is a decimal where the number pad types one. The server checks the limits
 * (how many plates, how heavy); the form only catches what is not a weight, by its field.
 */
import type { components } from '@/api/schema';
import { type UnitSystem, formatPlate, parseLoadKg } from '@/units/units';

import { unitsOf } from './loadSteps';

type Schemas = components['schemas'];
/** `unit`: the gym's own — what its plates and dumbbells say, which may not be the user's (a lb user at a kg gym). */
export type GymForm = {
  unit: UnitSystem;
  name: string;
  current: boolean;
  bar: string;
  plates: string;
  dumbbells: string;
  stackStep: string;
  machines: Record<string, string>;
};
export type Field = 'name' | 'bar' | 'plates' | 'dumbbells' | 'stackStep' | 'machines';
export type Built = { kind: 'ok'; input: Schemas['GymInput'] } | { kind: 'problem'; field: Field };

export const emptyForm = (unit: UnitSystem): GymForm => ({
  unit,
  name: '',
  current: false,
  bar: '',
  plates: '',
  dumbbells: '',
  stackStep: '',
  machines: {},
});

/** One weight in kg as stored, or null when the text is not a weight above zero. */
function weight(text: string, units: UnitSystem): number | null {
  const kg = parseLoadKg(text, units);
  return kg === null || kg <= 0 ? null : kg;
}

/** Weights separated by spaces, heaviest first, each once; none for an empty field; null when one is not a weight. */
export function parseWeights(text: string, units: UnitSystem): number[] | null {
  const kgs = text
    .split(/\s+/)
    .filter((part) => part !== '')
    .map((part) => weight(part, units));
  if (kgs.some((kg) => kg === null)) return null;
  return [...new Set(kgs as number[])].sort((a, b) => b - a);
}

/** A number as typed in the user's unit (a comma or a point as the decimal). */
function typed(text: string): number | null {
  const trimmed = text.trim();
  return /^\d+([.,]\d+)?$/.test(trimmed) ? Number(trimmed.replace(',', '.')) : null;
}

/** A rack filled in from its lightest, heaviest and step, as a list in the user's unit; null when they make none. */
export function rackOf(lightest: string, heaviest: string, step: string): string | null {
  const [from, to, by] = [typed(lightest), typed(heaviest), typed(step)];
  if (from === null || to === null || by === null || from <= 0 || by <= 0 || to < from) return null;
  // Counted in hundredths of the unit, so 2 + 2.5 + 2.5 is 7, not 6.999….
  const [low, high, inc] = [Math.round(from * 100), Math.round(to * 100), Math.round(by * 100)];
  const rack: string[] = [];
  for (let at = low; at <= high; at += inc) rack.push(String(at / 100));
  return rack.join(' ');
}

/**
 * A stored gym as the form shows it, in its own unit (lb ones on the quarter pound they were made in): saved untouched,
 * it is the gym it was. Shown in the user's unit instead, a 20 kg bar would read 44 lb and be saved as 19.96 kg.
 */
export function formOf(gym: Schemas['Gym'], userUnits: UnitSystem): GymForm {
  const stored = [...(gym.barKg === undefined ? [] : [gym.barKg]), ...gym.platesKg, ...gym.dumbbellsKg];
  const steps = [...(gym.stackStepKg === undefined ? [] : [gym.stackStepKg]), ...gym.machines.map((m) => m.stepKg)];
  const units = unitsOf([...stored, ...steps]) ?? userUnits;
  const one = (kg: number | undefined) => (kg === undefined ? '' : formatPlate(kg, units));
  const list = (kgs: number[]) => kgs.map((kg) => formatPlate(kg, units)).join(' ');
  return {
    unit: units,
    name: gym.name,
    current: gym.current,
    bar: one(gym.barKg),
    plates: list(gym.platesKg),
    dumbbells: list(gym.dumbbellsKg),
    stackStep: one(gym.stackStepKg),
    machines: Object.fromEntries(gym.machines.map((m) => [m.exerciseId, formatPlate(m.stepKg, units)])),
  };
}

/** The form as the server takes it: kg; an empty bar or stack step absent; a machine without its own step left out. */
export function buildGym(form: GymForm): Built {
  const units = form.unit;
  const name = form.name.trim();
  if (name === '') return { kind: 'problem', field: 'name' };
  const bar = form.bar.trim() === '' ? undefined : weight(form.bar, units);
  if (bar === null) return { kind: 'problem', field: 'bar' };
  const plates = parseWeights(form.plates, units);
  if (plates === null) return { kind: 'problem', field: 'plates' };
  const dumbbells = parseWeights(form.dumbbells, units);
  if (dumbbells === null) return { kind: 'problem', field: 'dumbbells' };
  const stack = form.stackStep.trim() === '' ? undefined : weight(form.stackStep, units);
  if (stack === null) return { kind: 'problem', field: 'stackStep' };
  const machines: Schemas['GymMachine'][] = [];
  for (const [exerciseId, text] of Object.entries(form.machines)) {
    if (text.trim() === '') continue;
    const stepKg = weight(text, units);
    if (stepKg === null) return { kind: 'problem', field: 'machines' };
    machines.push({ exerciseId, stepKg });
  }
  return {
    kind: 'ok',
    input: {
      name,
      current: form.current,
      ...(bar === undefined ? {} : { barKg: bar }),
      platesKg: plates,
      dumbbellsKg: dumbbells,
      ...(stack === undefined ? {} : { stackStepKg: stack }),
      machines,
    },
  };
}
