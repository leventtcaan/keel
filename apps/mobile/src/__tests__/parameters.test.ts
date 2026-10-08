// constitution-audit (tools/anayasa-denetimi.sh)
/**
 * The parameters the phone reads (data/parameters/*.json, ADR-029) keep the same provenance rule as the engine's YAML
 * (anayasa U14, data/parameters/README.md): every value has a unit, a tag and a source that exists — the file, and the
 * anchor in it (a heading for Markdown, a defined name — `Name:` on its own line — for YAML such as the contract).
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../../..');
const DIR = path.join(ROOT, 'data/parameters');
const TAGS = ['tecrube', 'literatur', 'urun'];

type Parameter = { key: string; value: unknown; unit: string; tag: string; source: string; note?: string };

const files = fs.readdirSync(DIR).filter((file) => file.endsWith('.json'));

function anchorExists(source: string): boolean {
  const [file, anchor] = source.split('#');
  const full = path.join(ROOT, file);
  if (anchor === undefined || anchor === '' || !fs.existsSync(full)) return false;
  const text = fs.readFileSync(full, 'utf8');
  if (!file.endsWith('.md')) return text.split('\n').some((line) => line.trim() === `${anchor}:`);
  // A Markdown anchor is a heading: "## 7 · …", "### K-17 · …", "### 1.3 …".
  return text.split('\n').some((line) => /^#{1,6} /.test(line) && line.replace(/^#{1,6} /, '').startsWith(`${anchor} `));
}

test('there is at least one phone parameter file', () => {
  expect(files.length).toBeGreaterThan(0);
});

test.each(files)('%s: every parameter has a key, a value, a unit, a tag and a source that exists', (file) => {
  const { parameters } = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8')) as { parameters: Parameter[] };
  const wrong = parameters.filter(
    (p) =>
      !/^[a-z][a-z0-9_]*$/.test(p.key) ||
      p.value === undefined ||
      typeof p.unit !== 'string' ||
      !TAGS.includes(p.tag) ||
      !anchorExists(p.source),
  );
  expect(wrong.map((p) => p.key)).toEqual([]);
  expect(new Set(parameters.map((p) => p.key)).size).toBe(parameters.length);
});

test('an anchor that is not there is caught', () => {
  expect(anchorExists('arastirma/ham/L3-ozellik-boslugu.md#7')).toBe(true);
  expect(anchorExists('arastirma/ham/L3-ozellik-boslugu.md#77')).toBe(false);
  expect(anchorExists('arastirma/ham/nope.md#1')).toBe(false);
  expect(anchorExists('contracts/openapi.yaml#no such text here')).toBe(false);
  expect(anchorExists('contracts/openapi.yaml#NewWeighIn')).toBe(true);
  expect(anchorExists('contracts/openapi.yaml#exclusiveMinimum')).toBe(false); // a key with a value is not a definition
});

describe('the precision the phone rounds to is the one the contract keeps', () => {
  const contract = fs.readFileSync(path.join(ROOT, 'contracts/openapi.yaml'), 'utf8').split('\n');
  const units = (JSON.parse(fs.readFileSync(path.join(DIR, 'units.json'), 'utf8')) as { parameters: Parameter[] }).parameters;
  const value = (key: string) => units.find((p) => p.key === key)?.value;

  /** "At most N decimal(s)" in the description of `schema.field`. */
  function decimals(schema: string, field: string): number {
    const start = contract.findIndex((line) => line.trim() === `${schema}:`);
    const at = contract.findIndex((line, i) => i > start && line.trim() === `${field}:`);
    const block = contract.slice(at, at + 8).join(' ');
    const match = /At most (\d+) decimal/.exec(block);
    if (start < 0 || at < 0 || match === null) throw new Error(`no precision for ${schema}.${field}`);
    return Number(match[1]);
  }

  test.each([
    ['stored_kg_decimals', 'NewWeighIn', 'kg'],
    ['stored_kg_decimals', 'NewSet', 'loadKg'],
    ['stored_waist_cm_decimals', 'NewWaistMeasurement', 'cm'],
  ])('%s = %s.%s', (key, schema, field) => {
    expect(value(key)).toBe(decimals(schema, field));
  });
});

