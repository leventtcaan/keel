/**
 * What goes to the server (K-609, ADR-053 §3-4): only the mapped sets — a move's id, warm-up or working, the load in kg
 * as the move's load model counts it, the reps — in chunks of import_workouts_per_request. A set that cannot be one is
 * left out and counted, never bent to fit; the same file brought in twice is the same sessions (their ids come from it).
 */
import type { components } from '@/api/schema';
import { buildImport, sessionIds, uuidFromDigest } from '@/import/build';
import type { FileSession } from '@/import/formats';
import { importParams } from '@/import/params';
import { workoutParams } from '@/train/params';
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
const MOVES = new Map(
  [
    move('bench_press', 'BARBELL'),
    move('dumbbell_bench_press', 'DUMBBELL'),
    move('push_up', 'BODYWEIGHT', 'BODYWEIGHT'),
    move('pull_up', 'BODYWEIGHT', 'BODYWEIGHT_PLUS_EXTERNAL'),
    move('one_arm_dumbbell_row', 'DUMBBELL', 'EXTERNAL', true),
  ].map((m) => [m.id, m]),
);
const at = (day: number, hour = 18) => new Date(2025, 0, day, hour, 0, 0);
const session = (day: number, sets: FileSession['sets']): FileSession => ({ startedAt: at(day), endedAt: at(day, 19), sets });
const set = (name: string, weight: number, reps = 8, warmUp = false) => ({ name, warmUp, weight, reps });
// SHA-256 as on the phone (expo-crypto there, node here).
const digest = async (text: string) => jest.requireActual<typeof import('node:crypto')>('node:crypto').createHash('sha256').update(text).digest('hex');
const CHOICES = new Map<string, string | null>([
  ['Bench Press (Barbell)', 'bench_press'],
  ['Bench Press (Dumbbell)', 'dumbbell_bench_press'],
  ['Push Up', 'push_up'],
  ['Pull Up', 'pull_up'],
  ['Dumbbell Row', 'one_arm_dumbbell_row'],
  ['Deadlift (Barbell)', null],
]);
const build = async (sessions: FileSession[], options: Partial<Parameters<typeof buildImport>[0]> = {}) => {
  const source = options.source ?? 'STRONG';
  const ids = await sessionIds(source, sessions, digest);
  return buildImport({ source, sessions, ids, choices: CHOICES, moves: MOVES, unit: 'kg', dumbbells: 'one', ...options });
};

test('a mapped set: the move, warm-up or working, kg, reps; the times as instants', async () => {
  const built = await build([session(18, [set('Bench Press (Barbell)', 20, 12, true), set('Bench Press (Barbell)', 60, 8)])]);

  expect(built.chunks).toHaveLength(1);
  expect(built.chunks[0].source).toBe('STRONG');
  const [sent] = built.chunks[0].workouts;
  expect(sent.startedAt).toBe(at(18).toISOString());
  expect(sent.endedAt).toBe(at(18, 19).toISOString());
  expect(sent.sets).toEqual([
    { exerciseId: 'bench_press', setType: 'WARM_UP', loadKg: 20, reps: 12 },
    { exerciseId: 'bench_press', setType: 'WORKING', loadKg: 60, reps: 8 },
  ]);
  expect(built).toMatchObject({ sessions: 1, sets: 2, leftOut: 0, skipped: 0 });
});

test('pounds become kilograms by the exact factor, to the hundredth', async () => {
  const built = await build([session(18, [set('Bench Press (Barbell)', 135)])], { unit: 'lb' });

  expect(built.chunks[0].workouts[0].sets[0].loadKg).toBe(61.23); // 135 × 0.45359237 = 61.235
});

test('a file that counted both dumbbells: a dumbbell move takes one; other moves are as they were', async () => {
  const built = await build([session(18, [set('Bench Press (Dumbbell)', 60), set('Bench Press (Barbell)', 60)])], { dumbbells: 'both' });

  expect(built.chunks[0].workouts[0].sets.map((s) => s.loadKg)).toEqual([30, 60]);
});

test('a one-arm dumbbell move holds one dumbbell however the file counted pairs', async () => {
  const built = await build([session(18, [set('Dumbbell Row', 30, 10)])], { dumbbells: 'both' });

  expect(built.chunks[0].workouts[0].sets[0].loadKg).toBe(30);
});

test('a name the user skipped is not sent, and is counted apart from what could not be a set', async () => {
  const built = await build([session(18, [set('Deadlift (Barbell)', 140, 3), set('Bench Press (Barbell)', 60)])]);

  expect(built.chunks[0].workouts[0].sets.map((s) => s.exerciseId)).toEqual(['bench_press']);
  expect(built).toMatchObject({ sets: 1, skipped: 1, leftOut: 0 });
});

test('a load on a bodyweight-only move cannot be a set: left out, not set to 0; an added load on a pull-up is one', async () => {
  const built = await build([session(18, [set('Push Up', 10, 20), set('Push Up', 0, 20), set('Pull Up', 10, 6)])]);

  expect(built.chunks[0].workouts[0].sets).toEqual([
    { exerciseId: 'push_up', setType: 'WORKING', loadKg: 0, reps: 20 },
    { exerciseId: 'pull_up', setType: 'WORKING', loadKg: 10, reps: 6 },
  ]);
  expect(built.leftOut).toBe(1);
});

