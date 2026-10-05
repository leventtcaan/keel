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

/** The backup exclusion (K-618): what it was asked to mark, in order; a uri in `refuse` throws as iOS would. */
function fakeBackup(refuse: string[] = []) {
  const marked: string[] = [];
  return {
    marked,
    exclude(uri: string) {
      // iOS's own message names the file: what must never reach a report (V3).
      if (refuse.includes(uri)) throw new Error(`The file “${uri.split('/').pop()}” couldn’t be saved because you don’t have permission.`);
      marked.push(uri);
    },
  };
}
const ourBuild = () => false;
const onIos = 'ios' as const;

test('a kept photo is left out of backups, and so is its folder (K-618)', async () => {
  const backup = fakeBackup();
  const files = devicePhotoFiles({ backup, inExpoGo: ourBuild, platform: onIos });
  mockDisk.set('file:///cache/Camera/a.jpg', 'file');
  await files.keep('file:///cache/Camera/a.jpg', '2026-10-07-front.jpg');
  expect(backup.marked).toEqual([FOLDER, `${FOLDER}/2026-10-07-front.jpg`]);
});

test('the first listing leaves the folder and every photo already there out of backups, once (photos kept before K-618)', async () => {
  mockDisk.set(FOLDER, 'dir');
  mockDisk.set(`${FOLDER}/2026-09-01-front.jpg`, 'file');
  mockDisk.set(`${FOLDER}/2026-09-01-side.jpg`, 'file');
  mockDisk.set(`${FOLDER}/thumbs`, 'dir');
  const backup = fakeBackup();
  const files = devicePhotoFiles({ backup, inExpoGo: ourBuild, platform: onIos });
  expect(await files.names()).toHaveLength(2);
  expect(backup.marked).toEqual([FOLDER, `${FOLDER}/2026-09-01-front.jpg`, `${FOLDER}/2026-09-01-side.jpg`]);
  await files.names();
  expect(backup.marked).toHaveLength(3); // not again in this run of the app
});

test('no folder yet: the listing marks nothing, and the first kept photo marks the new folder', async () => {
  const backup = fakeBackup();
  const files = devicePhotoFiles({ backup, inExpoGo: ourBuild, platform: onIos });
  await files.names();
  expect(backup.marked).toEqual([]);
  mockDisk.set('file:///cache/Camera/a.jpg', 'file');
  await files.keep('file:///cache/Camera/a.jpg', '2026-10-07-front.jpg');
  expect(backup.marked).toEqual([FOLDER, `${FOLDER}/2026-10-07-front.jpg`]);
});

test('a refused exclusion is reported by name; the photo stays kept, and the next listing tries again', async () => {
  const report = jest.fn();
  const refuse = [`${FOLDER}/2026-10-07-front.jpg`];
  const backup = fakeBackup(refuse);
  const files = devicePhotoFiles({ backup, inExpoGo: ourBuild, platform: onIos, report });
  mockDisk.set('file:///cache/Camera/a.jpg', 'file');
  await files.keep('file:///cache/Camera/a.jpg', '2026-10-07-front.jpg');
  expect(report).toHaveBeenCalledWith({ name: 'BackupExclusionFailed' });
  expect(report.mock.calls).toEqual([[{ name: 'BackupExclusionFailed' }]]); // the name only: not iOS's message, which names the file (V3)
  expect(await files.names()).toEqual(['2026-10-07-front.jpg']);
  refuse.length = 0;
  await files.names();
  expect(backup.marked).toContain(`${FOLDER}/2026-10-07-front.jpg`);
  backup.marked.length = 0;
  await files.names();
  expect(backup.marked).toEqual([]); // swept once it succeeded
});

test('after a clean sweep, a photo whose exclusion is refused is tried again at the next listing', async () => {
  mockDisk.set(FOLDER, 'dir');
  mockDisk.set(`${FOLDER}/2026-09-01-front.jpg`, 'file');
  const refuse = [`${FOLDER}/2026-10-07-front.jpg`];
  const backup = fakeBackup(refuse);
  const files = devicePhotoFiles({ backup, inExpoGo: ourBuild, platform: onIos });
  await files.names(); // swept: the folder and the September photo
  mockDisk.set('file:///cache/Camera/a.jpg', 'file');
  await files.keep('file:///cache/Camera/a.jpg', '2026-10-07-front.jpg');
  refuse.length = 0;
  await files.names();
  expect(backup.marked).toContain(`${FOLDER}/2026-10-07-front.jpg`);
});

test('one photo iOS refuses does not stop the sweep: every other photo is still left out', async () => {
  mockDisk.set(FOLDER, 'dir');
  mockDisk.set(`${FOLDER}/2026-09-01-front.jpg`, 'file');
  mockDisk.set(`${FOLDER}/2026-10-01-front.jpg`, 'file');
  const backup = fakeBackup([FOLDER, `${FOLDER}/2026-09-01-front.jpg`]);
  await devicePhotoFiles({ backup, inExpoGo: ourBuild, platform: onIos }).names();
  expect(backup.marked).toEqual([`${FOLDER}/2026-10-01-front.jpg`]);
});

