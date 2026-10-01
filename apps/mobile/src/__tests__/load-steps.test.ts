/**
 * The loads a gym can make, on the phone (K-417, ADR-032): the same cases the backend's LoadStepsTests reads
 * (contracts/fixtures/load-steps.json), so the warm-up the phone rounds and the target the server rounds agree.
 */
import fs from 'node:fs';
import path from 'node:path';

import { type GymWeights, platesPerSide, round } from '@/train/loadSteps';

type Case = { case: string; equipment: string; exerciseId: string; gym: Partial<GymWeights> & { machines: Record<string, number> }; lastKg: number; targetKg: number; expect: number | string };
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
  const result = round(c.equipment as never, c.exerciseId, gym(c.gym), c.lastKg, c.targetKg);
  if (c.expect === 'NO_HEAVIER') expect(result).toEqual({ kind: 'noHeavier' });
  else if (c.expect === 'UNKNOWN') expect(result).toEqual({ kind: 'unknown' });
  else expect(result).toEqual({ kind: 'to', kg: c.expect });
});

test.each(fixture.platesPerSide.map((c) => [c.case, c] as const))('plates: %s', (_name, c) => {
  expect(platesPerSide(c.totalKg, c.baseKg, c.platesKg)).toEqual(c.expect);
});
