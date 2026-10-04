/**
 * The photos' folder on the phone (K-614, V1): expo-file-system's document directory, `progress-photos/`. A taken photo is
 * moved in (replacing one of the same name), listed back by name, and the whole folder deleted on forget. Nothing here
 * reaches the network: the file system's own upload is never called, and no file under src/photos can call it, fetch or the
 * API client (source scan).
 */
import * as fs from 'fs';
import * as path from 'path';

import { devicePhotoFiles } from '@/photos/photoFiles';

const mockDisk = new Map<string, 'file' | 'dir'>();
const mockUpload = jest.fn();
const mockMoves: [string, string, unknown][] = [];

jest.mock('expo-file-system', () => {
  const join = (parts: unknown[]) => parts.map((p) => (typeof p === 'string' ? p : (p as { uri: string }).uri)).join('/');
  class Entry {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    get name() {
      return this.uri.split('/').pop() as string;
    }
    upload = mockUpload;
    createUploadTask = mockUpload;
  }
  class File extends Entry {
    get exists() {
      return mockDisk.get(this.uri) === 'file';
    }
    delete() {
      mockDisk.delete(this.uri);
    }
    async move(to: File, options: unknown) {
      mockMoves.push([this.uri, to.uri, options]);
      mockDisk.delete(this.uri);
      mockDisk.set(to.uri, 'file');
    }
  }
  class Directory extends Entry {
    get exists() {
      return mockDisk.get(this.uri) === 'dir';
    }
    create(options: { intermediates?: boolean }) {
      if (options?.intermediates !== true) throw new Error('no intermediates');
      if (this.exists) throw new Error('already exists'); // as the native validateCanCreate
      mockDisk.set(this.uri, 'dir');
    }
    delete() {
      if (!this.exists) throw new Error('no such folder');
      for (const key of [...mockDisk.keys()]) if (key === this.uri || key.startsWith(`${this.uri}/`)) mockDisk.delete(key);
    }
    list() {
      return [...mockDisk.entries()]
        .filter(([key]) => key.startsWith(`${this.uri}/`) && !key.slice(this.uri.length + 1).includes('/'))
        .map(([key, kind]) => (kind === 'dir' ? new Directory(key) : new File(key)));
    }
  }
  return { File, Directory, Paths: { document: { uri: 'file:///docs' } } };
});

const fetchSpy = jest.fn();
beforeEach(() => {
  mockDisk.clear();
  mockMoves.length = 0;
  global.fetch = fetchSpy;
});
afterEach(() => {
  // The photo never leaves the phone: no request of any kind, no upload by the file system.
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(mockUpload).not.toHaveBeenCalled();
});

const FOLDER = 'file:///docs/progress-photos';

test('no folder yet: no photos', async () => {
  expect(await devicePhotoFiles().names()).toEqual([]);
});

test('keeping moves the file into the folder (made if missing), replacing one of that name', async () => {
  mockDisk.set('file:///cache/Camera/a.jpg', 'file');
  const files = devicePhotoFiles();
  await files.keep('file:///cache/Camera/a.jpg', '2026-10-07-front.jpg');
  expect(mockMoves).toEqual([['file:///cache/Camera/a.jpg', `${FOLDER}/2026-10-07-front.jpg`, { overwrite: true }]]);
  expect(mockDisk.has('file:///cache/Camera/a.jpg')).toBe(false); // nothing left behind in the cache
  expect(await files.names()).toEqual(['2026-10-07-front.jpg']);
  expect(files.uriOf('2026-10-07-front.jpg')).toBe(`${FOLDER}/2026-10-07-front.jpg`);
  // The folder there now: a second photo goes in without making it again.
  mockDisk.set('file:///cache/Camera/b.jpg', 'file');
  await files.keep('file:///cache/Camera/b.jpg', '2026-10-07-side.jpg');
  expect((await files.names()).sort()).toEqual(['2026-10-07-front.jpg', '2026-10-07-side.jpg']);
});

test('names are the folder files, not its folders', async () => {
  mockDisk.set(FOLDER, 'dir');
  mockDisk.set(`${FOLDER}/2026-10-07-front.jpg`, 'file');
  mockDisk.set(`${FOLDER}/thumbs`, 'dir');
  expect(await devicePhotoFiles().names()).toEqual(['2026-10-07-front.jpg']);
});

test('clear deletes the folder and every photo in it; with no folder it does nothing', async () => {
  const files = devicePhotoFiles();
  await files.clear();
  mockDisk.set(FOLDER, 'dir');
  mockDisk.set(`${FOLDER}/2026-10-07-front.jpg`, 'file');
  await files.clear();
  expect([...mockDisk.keys()]).toEqual([]);
});

/** Every .ts/.tsx under a folder, its subfolders included. */
function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sources(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}
/** The code without its comments: "never uploaded" in a comment is not a call. */
const uncommented = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const code = (file: string) => uncommented(fs.readFileSync(file, 'utf8'));
/** What a file under src/photos may import: nothing that talks to a server. */
const ALLOWED = [/^react$/, /^react-native$/, /^react-native-svg$/, /^expo-file-system$/, /^expo-router$/, /^@\/components\//, /^@\/copy$/,
  /^@\/theme\//, /^@\/settings\/Confirm$/, /^@\/services\/ServicesProvider$/, /^@\/onboarding\/params$/, /^@\/train\/program$/, /^\.\//,
  /^(\.\.\/)+data\/parameters\/[a-z]+\.json$/];
/** Ways to reach the network, or the API client, by any name. */
const NETWORK = /\bapi\b|\bfetch\b|XMLHttpRequest|WebSocket|sendBeacon|EventSource|upload|axios/i;

const PHOTOS = path.resolve(__dirname, '../photos');

test('no file under src/photos can reach the network: it imports nothing that does, and names no way to', () => {
  const imports = sources(PHOTOS).flatMap((file) =>
    [...code(file).matchAll(/from\s+['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)|import\(\s*['"]([^'"]+)['"]\s*\)/g)].map(
      (m) => `${path.relative(PHOTOS, file)}: ${m[1] ?? m[2] ?? m[3]}`,
    ),
  );
  expect(imports.length).toBeGreaterThan(0);
  expect(imports.filter((line) => !ALLOWED.some((ok) => ok.test(line.split(': ')[1])))).toEqual([]);
  expect(sources(PHOTOS).filter((file) => NETWORK.test(code(file))).map((file) => path.relative(PHOTOS, file))).toEqual([]);
});

test('the scan catches the ways a photo could be sent', () => {
  const caught = (text: string) => NETWORK.test(text);
  expect(caught("const { photos, api } = useAppServices(); api.POST('/v1/photos')")).toBe(true);
  expect(caught('const s = useAppServices(); s.api.PUT(x)')).toBe(true);
  expect(caught('new XMLHttpRequest()')).toBe(true);
  expect(caught('fetch.call(null, url)')).toBe(true);
  expect(caught("file['upload'](url)")).toBe(true);
  expect(caught('navigator.sendBeacon(url, body)')).toBe(true);
  expect(caught('photos.checks()')).toBe(false);
  const allowed = (from: string) => ALLOWED.some((ok) => ok.test(from));
  expect(allowed('@/api/client')).toBe(false);
  expect(allowed('../api/client')).toBe(false);
  expect(allowed('openapi-fetch')).toBe(false);
  expect(allowed('@/today/today')).toBe(false); // it holds load(), which calls the server
  expect(allowed('./library')).toBe(true);
  expect(uncommented('a(); // never uploaded\n/* fetch */ b("file://x")')).toBe('a(); \n b("file://x")');
});
