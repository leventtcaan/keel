/**
 * The photos' folder on the phone (K-614, V1): `progress-photos/` in expo-file-system's document directory — kept by the
 * system, not cleared like the cache. SDK 57's object API, checked against the installed types and the v57 docs:
 * `move(file, { overwrite: true })`, `create({ intermediates: true })`, `list()` gives files and folders. Never `upload`.
 */
import { Directory, File, Paths } from 'expo-file-system';

import type { PhotoFiles } from './library';

const FOLDER = 'progress-photos';

export function devicePhotoFiles(): PhotoFiles {
  const folder = () => new Directory(Paths.document, FOLDER);
  return {
    async names() {
      const dir = folder();
      if (!dir.exists) return [];
      return dir
        .list()
        .filter((entry): entry is File => entry instanceof File)
        .map((file) => file.name);
    },
    uriOf: (name) => new File(folder(), name).uri,
    async keep(from, name) {
      const dir = folder();
      if (!dir.exists) dir.create({ intermediates: true });
      // A move, not a copy: the camera's file does not stay behind in the cache.
      await new File(from).move(new File(dir, name), { overwrite: true });
    },
    async clear() {
      const dir = folder();
      if (dir.exists) dir.delete();
    },
  };
}
