/**
 * Progress photos (K-614, V1): on this phone only, in one folder, named by day and pose — front and side, the two the
 * protocol asks for (H1 §2.4). Nothing here reads or writes anywhere else: no API, no upload, no copy kept by the server
 * (photo-files.test.ts scans this folder for it). A photo is health data; it goes when the account leaves the phone
 * (appServices) and when the user deletes them (onboarding: "Delete them here and they're gone").
 */

export type Pose = 'front' | 'side';
export const POSES: readonly Pose[] = ['front', 'side'];
export type ProgressPhoto = { takenOn: string; pose: Pose; uri: string };
/** One day's photos, by pose. */
export type PhotoCheck = { takenOn: string; photos: Partial<Record<Pose, string>> };

/** The phone's file system, as much as the library needs; passed in so this is testable without a phone (photoFiles.ts). */
export type PhotoFiles = {
  /** The names of the files in the photos folder; none when there is no folder yet. */
  names(): Promise<string[]>;
  uriOf(name: string): string;
  /** Moves the file at `from` (the camera's, in the cache) into the folder as `name`, replacing one of that name. */
  keep(from: string, name: string): Promise<void>;
  /** Deletes the folder and every photo in it. */
  clear(): Promise<void>;
};

/** No folder (tests, a phone without one): nothing listed, nothing kept — a photo is never held anywhere else. */
export const noPhotoFiles: PhotoFiles = {
  names: async () => [],
  uriOf: (name) => name,
  keep: async () => {
    throw new Error('no photos folder');
  },
  clear: async () => {},
};

export type PhotoLibrary = {
  /** Every photo, oldest first, front before side. */
  photos(): Promise<ProgressPhoto[]>;
  /** The days, oldest first. */
  checks(): Promise<PhotoCheck[]>;
  add(from: string, takenOn: string, pose: Pose): Promise<ProgressPhoto>;
  forget(): Promise<void>;
};

const NAME = /^(\d{4}-\d{2}-\d{2})-(front|side)\.jpg$/;

/** A day the calendar has: 2026-02-30 reads back as March 2nd, so it is not one. */
function isCalendarDay(day: string): boolean {
  const time = Date.parse(`${day}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === day;
}

export function photoName(takenOn: string, pose: Pose): string {
  return `${takenOn}-${pose}.jpg`;
}

export function createPhotoLibrary(files: PhotoFiles): PhotoLibrary {
  async function photos(): Promise<ProgressPhoto[]> {
    return (await files.names())
      .map((name) => NAME.exec(name))
      .filter((match): match is RegExpExecArray => match !== null && isCalendarDay(match[1]))
      .map(([name, takenOn, pose]) => ({ takenOn, pose: pose as Pose, uri: files.uriOf(name) }))
      .sort((a, b) => a.takenOn.localeCompare(b.takenOn) || POSES.indexOf(a.pose) - POSES.indexOf(b.pose));
  }

  return {
    photos,
    async checks() {
      const days = new Map<string, PhotoCheck>();
      for (const photo of await photos()) {
        const check = days.get(photo.takenOn) ?? { takenOn: photo.takenOn, photos: {} };
        check.photos[photo.pose] = photo.uri;
        days.set(photo.takenOn, check);
      }
      return [...days.values()];
    },
    async add(from, takenOn, pose) {
      const name = photoName(takenOn, pose);
      // A name the list would not read back is a photo lost in the folder.
      if (!NAME.test(name) || !isCalendarDay(takenOn)) throw new Error('not a calendar day');
      await files.keep(from, name);
      return { takenOn, pose, uri: files.uriOf(name) };
    },
    forget: () => files.clear(),
  };
}
