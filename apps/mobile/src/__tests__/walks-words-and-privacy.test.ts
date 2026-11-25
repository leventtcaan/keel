// constitution-audit (tools/anayasa-denetimi.sh)
/** The words of the walk line (K-1216, U7) and the promise that nothing here knows where the phone is (the Apple Health text says the app does not read location). */
import * as fs from 'fs';
import * as path from 'path';

import { t } from '@/copy';
import { walkLabel, walkLine } from '@/walks/words';
import { sourceFiles, SRC } from './support/sourceScan';

import en from '../../../../data/copy/en.json';
import { wordsOf } from './support/copyBudget';

const route = { kind: 'route', route: { id: '1', name: 'Gym', km: 1.8 }, roundTripSteps: 5040, minutes: 36 } as const;
const minutes = { kind: 'minutes', minutes: 36 } as const;

test('the line names the route and the steps left, or the minutes', () => {
  expect(walkLine(4000, route)).toBe('4,000 left: Gym and back');
  expect(walkLine(4000, minutes)).toBe('4,000 left, about 36 min');
});

test('the line is short enough for the first screen: at most 9 words with a one-word route', () => {
  expect(wordsOf(walkLine(4000, route))).toBeLessThanOrEqual(9);
  expect(wordsOf(walkLine(4000, minutes))).toBeLessThanOrEqual(9);
});

test('the spoken label is a whole sentence', () => {
  expect(walkLabel(4000, route)).toContain('Gym');
  expect(walkLabel(4000, minutes)).toContain('36 minutes');
});

test('nothing in the walks copy blames or asks to make up for anything (U7)', () => {
  const texts: string[] = [];
  const collect = (node: unknown) => (typeof node === 'string' ? texts.push(node) : node !== null && typeof node === 'object' && Object.values(node).forEach(collect));
  collect((en as Record<string, unknown>).walks);
  collect(((en as Record<string, Record<string, unknown>>).settings).walks);
  collect(((en as Record<string, Record<string, unknown>>).reminders).walk);
  expect(texts.length).toBeGreaterThan(5);
  for (const text of texts) expect(text).not.toMatch(/you (still )?need|make up|behind|failed|lazy|should have|only \d|catch up|burn|guilt/i);
  expect(t('walks.line.route', { steps: '1', name: 'A' })).not.toMatch(/\[missing/);
});

test('no location library or API is imported anywhere in the app (the Apple Health text says the app does not read location)', () => {
  const forbidden = /expo-location|expo-maps|react-native-geolocation|@react-native-community\/geolocation|CoreLocation|MapKit|navigator\.geolocation|requestForegroundPermissionsAsync|watchPositionAsync|getCurrentPositionAsync/;
  const offenders = sourceFiles()
    .filter((file) => forbidden.test(fs.readFileSync(file, 'utf8')))
    .map((file) => path.relative(SRC, file));
  expect(offenders).toEqual([]);
});

// K-1227 (ADR-093): the walk map shows Apple Maps through react-native-maps, in that one screen, which never asks for where the phone is.
test('react-native-maps is imported by the walk map screen alone, and that screen keeps the user location off', () => {
  const importers = sourceFiles()
    .filter((file) => /from 'react-native-maps'/.test(fs.readFileSync(file, 'utf8')))
    .map((file) => path.relative(SRC, file));
  expect(importers).toEqual(['walks/WalkMapScreen.tsx']);
  const screen = fs.readFileSync(path.join(SRC, 'walks/WalkMapScreen.tsx'), 'utf8');
  expect(screen).toMatch(/showsUserLocation=\{false\}/);
  expect(screen).toMatch(/showsMyLocationButton=\{false\}/);
});
