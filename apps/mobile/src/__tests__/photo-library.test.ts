/**
 * PhotoLibraryTests (K-614, V1): progress photos live in one folder on the phone, named by day and pose — front and side
 * (H1 §2.4) — and nowhere else. The same day and pose again replaces the photo; checks are the days, oldest first; forget
 * removes them all ("Delete them here and they're gone").
 */
import { createPhotoLibrary, photoName, type PhotoFiles } from '@/photos/library';

/** The folder as a list of names; `kept` says what came from where. */
function folder(initial: string[] = []) {
  const names = new Set(initial);
  const kept: [string, string][] = [];
  const files: PhotoFiles = {
    names: async () => [...names],
    uriOf: (name) => `file:///docs/progress-photos/${name}`,
    keep: async (from, name) => {
      kept.push([from, name]);
      names.add(name);
    },
    clear: async () => names.clear(),
  };
  return { files, names, kept };
}

test('a photo is named by its day and pose', () => {
  expect(photoName('2026-10-07', 'front')).toBe('2026-10-07-front.jpg');
  expect(photoName('2026-10-07', 'side')).toBe('2026-10-07-side.jpg');
});

test('the photos are the folder files that are photos, oldest first, front before side', async () => {
  const { files } = folder(['2026-10-07-side.jpg', '2026-09-09-front.jpg', 'notes.txt', '2026-10-07-front.jpg', '2026-13-40-front.jpg', '2026-10-07-back.jpg']);
  expect(await createPhotoLibrary(files).photos()).toEqual([
    { takenOn: '2026-09-09', pose: 'front', uri: 'file:///docs/progress-photos/2026-09-09-front.jpg' },
    { takenOn: '2026-10-07', pose: 'front', uri: 'file:///docs/progress-photos/2026-10-07-front.jpg' },
    { takenOn: '2026-10-07', pose: 'side', uri: 'file:///docs/progress-photos/2026-10-07-side.jpg' },
  ]);
});

test('a check is a day with its poses, oldest first', async () => {
  const { files } = folder(['2026-10-07-side.jpg', '2026-09-09-front.jpg', '2026-10-07-front.jpg']);
  expect(await createPhotoLibrary(files).checks()).toEqual([
    { takenOn: '2026-09-09', photos: { front: 'file:///docs/progress-photos/2026-09-09-front.jpg' } },
    {
      takenOn: '2026-10-07',
      photos: { front: 'file:///docs/progress-photos/2026-10-07-front.jpg', side: 'file:///docs/progress-photos/2026-10-07-side.jpg' },
    },
  ]);
});

test('adding moves the taken file into the folder under its name; the same day and pose again replaces it', async () => {
  const { files, kept, names } = folder();
  const library = createPhotoLibrary(files);
  expect(await library.add('file:///cache/Camera/a.jpg', '2026-10-07', 'front')).toEqual({
    takenOn: '2026-10-07',
    pose: 'front',
    uri: 'file:///docs/progress-photos/2026-10-07-front.jpg',
  });
  await library.add('file:///cache/Camera/b.jpg', '2026-10-07', 'front');
  expect(kept).toEqual([
    ['file:///cache/Camera/a.jpg', '2026-10-07-front.jpg'],
    ['file:///cache/Camera/b.jpg', '2026-10-07-front.jpg'],
  ]);
  expect([...names]).toEqual(['2026-10-07-front.jpg']);
});

test('a day that is not a calendar day is refused, nothing kept', async () => {
  const { files, kept } = folder();
  await expect(createPhotoLibrary(files).add('file:///cache/a.jpg', '2026-10-7', 'front')).rejects.toThrow();
  expect(kept).toEqual([]);
});

test('forget removes every photo', async () => {
  const { files } = folder(['2026-10-07-front.jpg', '2026-10-07-side.jpg']);
  const library = createPhotoLibrary(files);
  await library.forget();
  expect(await library.photos()).toEqual([]);
});
