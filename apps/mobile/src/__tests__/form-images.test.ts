/** The drawn form images (ADR-091 #4, K-1219): the map in the app and the files in assets/exercises are the same set. */
import * as fs from 'fs';
import * as path from 'path';

import { formImage, formImagePaths } from '@/train/formImages';

const ASSETS = path.join(__dirname, '..', '..', 'assets');
const onDisk = fs
  .readdirSync(path.join(ASSETS, 'exercises'))
  .flatMap((id) => fs.readdirSync(path.join(ASSETS, 'exercises', id)).filter((f) => /^form\.(webp|png)$/.test(f)).map((f) => `exercises/${id}/${f}`));

test('every image file is in the map and every path in the map is a file', () => {
  expect([...formImagePaths].sort()).toEqual([...onDisk].sort());
});

test('a path this build has no file for gives nothing', () => {
  expect(formImage(undefined)).toBeUndefined();
  expect(formImage('exercises/no_such_move/form.webp')).toBeUndefined();
  expect(formImage('exercises/squat/form.webp')).toBeDefined();
});

test('an image stays small enough for the phone (about 150 KB each, ADR-017 budget)', () => {
  for (const file of onDisk) expect(fs.statSync(path.join(ASSETS, file)).size).toBeLessThanOrEqual(150_000);
});
