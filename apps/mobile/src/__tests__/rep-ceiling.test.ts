/**
 * The rep ceiling on a sparse rack (K-534, ADR-045 #73), on the phone: the same cases the backend's RepCeilingTests reads
 * (contracts/fixtures/rep-ceiling.json), so the note shows exactly when the server's target stopped at the ceiling.
 */
import fs from 'node:fs';
import path from 'node:path';

import { atCeiling } from '@/train/repCeiling';

type Case = { case: string; range: { min: number; max: number }; weakest: number; ceilingAbove: number; oneMore: number; atCeiling: boolean };

const fixture = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../../contracts/fixtures/rep-ceiling.json'), 'utf8')) as { cases: Case[] };

test('there are shared cases to run', () => {
  expect(fixture.cases.length).toBeGreaterThan(5);
});

test.each(fixture.cases)('$case', (c) => {
  expect(atCeiling(c.range, c.oneMore, c.ceilingAbove)).toBe(c.atCeiling);
});