describe('the onboarding limits are the contract\'s (K-306)', () => {
  const contract = fs.readFileSync(path.join(ROOT, 'contracts/openapi.yaml'), 'utf8').split('\n');
  const onboarding = (JSON.parse(fs.readFileSync(path.join(DIR, 'onboarding.json'), 'utf8')) as { parameters: Parameter[] })
    .parameters;
  const value = (key: string) => onboarding.find((p) => p.key === key)?.value;

  /** The lines of `schema.field` in the contract, up to the next field at the same indent. */
  function field(schema: string, name: string): string {
    const start = contract.findIndex((line) => line.trim() === `${schema}:`);
    const at = contract.findIndex((line, i) => i > start && line.trim() === `${name}:`);
    if (start < 0 || at < 0) throw new Error(`no ${schema}.${name}`);
    const indent = contract[at].search(/\S/);
    const end = contract.findIndex((line, i) => i > at && line.trim() !== '' && line.search(/\S/) <= indent);
    return contract.slice(at, end).join('\n');
  }
  const number = (block: string, key: string) => Number(new RegExp(`${key}: (\\d+)`).exec(block)?.[1]);

  test('max_training_days = ProgramRequest.trainingDays maxItems', () => {
    expect(value('max_training_days')).toBe(number(field('ProgramRequest', 'trainingDays'), 'maxItems'));
  });

  test('height_min_cm and height_max_cm = Profile.heightCm minimum and maximum', () => {
    const height = field('Profile', 'heightCm');
    expect([value('height_min_cm'), value('height_max_cm')]).toEqual([number(height, 'minimum'), number(height, 'maximum')]);
  });

  test('birth_year_min = Profile.birthYear minimum, and adult_min_year_gap is the gap its description gives', () => {
    const year = field('Profile', 'birthYear');
    expect(value('birth_year_min')).toBe(number(year, 'minimum'));
    expect(value('adult_min_year_gap')).toBe(Number(/must be at least (\d+)/.exec(year)?.[1]));
  });
});

describe('the onboarding promises the engine\'s own numbers (K-306)', () => {
  const onboarding = (JSON.parse(fs.readFileSync(path.join(DIR, 'onboarding.json'), 'utf8')) as { parameters: Parameter[] })
    .parameters;

  /** `value:` of `key` in an engine YAML file (a plain number). */
  function yamlValue(file: string, key: string): number {
    const lines = fs.readFileSync(path.join(DIR, file), 'utf8').split('\n');
    const at = lines.findIndex((line) => line.trim() === `- key: ${key}`);
    const value = /value: (\d+)/.exec(lines[at + 1] ?? '');
    if (at < 0 || value === null) throw new Error(`no ${key} in ${file}`);
    return Number(value[1]);
  }

  test.each([
    ['photo_interval_weeks', 'measurement.yaml'],
    ['no_interpretation_days', 'windows.yaml'],
  ])('%s = %s', (key, file) => {
    expect(onboarding.find((p) => p.key === key)?.value).toBe(yamlValue(file, key));
  });
});

describe('the starting measurements stay within what the contract keeps (K-312)', () => {
  const contract = fs.readFileSync(path.join(ROOT, 'contracts/openapi.yaml'), 'utf8').split('\n');
  const onboarding = (JSON.parse(fs.readFileSync(path.join(DIR, 'onboarding.json'), 'utf8')) as { parameters: Parameter[] })
    .parameters;
  function maximum(schema: string, field: string): number {
    const start = contract.findIndex((line) => line.trim() === `${schema}:`);
    const at = contract.findIndex((line, i) => i > start && line.trim() === `${field}:`);
    const found = contract.slice(at, at + 8).map((line) => /maximum: (\d+)/.exec(line)).find((m) => m !== null);
    if (start < 0 || at < 0 || found === undefined || found === null) throw new Error(`no maximum for ${schema}.${field}`);
    return Number(found[1]);
  }
  test.each([
    ['weigh_in_max_kg', 'NewWeighIn', 'kg'],
    ['waist_max_cm', 'NewWaistMeasurement', 'cm'],
  ])('%s = %s.%s maximum', (key, schema, field) => {
    expect(onboarding.find((p) => p.key === key)?.value).toBe(maximum(schema, field));
  });
});

describe('the program draft stays within what the contract takes (K-957)', () => {
  const contract = fs.readFileSync(path.join(ROOT, 'contracts/openapi.yaml'), 'utf8').split('\n');
  const workout = (JSON.parse(fs.readFileSync(path.join(DIR, 'workout.json'), 'utf8')) as { parameters: Parameter[] }).parameters;
  /** The first `key: N` after `schema:` and then its `field:` in the contract. */
  function limit(schema: string, field: string, key: string): number {
    const start = contract.findIndex((line) => line.trim() === `${schema}:`);
    const at = contract.findIndex((line, i) => i > start && line.trim() === `${field}:`);
    const found = contract.slice(at).map((line) => new RegExp(`^\\s*${key}: (\\d+)$`).exec(line)).find((m) => m !== null);
    if (start < 0 || at < 0 || found === undefined || found === null) throw new Error(`no ${key} for ${schema}.${field}`);
    return Number(found[1]);
  }
  test.each([
    ['program_days_max', 'days', 'maxItems'],
    ['program_day_moves_max', 'exercises', 'maxItems'],
    ['program_move_sets_max', 'sets', 'maximum'],
    ['program_day_name_max_chars', 'name', 'maxLength'],
  ])('%s = OwnProgram %s %s', (key, field, word) => {
    expect(workout.find((p) => p.key === key)?.value).toBe(limit('OwnProgram', field, word));
  });
});
