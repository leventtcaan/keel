/**
 * Finding a move to add to a session (K-416): by its name or what people also call it (the catalog's aliases in
 * data/copy/en.json), whatever the case; names that start with what was typed first. The catalog's own words, on the
 * phone: no server, offline too.
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { findMoves } from '@/train/moves';
import { workoutParams } from '@/train/params';

type Schemas = components['schemas'];
const move = (id: string) => ({ id, nameKey: `exercises.${id}.name` }) as Schemas['Exercise'];
const CATALOG = ['bench_press', 'dumbbell_bench_press', 'barbell_row', 'one_arm_dumbbell_row', 'lat_pulldown'].map(move);
const ids = (found: Schemas['Exercise'][]) => found.map((m) => m.id);

test('by name, whatever the case; a name starting with it first', () => {
  expect(ids(findMoves('ROW', CATALOG))).toEqual(['barbell_row', 'one_arm_dumbbell_row']);
  expect(ids(findMoves('bench', CATALOG))[0]).toBe('bench_press');
  expect(ids(findMoves('bench', [move('dumbbell_bench_press'), move('bench_press')]))).toEqual(['bench_press', 'dumbbell_bench_press']);
});

test('a name that has it comes before an alias that has it', () => {
  expect(ids(findMoves('seated', [move('machine_chest_press'), move('seated_row')]))).toEqual(['seated_row', 'machine_chest_press']);
  expect(ids(findMoves('dumbbell', [move('lateral_raise'), move('one_arm_dumbbell_row')]))).toEqual(['one_arm_dumbbell_row', 'lateral_raise']);
});

test('at most move_search_results; a move the copy does not name is found by its id', () => {
  const many = Array.from({ length: workoutParams.moveSearchResults + 3 }, (_, i) => move(`row_${i}`));
  expect(findMoves('row', many)).toHaveLength(workoutParams.moveSearchResults);
});

test('by what people also call it (the aliases)', () => {
  const alias = t('exercises.bench_press.aliases').split(',')[1].trim(); // "Flat bench"
  expect(ids(findMoves(alias.toLowerCase(), CATALOG))).toContain('bench_press');
});

test('nothing typed, or spaces only, finds nothing', () => {
  expect(findMoves('', CATALOG)).toEqual([]);
  expect(findMoves('   ', CATALOG)).toEqual([]);
});

test('the moves left out (already in the session) are not offered', () => {
  expect(ids(findMoves('row', CATALOG, new Set(['barbell_row'])))).toEqual(['one_arm_dumbbell_row']);
});
