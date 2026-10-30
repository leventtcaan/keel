/**
 * The "Add a move" picker's rules (Evre 7 B2, plan/evre-7-inceleme.md §12): five muscle groups people know by name, equipment,
 * "Popular for <group>" first, then the rest; a typed search across all of it. The lists are data/parameters/workout.json.
 */
import * as fs from 'fs';
import * as path from 'path';

import type { components } from '@/api/schema';
import { groupOf, groupsOf, pickerSections, subtitleOf } from '@/train/pickerSections';
import { workoutParams as P } from '@/train/params';
import type { Move } from '@/train/trainData';

type Equipment = components['schemas']['Equipment'];

const ROOT = path.resolve(__dirname, '../../../..');

/** Every catalog move as the API sends it: from data/exercises (kind, muscles, equipment). */
const catalog: Move[] = fs
  .readdirSync(path.join(ROOT, 'data/exercises'))
  .filter((f) => f.endsWith('.yaml'))
  .map((f) => {
    const text = fs.readFileSync(path.join(ROOT, 'data/exercises', f), 'utf8');
    const id = f.replace(/\.yaml$/, '');
    const muscles = /^muscles: \[(.*)\]$/m.exec(text)?.[1].split(', ') ?? [];
    return {
      id,
      nameKey: `exercises.${id}.name`,
      kind: /^kind: compound$/m.test(text) ? 'COMPOUND' : 'ISOLATION',
      muscles,
      alternatives: [],
      load: 'EXTERNAL',
      equipment: (/^equipment: (\w+)$/m.exec(text)?.[1] ?? '').toUpperCase() as Equipment,
      unilateral: false,
      setupFields: [],
    } as Move;
  });
const byId = new Map(catalog.map((m) => [m.id, m]));
const ids = (moves: Move[]) => moves.map((m) => m.id);

describe('the groups', () => {
  test('a move is in the group of its first muscle', () => {
    expect(groupOf(byId.get('bench_press')!)).toBe('chest');
    expect(groupOf(byId.get('face_pull')!)).toBe('shoulders');
    expect(groupOf(byId.get('barbell_row')!)).toBe('back');
    expect(groupOf(byId.get('hip_thrust')!)).toBe('legs');
    expect(groupOf(byId.get('hammer_curl')!)).toBe('arms');
  });

  test('every catalog move is in a group; an own move (no muscles) is in none', () => {
    for (const move of catalog) expect(groupOf(move)).toBeDefined();
    expect(groupOf({ ...byId.get('squat')!, muscles: [] })).toBeUndefined();
  });

  test('the groups in the order the parameters give', () => {
    expect(groupsOf()).toEqual(['chest', 'back', 'shoulders', 'arms', 'legs']);
  });
});

describe('the popular moves are real: each a catalog move of its own group', () => {
  test.each(Object.entries(P.movePickerPopular))('%s', (group, popular) => {
    expect(popular.length).toBeGreaterThanOrEqual(3);
    for (const id of popular) {
      expect(byId.has(id)).toBe(true);
      expect(groupOf(byId.get(id)!)).toBe(group);
    }
  });
});

