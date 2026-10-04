/**
 * CompareTests, the screen (K-602, 01 §15, prototype 4.2): the latest photo beside the past point the user picks — Day 1
 * by default, or the photo day before — in one pose, side by side or as a slide with a divide to drag (a VoiceOver swipe
 * moves it too). Two photo days, never "before" and "after". Both photos are read from the phone; nothing goes anywhere.
 */
import * as fs from 'fs';
import * as path from 'path';

import { act, fireEvent, render, screen } from '@testing-library/react-native';

import CompareScreen from '@/app/compare';
import { t } from '@/copy';
import type { PhotoCheck } from '@/photos/library';
import { photoParams } from '@/photos/params';
import { ThemeProvider } from '@/theme/theme';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ router: { back: () => mockBack() } }));

let mockChecks: PhotoCheck[] = [];
const mockServices = {
  photos: { checks: jest.fn(async () => mockChecks) },
  report: jest.fn(),
  api: { GET: jest.fn(), POST: jest.fn(), PUT: jest.fn(), PATCH: jest.fn(), DELETE: jest.fn() },
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));

const fetchSpy = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = fetchSpy;
  mockChecks = [day('2026-07-06'), day('2026-08-03', ['front']), day('2026-09-02'), day('2026-10-05')];
});
afterEach(() => {
  expect(fetchSpy).not.toHaveBeenCalled();
  for (const method of Object.values(mockServices.api)) expect(method).not.toHaveBeenCalled();
});

function day(takenOn: string, poses: ('front' | 'side')[] = ['front', 'side']): PhotoCheck {
  return { takenOn, photos: Object.fromEntries(poses.map((pose) => [pose, `file:///docs/${takenOn}-${pose}.jpg`])) };
}

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <CompareScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const press = async (name: string) => {
  await fireEvent.press(screen.getByRole('button', { name }));
  await act(async () => {});
};
const uri = (testID: string) => (screen.getByTestId(testID).props.source as { uri: string }).uri;

test('Day 1 beside the latest, front, side by side: each with its day, and the time between', async () => {
  await show();
  expect(uri('compare-past')).toBe('file:///docs/2026-07-06-front.jpg');
  expect(uri('compare-latest')).toBe('file:///docs/2026-10-05-front.jpg');
  expect(screen.getByText(t('compare.caption', { label: t('compare.day1'), date: 'Jul 6' }))).toBeOnTheScreen();
  expect(screen.getByText(t('compare.caption', { label: t('compare.latest'), date: 'Oct 5' }))).toBeOnTheScreen();
  expect(screen.getByText(t('compare.between.other', { count: 13 }))).toBeOnTheScreen();
  expect(screen.getByText(t('compare.onPhone'))).toBeOnTheScreen();
});

test('the past point is the user pick: the photo day before the latest', async () => {
  await show();
  await press(t('compare.earlier.other', { count: 5 }));
  expect(uri('compare-past')).toBe('file:///docs/2026-09-02-front.jpg');
  expect(screen.getByText(t('compare.caption', { label: t('compare.earlier.other', { count: 5 }), date: 'Sep 2' }))).toBeOnTheScreen();
  expect(screen.getByText(t('compare.between.other', { count: 5 }))).toBeOnTheScreen();
});

test('the other pose: the same two days, side; Day 1 picked again if the pick has no such pose', async () => {
  mockChecks = [day('2026-07-06'), day('2026-09-02', ['front']), day('2026-10-05')];
  await show();
  await press(t('compare.earlier.other', { count: 5 }));
  await press(t('compare.side'));
  expect(uri('compare-past')).toBe('file:///docs/2026-07-06-side.jpg');
  expect(uri('compare-latest')).toBe('file:///docs/2026-10-05-side.jpg');
  expect(screen.queryByRole('button', { name: t('compare.earlier.other', { count: 5 }) })).toBeNull();
});

test('slide: the latest photo over the past one, its divide moved by a swipe either way, within the frame', async () => {
  await show();
  await press(t('compare.slide'));
  const slider = screen.getByRole('adjustable', { name: t('compare.slider') });
  expect(slider).toHaveAccessibilityValue({ min: 0, max: 100, now: 50 });
  expect(screen.getByTestId('compare-divide')).toHaveStyle({ width: '50%' });
  await act(async () => fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } }));
  const step = Math.round(photoParams.compareSlideStep * 100);
  expect(slider).toHaveAccessibilityValue({ now: 50 + step });
  for (let i = 0; i < 20; i += 1) await act(async () => fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } }));
  expect(slider).toHaveAccessibilityValue({ now: 0 });
  expect(screen.getByTestId('compare-divide')).toHaveStyle({ width: '0%' });
});

test('slide by dragging: the divide follows the finger across the frame', async () => {
  await show();
  await press(t('compare.slide'));
  const slider = screen.getByRole('adjustable', { name: t('compare.slider') });
  await act(async () => fireEvent(slider, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 400 } } }));
  await act(async () => fireEvent(slider, 'responderMove', { nativeEvent: { locationX: 75, touches: [] }, touchHistory: { touchBank: [] } }));
  expect(slider).toHaveAccessibilityValue({ now: 25 });
});

test('one photo day of a pose: a sentence, no photos', async () => {
  mockChecks = [day('2026-07-06')];
  await show();
  expect(screen.getByText(t('compare.empty'))).toBeOnTheScreen();
  expect(screen.queryByTestId('compare-latest')).toBeNull();
});

test('a folder that cannot be read: reported by name, the empty sentence', async () => {
  mockServices.photos.checks.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'FileSystemError' }));
  await show();
  expect(mockServices.report).toHaveBeenCalledWith({ name: 'FileSystemError' });
  expect(screen.getByText(t('compare.empty'))).toBeOnTheScreen();
});

test('no "before" or "after" anywhere in its words', () => {
  const copy = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../../data/copy/en.json'), 'utf8')) as { compare: object };
  expect(JSON.stringify(copy.compare)).not.toMatch(/\b(before|after)\b/i);
});
