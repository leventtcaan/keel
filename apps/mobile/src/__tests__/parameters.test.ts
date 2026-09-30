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