describe('opening the picker (nothing typed, no chip)', () => {
  test('the day takes the picker to its own groups: "Popular for" the two it trains most, then every other move A to Z', () => {
    const day = ['bench_press', 'incline_dumbbell_press', 'triceps_pushdown'].map((id) => byId.get(id)!);
    const offered = catalog.filter((m) => !day.includes(m));
    const sections = pickerSections({ offered, day, query: '', group: null, equipment: null });
    expect(sections.map((s) => s.kind)).toEqual(['popular', 'popular', 'all']);
    expect(sections[0]).toMatchObject({ kind: 'popular', group: 'chest' });
    expect(sections[1]).toMatchObject({ kind: 'popular', group: 'arms' });
    // The popular ones the day has are not offered again; the rest of the group's popular moves are.
    expect(ids(sections[0].moves)).toEqual(['cable_fly']);
    expect(ids(sections[1].moves)).toEqual(['dumbbell_curl', 'hammer_curl']);
    // Moves shown above are not in the A to Z list.
    const shown = new Set([...sections[0].moves, ...sections[1].moves].map((m) => m.id));
    expect(sections[2].moves.some((m) => shown.has(m.id))).toBe(false);
    const names = ids(sections[2].moves);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  test('a day with no moves yet: one "Popular" list, a main lift of each group, then all', () => {
    const sections = pickerSections({ offered: catalog, day: [], query: '', group: null, equipment: null });
    expect(sections.map((s) => s.kind)).toEqual(['popularMix', 'all']);
    expect(ids(sections[0].moves)).toEqual(['bench_press', 'lat_pulldown', 'dumbbell_shoulder_press', 'dumbbell_curl', 'squat']);
  });
});

describe('a muscle chip', () => {
  test('"Popular for chest" first, in the order of the list, then the rest of the chest moves', () => {
    const sections = pickerSections({ offered: catalog, day: [], query: '', group: 'chest', equipment: null });
    expect(sections.map((s) => s.kind)).toEqual(['popular', 'more']);
    expect(ids(sections[0].moves)).toEqual(['bench_press', 'incline_dumbbell_press', 'cable_fly']);
    // Compound moves before isolation ones, then by name; only chest moves.
    expect(ids(sections[1].moves)).toEqual(['dip', 'dumbbell_bench_press', 'machine_chest_press', 'push_up', 'pec_deck']);
  });

  test('with an equipment chip too: both must hold, and a popular move of other equipment is not shown', () => {
    const sections = pickerSections({ offered: catalog, day: [], query: '', group: 'chest', equipment: 'DUMBBELL' });
    expect(ids(sections.flatMap((s) => s.moves))).toEqual(['incline_dumbbell_press', 'dumbbell_bench_press']);
    expect(sections[0]).toMatchObject({ kind: 'popular' });
  });

  test('a chip with nothing in it gives no sections', () => {
    expect(pickerSections({ offered: catalog.filter((m) => groupOf(m) !== 'chest'), day: [], query: '', group: 'chest', equipment: null })).toEqual([]);
  });
});

describe('equipment alone', () => {
  test('every move of that equipment, A to Z, popular ones of the day\'s groups first', () => {
    const sections = pickerSections({ offered: catalog, day: [], query: '', group: null, equipment: 'CABLE' });
    expect(sections.at(-1)).toMatchObject({ kind: 'all' });
    expect(ids(sections.flatMap((s) => s.moves)).every((id) => byId.get(id)!.equipment === 'CABLE')).toBe(true);
  });
});

describe('a typed search', () => {
  test('one list of results (name, or what people also call it), the chips narrow it', () => {
    const found = pickerSections({ offered: catalog, day: [], query: 'curl', group: null, equipment: null });
    expect(found).toHaveLength(1);
    expect(found[0].kind).toBe('results');
    expect(ids(found[0].moves)).toContain('dumbbell_curl');
    const narrowed = pickerSections({ offered: catalog, day: [], query: 'curl', group: null, equipment: 'BARBELL' });
    expect(ids(narrowed[0].moves).every((id) => byId.get(id)!.equipment === 'BARBELL')).toBe(true);
  });

  test('nothing found: no sections (the screen says so and offers the user\'s own move)', () => {
    expect(pickerSections({ offered: catalog, day: [], query: 'zzzz', group: null, equipment: null })).toEqual([]);
  });
});

describe('the line under a move', () => {
  test('its main muscle and what it is lifted with', () => {
    expect(subtitleOf(byId.get('bench_press')!)).toBe('Chest · Barbell');
    expect(subtitleOf(byId.get('push_up')!)).toBe('Chest · Your body');
  });

  test('an own move says what it is lifted with, and no muscle it is not known to work', () => {
    expect(subtitleOf({ ...byId.get('squat')!, muscles: [], name: 'My squat' })).toBe('Barbell');
  });
});
