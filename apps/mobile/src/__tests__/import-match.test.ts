/**
 * Mapping another app's move names to the catalog (K-609, ADR-053 §5, U5): a name that is the catalog's — its name or
 * an alias, with the equipment in brackets agreeing — is matched; anything less sure is not matched for the user but
 * offered: the closest few, one tap each. A move the catalog lacks gets nothing it does not resemble.
 */
import type { components } from '@/api/schema';
import { matchNames } from '@/import/match';
import { importParams } from '@/import/params';
import type { Move } from '@/train/trainData';

type Equipment = components['schemas']['Equipment'];
const move = (id: string, equipment: Equipment, load: Move['load'] = 'EXTERNAL', unilateral = false): Move => ({
  id,
  nameKey: `exercises.${id}.name`,
  kind: 'COMPOUND',
  muscles: [],
  alternatives: [],
  load,
  equipment,
  unilateral,
  setupFields: [],
});
// Catalog moves with the app's own names and aliases (en.json).
const CATALOG: Move[] = [
  move('bench_press', 'BARBELL'),
  move('dumbbell_bench_press', 'DUMBBELL'),
  move('incline_dumbbell_press', 'DUMBBELL'),
  move('lat_pulldown', 'CABLE'),
  move('pull_up', 'BODYWEIGHT', 'BODYWEIGHT_PLUS_EXTERNAL'),
  move('squat', 'BARBELL'),
  move('romanian_deadlift', 'BARBELL'),
  move('one_arm_dumbbell_row', 'DUMBBELL', 'EXTERNAL', true),
  move('dumbbell_curl', 'DUMBBELL'),
];
const one = (name: string, moves = CATALOG) => matchNames(new Map([[name, 3]]), moves)[0];

test('a name the catalog has, with its equipment in brackets, is matched', () => {
  expect(one('Bench Press (Barbell)')).toMatchObject({ name: 'Bench Press (Barbell)', sets: 3, sure: 'bench_press' });
  expect(one('Squat (Barbell)').sure).toBe('squat');
  expect(one('Lat Pulldown (Cable)').sure).toBe('lat_pulldown');
});

test('the equipment decides between two moves of one name', () => {
  expect(one('Bench Press (Dumbbell)').sure).toBe('dumbbell_bench_press');
});

test('an alias counts as the name; no brackets, the name alone', () => {
  expect(one('Dumbbell Row').sure).toBe('one_arm_dumbbell_row'); // alias "Dumbbell row"
  expect(one('Pull Up').sure).toBe('pull_up'); // "Pull-up"
  expect(one('RDL').sure).toBe('romanian_deadlift');
});

test('case, punctuation and a plural do not matter', () => {
  expect(one('bench-press (BARBELL)').sure).toBe('bench_press');
  expect(one('Pull-Ups').sure).toBe('pull_up');
});

test('close but not the same is not matched for the user: the closest are offered, the closest first', () => {
  const deadlift = one('Deadlift (Barbell)'); // the catalog has no conventional deadlift
  expect(deadlift.sure).toBeNull();
  expect(deadlift.suggestions[0]).toBe('romanian_deadlift');

  const incline = one('Incline Bench Press (Dumbbell)');
  expect(incline.sure).toBeNull();
  expect(incline.suggestions[0]).toBe('incline_dumbbell_press');
});

test('at most the configured number of suggestions, none under the configured likeness', () => {
  const press = one('Press');
  expect(press.suggestions.length).toBeLessThanOrEqual(importParams.matchSuggestions);
  expect(one('Underwater Basket Weaving').suggestions).toEqual([]);
});

test("a conflicting equipment is not sure even when the name is the catalog's", () => {
  expect(one('Squat (Dumbbell)').sure).toBeNull();
  expect(one('Squat (Dumbbell)').suggestions).toContain('squat');
});

test("the user's own moves are matched by the name they gave", () => {
  const own: Move = { ...move('custom:8a1d', 'BARBELL'), nameKey: '', name: 'Landmine press' };

  expect(one('Landmine Press', [...CATALOG, own]).sure).toBe('custom:8a1d');
});

test('each name once, the most sets first', () => {
  const matched = matchNames(
    new Map([
      ['Squat (Barbell)', 4],
      ['Bench Press (Barbell)', 9],
    ]),
    CATALOG,
  );
  expect(matched.map((m) => [m.name, m.sets])).toEqual([
    ['Bench Press (Barbell)', 9],
    ['Squat (Barbell)', 4],
  ]);
});

describe('with the whole catalog (data/exercises)', () => {
  const fs = jest.requireActual<typeof import('node:fs')>('node:fs');
  const path = jest.requireActual<typeof import('node:path')>('node:path');
  const dir = path.join(__dirname, '../../../../data/exercises');
  const whole: Move[] = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.yaml'))
    .map((file) => {
      const text = fs.readFileSync(path.join(dir, file), 'utf8');
      const field = (key: string) => new RegExp(`^${key}: (\\S+)`, 'm').exec(text)?.[1] ?? '';
      return move(field('id'), field('equipment').toUpperCase() as Equipment);
    });

  test.each([
    ['Bench Press (Barbell)', 'bench_press'],
    ['Squat (Barbell)', 'squat'],
    ['Overhead Press (Barbell)', 'overhead_press'],
    ['Lat Pulldown (Cable)', 'lat_pulldown'],
    ['Seated Row (Cable)', 'seated_row'],
    ['Leg Press', 'leg_press'],
    ['Face Pull (Cable)', 'face_pull'],
    ['Hammer Curl (Dumbbell)', 'hammer_curl'],
  ])('%s is %s', (name, id) => {
    expect(whole).toHaveLength(40);
    expect(one(name, whole).sure).toBe(id);
  });

  test.each([
    ['Deadlift (Barbell)', 'romanian_deadlift'],
    ['Bicep Curl (Barbell)', 'barbell_curl'],
    ['Incline Bench Press (Dumbbell)', 'incline_dumbbell_press'],
  ])('%s is offered, %s first', (name, id) => {
    const matched = one(name, whole);
    expect(matched.sure).toBeNull();
    expect(matched.suggestions[0]).toBe(id);
  });
});
