/**
 * The photos' folder on the phone (K-614, V1): `progress-photos/` in expo-file-system's document directory — kept by the
 * system, not cleared like the cache. SDK 57's object API, checked against the installed types and the v57 docs:
 * `move(file, { overwrite: true })`, `create({ intermediates: true })`, `list()` gives files and folders. Never `upload`.
 * K-618 (ADR-055 › 97): iOS backs the documents folder up to iCloud and computers unless told not to, so the folder and every
 * photo in it are left out of backups — a kept photo at once, the ones already there (kept before K-618) at the first listing.
 * The only copy then never leaves the phone; a new phone starts without them.
 */
import { isRunningInExpoGo } from 'expo';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { type BackupExclusion, backupExclusion } from '../../modules/backup-exclusion';
import type { PhotoFiles } from './library';

const FOLDER = 'progress-photos';

type Deps = {
  /** Our own local module (modules/backup-exclusion); null where it is not (Expo Go). */
  backup?: BackupExclusion | null;
  inExpoGo?: () => boolean;
  /** The module is iOS only; Android's own backup (Auto Backup) is an open question, with no Android build yet. */
  platform?: typeof Platform.OS;
  /** A problem, by name only (V3): never a file or a day. */
  report?: (problem: { name: string }) => void;
};

export function devicePhotoFiles({
  backup = backupExclusion(),
  inExpoGo = isRunningInExpoGo,
  platform = Platform.OS,
  report = () => {},
}: Deps = {}): PhotoFiles {
  const folder = () => new Directory(Paths.document, FOLDER);
  const photoFiles = (dir: Directory) => dir.list().filter((entry): entry is File => entry instanceof File);
  let missingReported = false;
  /** Whether the folder and the photos already there are left out of backups in this run of the app. */
  let swept = false;

  /** Leaves each uri out of backups; false when one could not be. A photo is kept either way — losing it is worse. */
  const leaveOut = (uris: string[]): boolean => {
    if (backup === null) {
      // Expo Go never carries our module; our own iOS build without it is a broken build, said once.
      if (platform === 'ios' && !inExpoGo() && !missingReported) report({ name: 'BackupExclusionMissing' });
      missingReported = true;
      return false;
    }
    let all = true;
    for (const uri of uris) {
      try {
        backup.exclude(uri);
      } catch {
        report({ name: 'BackupExclusionFailed' });
        all = false;
      }
    }
    return all;
  };

  return {
    async names() {
      const dir = folder();
      if (!dir.exists) return [];
      const files = photoFiles(dir);
      if (!swept) swept = leaveOut([dir.uri, ...files.map((file) => file.uri)]);
      return files.map((file) => file.name);
    },
    uriOf: (name) => new File(folder(), name).uri,
    async keep(from, name) {
      const dir = folder();
      if (!dir.exists) dir.create({ intermediates: true });
      const kept = new File(dir, name);
      // A move, not a copy: the camera's file does not stay behind in the cache.
      await new File(from).move(kept, { overwrite: true });
      // A refusal here leaves the next listing to try the whole folder again.
      if (!leaveOut([dir.uri, kept.uri])) swept = false;
    },
    async clear() {
      const dir = folder();
      if (dir.exists) dir.delete();
    },
  };
}