test('over the load or rep limit is left out', async () => {
  const built = await build([
    session(18, [set('Bench Press (Barbell)', workoutParams.maxLoadKg + 1), set('Bench Press (Barbell)', 60, workoutParams.maxReps + 1)]),
    session(19, [set('Bench Press (Barbell)', 60)]),
  ]);

  expect(built).toMatchObject({ sessions: 1, sets: 1, leftOut: 2 });
});

test('a session with nothing left to send is not sent', async () => {
  const built = await build([session(18, [set('Deadlift (Barbell)', 140, 3)])]);

  expect(built.chunks).toEqual([]);
  expect(built).toMatchObject({ sessions: 0, skipped: 1 });
});

test('a session over the sets one request may carry keeps the first ones and counts the rest left out', async () => {
  const many = Array.from({ length: importParams.setsPerSessionMax + 2 }, () => set('Bench Press (Barbell)', 60));
  const built = await build([session(18, many)]);

  expect(built.chunks[0].workouts[0].sets).toHaveLength(importParams.setsPerSessionMax);
  expect(built.leftOut).toBe(2);
});

test('chunks of import_workouts_per_request sessions, oldest first', async () => {
  const sessions = Array.from({ length: importParams.workoutsPerRequest + 1 }, (_, i) => session(i + 1, [set('Bench Press (Barbell)', 60)]));
  const built = await build(sessions);

  expect(built.chunks.map((c) => c.workouts.length)).toEqual([importParams.workoutsPerRequest, 1]);
  expect(built.chunks[1].workouts[0].startedAt).toBe(at(importParams.workoutsPerRequest + 1).toISOString());
});

test('the same file twice is the same session ids; another start, another id; two sessions at one start, two ids', async () => {
  const a = await build([session(18, [set('Bench Press (Barbell)', 60)])]);
  const again = await build([session(18, [set('Bench Press (Barbell)', 70)])]);
  const other = await build([session(19, [set('Bench Press (Barbell)', 60)])]);
  const twin = await build([session(18, [set('Bench Press (Barbell)', 60)]), session(18, [set('Bench Press (Barbell)', 60)])]);

  expect(again.chunks[0].workouts[0].clientId).toBe(a.chunks[0].workouts[0].clientId);
  expect(other.chunks[0].workouts[0].clientId).not.toBe(a.chunks[0].workouts[0].clientId);
  expect(new Set(twin.chunks[0].workouts.map((w) => w.clientId)).size).toBe(2);
  expect(a.chunks[0].workouts[0].clientId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('an id from a digest is a version-8 UUID', () => {
  expect(uuidFromDigest('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')).toBe('01234567-89ab-8def-8123-456789abcdef');
});

test('nothing of the file but the mapped set goes: no names, no notes', async () => {
  const built = await build([session(18, [set('Bench Press (Barbell)', 60)])]);

  expect(JSON.stringify(built.chunks)).not.toContain('Bench Press');
});

describe('ids come from the file alone (K-609 review)', () => {
  const twins = [session(18, [set('Pull Up', 0, 8)]), session(18, [set('Bench Press (Barbell)', 60)])];

  test('a choice changes no id: two sessions at one start keep theirs whichever is brought in', async () => {
    const ids = await sessionIds('HEVY', twins, digest);
    const onlyBench = buildImport({ source: 'HEVY', sessions: twins, ids, choices: new Map([['Bench Press (Barbell)', 'bench_press']]), moves: MOVES, unit: 'kg', dumbbells: 'one' });
    const both = buildImport({ source: 'HEVY', sessions: twins, ids, choices: CHOICES, moves: MOVES, unit: 'kg', dumbbells: 'one' });

    expect(onlyBench.chunks[0].workouts[0].clientId).toBe(ids[1]);
    expect(both.chunks[0].workouts.map((w) => w.clientId)).toEqual(ids);
    expect(new Set(ids).size).toBe(2);
  });

  test('an id does not depend on the other sessions of the file', async () => {
    const [, alone] = [await sessionIds('STRONG', [session(17, []), session(18, [])], digest), await sessionIds('STRONG', [session(18, [])], digest)];
    expect((await sessionIds('STRONG', [session(17, []), session(18, [])], digest))[1]).toBe(alone[0]);
  });

  test('the same start from the other app is another session', async () => {
    const [strong] = await sessionIds('STRONG', [session(18, [])], digest);
    const [hevy] = await sessionIds('HEVY', [session(18, [])], digest);
    expect(hevy).not.toBe(strong);
  });
});

test('one dumbbell counted as one: the load as the file has it', async () => {
  const built = await build([session(18, [set('Bench Press (Dumbbell)', 30)])], { dumbbells: 'one' });

  expect(built.chunks[0].workouts[0].sets[0].loadKg).toBe(30);
});

test('a set at the load and rep limits is a set', async () => {
  const built = await build([session(18, [set('Bench Press (Barbell)', workoutParams.maxLoadKg, workoutParams.maxReps)])]);

  expect(built.leftOut).toBe(0);
});
