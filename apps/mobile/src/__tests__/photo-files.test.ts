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
      mockDisk.set(this.uri, 'dir');
    }
    delete() {
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

test('no file under src/photos can reach the network', () => {
  const dir = path.resolve(__dirname, '../photos');
  const offenders = fs
    .readdirSync(dir)
    .filter((name) => /\.(ts|tsx)$/.test(name))
    .filter((name) => /@\/api\b|\bfetch\s*\(|\.upload\s*\(|createUploadTask|uploadAsync|useAppServices\(\)\.api/.test(fs.readFileSync(path.join(dir, name), 'utf8')));
  expect(offenders).toEqual([]);
});