test('Android: the module is iOS only (no Android build yet; its own backup is an open question), so nothing is reported there', async () => {
  const report = jest.fn();
  const files = devicePhotoFiles({ backup: null, inExpoGo: ourBuild, platform: 'android', report });
  mockDisk.set('file:///cache/Camera/a.jpg', 'file');
  await files.keep('file:///cache/Camera/a.jpg', '2026-10-07-front.jpg');
  expect(report).not.toHaveBeenCalled();
});

test('the JS asks for the module by the name the Swift gives it: else our own build finds none and says so only in a log', () => {
  const dir = path.resolve(__dirname, '../../modules/backup-exclusion');
  const asked = /requireOptionalNativeModule<\w+>\('(\w+)'\)/.exec(fs.readFileSync(path.join(dir, 'index.ts'), 'utf8'))?.[1];
  const named = /Name\("(\w+)"\)/.exec(fs.readFileSync(path.join(dir, 'ios/BackupExclusionModule.swift'), 'utf8'))?.[1];
  const config = JSON.parse(fs.readFileSync(path.join(dir, 'expo-module.config.json'), 'utf8')) as { apple: { modules: string[] } };
  expect(asked).toBe('BackupExclusion');
  expect(named).toBe(asked);
  expect(config.apple.modules).toEqual(['BackupExclusionModule']);
});

test('the Swift side, which is handed the photos, has no way to the network either', () => {
  const swift = path.resolve(__dirname, '../../modules/backup-exclusion/ios/BackupExclusionModule.swift');
  const body = fs.readFileSync(swift, 'utf8').replace(/\/\/.*$/gm, '');
  expect(body).toContain('isExcludedFromBackup');
  expect(/URLSession|NSURLConnection|upload|CKContainer|NWConnection|import Network/i.test(body)).toBe(false);
});

test('without the module: in Expo Go quietly; in our own build it is a broken build, reported by name — photos kept either way', async () => {
  for (const [inExpoGo, reported] of [[() => true, []], [ourBuild, [[{ name: 'BackupExclusionMissing' }]]]] as const) {
    mockDisk.clear();
    const report = jest.fn();
    const files = devicePhotoFiles({ backup: null, inExpoGo, platform: onIos, report });
    mockDisk.set('file:///cache/Camera/a.jpg', 'file');
    await files.keep('file:///cache/Camera/a.jpg', '2026-10-07-front.jpg');
    await files.names();
    expect(await files.names()).toEqual(['2026-10-07-front.jpg']);
    expect(report.mock.calls).toEqual(reported); // once, not at every call
  }
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
const ALLOWED = [/^react$/, /^expo$/, /^(\.\.\/)+modules\/backup-exclusion$/, /^react-native$/, /^react-native-svg$/, /^react-native-safe-area-context$/, /^expo-file-system$/, /^expo-router$/,
  /^expo-camera$/, /^expo-image-picker$/, /^expo-sensors$/, /^@\/components\//, /^@\/copy$/, /^@\/theme\//, /^@\/settings\/Confirm$/,
  /^@\/services\/ServicesProvider$/, /^@\/onboarding\/params$/, /^@\/train\/program$/, /^@\/photos\//, /^\.\//,
  /^(\.\.\/)+data\/parameters\/[a-z]+\.json$/];
/** The one thing taken from a module that also talks to the server: the calendar day (`today.ts` holds `load` too). */
const LOCAL_DAY_ONLY = /^import \{ localDay \} from '@\/today\/today';$/m;
/** Ways to reach the network, or the API client, by any name. */
const NETWORK = /\bapi\b|\bfetch\b|XMLHttpRequest|WebSocket|sendBeacon|EventSource|upload|axios/i;

const PHOTOS = path.resolve(__dirname, '../photos');
/** Every file that handles a progress photo: the photos folder, the capture screen (K-601), the comparison (K-602), the backup exclusion (K-618). */
const HANDLERS = () => [
  ...sources(PHOTOS),
  ...['photo-capture.tsx', 'compare.tsx'].map((name) => path.resolve(__dirname, '../app', name)),
  // The backup exclusion's JS face (K-618): it is handed the photos' uris.
  path.resolve(__dirname, '../../modules/backup-exclusion/index.ts'),
];

test('no file that handles a photo can reach the network: it imports nothing that does, and names no way to', () => {
  const imports = HANDLERS().flatMap((file) => {
    // The calendar day alone may come from today.ts; anything else from it is a way to the server.
    const text = code(file).replace(LOCAL_DAY_ONLY, '');
    return [...text.matchAll(/from\s+['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)|import\(\s*['"]([^'"]+)['"]\s*\)/g)].map(
      (m) => `${path.basename(file)}: ${m[1] ?? m[2] ?? m[3]}`,
    );
  });
  expect(imports.length).toBeGreaterThan(0);
  expect(imports.filter((line) => !ALLOWED.some((ok) => ok.test(line.split(': ')[1])))).toEqual([]);
  expect(HANDLERS().filter((file) => NETWORK.test(code(file))).map((file) => path.basename(file))).toEqual([]);
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
  expect(LOCAL_DAY_ONLY.test("import { localDay } from '@/today/today';")).toBe(true);
  expect(LOCAL_DAY_ONLY.test("import { load, localDay } from '@/today/today';")).toBe(false);
  expect(uncommented('a(); // never uploaded\n/* fetch */ b("file://x")')).toBe('a(); \n b("file://x")');
});
