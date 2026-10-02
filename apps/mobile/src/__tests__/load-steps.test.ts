/**
 * The loads a gym can make, on the phone (K-417, ADR-032): the same cases the backend's LoadStepsTests reads
 * (contracts/fixtures/load-steps.json), so the warm-up the phone rounds and the target the server rounds agree.
 */
import fs from 'node:fs';
import path from 'node:path';

import { type GymWeights, platesFor, platesPerSide, round } from '@/train/loadSteps';

type Case = {
  case: string;
  equipment: string;
  exerciseId: string;
  gym: Partial<GymWeights> & { machines: Record<string, number> };
  lastKg: number;
  targetKg: number;
  expect: number | string;
};
type PlateCase = { case: string; baseKg: number; platesKg: number[]; totalKg: number; expect: number[] | null };

const fixture = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../../contracts/fixtures/load-steps.json'), 'utf8')) as {
  round: Case[];
  platesPerSide: PlateCase[];
};

const gym = (g: Case['gym']): GymWeights => ({
  barKg: g.barKg ?? null,
  platesKg: g.platesKg ?? [],
  dumbbellsKg: g.dumbbellsKg ?? [],
  stackStepKg: g.stackStepKg ?? null,
  machineStepsKg: g.machines,
});

test('there are shared cases to run', () => {
  expect(fixture.round.length).toBeGreaterThan(20);
  expect(fixture.platesPerSide.length).toBeGreaterThan(5);
});

test.each(fixture.round.map((c) => [c.case, c] as const))('%s', (_name, c) => {
  const result = round(c.equipment as never, c.exerciseId, gym(c.gym), c.lastKg, c.targetKg, 'maxJump' in c ? (c.maxJump as number) : undefined);
  if (c.expect === 'NO_HEAVIER') expect(result).toEqual({ kind: 'noHeavier' });
  else if (c.expect === 'UNKNOWN') expect(result).toEqual({ kind: 'unknown' });
  else expect(result).toEqual({ kind: 'to', kg: c.expect });
});

test.each(fixture.platesPerSide.map((c) => [c.case, c] as const))('plates: %s', (_name, c) => {
  expect(platesPerSide(c.totalKg, c.baseKg, c.platesKg)).toEqual(c.expect);
});

describe('the plates a side for a load, by what the move is made of', () => {
  const GYM: GymWeights = { barKg: 20, platesKg: [20, 10, 5, 2.5, 1.25], dumbbellsKg: [10], stackStepKg: 5, machineStepsKg: {} };

  test('a barbell over its bar; a sled from nothing', () => {
    expect(platesFor('BARBELL', 100, GYM)).toEqual([20, 20]);
    expect(platesFor('BARBELL', 20, GYM)).toEqual([]);
    expect(platesFor('PLATE_LOADED', 50, GYM)).toEqual([20, 5]);
  });

  test('nothing for what has no plates, for a gym without a bar, or for a load the plates cannot make', () => {
    expect(platesFor('DUMBBELL', 10, GYM)).toBeNull();
    expect(platesFor('MACHINE', 50, GYM)).toBeNull();
    expect(platesFor('BODYWEIGHT', 10, GYM)).toBeNull();
    expect(platesFor('BARBELL', 100, { ...GYM, barKg: null })).toBeNull();
    expect(platesFor('BARBELL', 101, GYM)).toBeNull();
    expect(platesFor('PLATE_LOADED', 0, GYM)).toBeNull();
  });
});
