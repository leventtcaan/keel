/** The loop clips in the app's assets (ADR-091 Ek 6): the map holds every loop.mp4 file and nothing else, as formImages does. */
import * as fs from 'fs';
import * as path from 'path';

import { formLoop, formLoopPaths } from '@/train/formLoops';

import loopParams from '../../../../data/exercises/media/loop.json';

const ASSETS = path.resolve(__dirname, '../../assets');

test('every loop clip on disk is in the map, and only those', () => {
  const onDisk = fs.readdirSync(path.join(ASSETS, 'exercises')).filter((id) => fs.existsSync(path.join(ASSETS, 'exercises', id, 'loop.mp4'))).map((id) => `exercises/${id}/loop.mp4`);
  expect(onDisk.length).toBeGreaterThan(0);
  expect([...formLoopPaths].sort()).toEqual(onDisk.sort());
});

test('a path the build has no file for, or none, is no clip', () => {
  expect(formLoop(undefined)).toBeUndefined();
  expect(formLoop('exercises/no_such_move/loop.mp4')).toBeUndefined();
  expect(formLoop('exercises/squat/loop.mp4')).toBeDefined();
});

test('every clip is small enough to ship forty of', () => {
  for (const p of formLoopPaths) expect(fs.statSync(path.join(ASSETS, p)).size).toBeLessThanOrEqual(loopParams.max_bytes);
});
