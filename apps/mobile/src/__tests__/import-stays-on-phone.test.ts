/**
 * The export file stays on this phone (K-609, ADR-053 §4): the files that read it — the CSV, the forms, the matching, the
 * building — import nothing that talks to a server and name no way to; only send.ts sends, and it sends what build.ts
 * made (the screen test checks that body holds no name or note of the file). The scan mirrors the progress photos' one
 * (photo-files.test.ts, K-614).
 */
import fs from 'node:fs';
import path from 'node:path';

const uncommented = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const READERS = ['csv.ts', 'formats.ts', 'match.ts', 'build.ts', 'params.ts'].map((name) => path.resolve(__dirname, '../import', name));
/** What a reader may import: types of the contract, the copy, the train module's parameters and moves' type, its siblings. */
const ALLOWED = [/^import type .* from '@\/api\/schema';$/, /^import type .* from '@\/train\/trainData';$/, /from '@\/copy';$/, /from '@\/train\/params';$/,
  /from '\.\/[a-z]+';$/, /^import type .* from '\.\/[a-z]+';$/, /from '(\.\.\/)+data\/parameters\/import\.json';$/];
const NETWORK = /\bapi\b|\bfetch\b|XMLHttpRequest|WebSocket|sendBeacon|EventSource|upload|axios|ServicesProvider/i;

const imports = (text: string) => text.split('\n').filter((line) => /^import\b/.test(line));
const body = (text: string) => text.split('\n').filter((line) => !/^import\b/.test(line)).join('\n');

test('every reader imports only what cannot reach a server', () => {
  const lines = READERS.flatMap((file) => imports(uncommented(fs.readFileSync(file, 'utf8'))).map((line) => `${path.basename(file)}: ${line}`));
  expect(lines.length).toBeGreaterThan(0);
  expect(lines.filter((line) => !ALLOWED.some((ok) => ok.test(line.split(': ').slice(1).join(': '))))).toEqual([]);
});

test('no reader names a way to the network', () => {
  expect(READERS.filter((file) => NETWORK.test(body(uncommented(fs.readFileSync(file, 'utf8'))))).map((f) => path.basename(f))).toEqual([]);
});

test('the scan catches what it is for', () => {
  const allowed = (line: string) => ALLOWED.some((ok) => ok.test(line));
  expect(allowed("import { api } from '@/api/client';")).toBe(false);
  expect(allowed("import type { components } from '@/api/schema';")).toBe(true);
  expect(allowed("import { components } from '@/api/schema';")).toBe(false); // a value import could be the client
  expect(allowed("import { useAppServices } from '@/services/ServicesProvider';")).toBe(false);
  expect(NETWORK.test("await fetch('https://x')")).toBe(true);
  expect(NETWORK.test('services.api.POST(x)')).toBe(true);
});
