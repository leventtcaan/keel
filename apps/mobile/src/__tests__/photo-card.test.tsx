/**
 * The photos card on Progress (K-614): when the next photo is due — a window that opens and stays open, never "missed"
 * (U7, H1 §2.5) — how many photo days are on the phone, and a way to delete them all (onboarding: "Delete them here and
 * they're gone"). The reminder is this card: no fourth notification (ADR-036). Nothing here touches the network.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { t } from '@/copy';
import type { PhotoCheck } from '@/photos/library';
import { PhotoCard } from '@/photos/PhotoCard';
import { ThemeProvider } from '@/theme/theme';

let mockChecks: PhotoCheck[] = [];
const mockServices = {
  photos: {
    checks: jest.fn(async () => mockChecks),
    forget: jest.fn(async () => {
      mockChecks = [];
    }),
  },
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));

const fetchSpy = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  mockChecks = [];
  global.fetch = fetchSpy;
});
afterEach(() => expect(fetchSpy).not.toHaveBeenCalled());

const TODAY = '2026-10-07';
const check = (takenOn: string): PhotoCheck => ({ takenOn, photos: { front: `file:///docs/${takenOn}-front.jpg` } });

async function show(flowWeek: number | 'over' | null) {
  await render(
    <ThemeProvider scheme="light">
      <PhotoCard today={TODAY} flowWeek={flowWeek} />
    </ThemeProvider>,
  );
  await act(async () => {});
}

test('no photo yet, before week 4: when it is due', async () => {
  await show(2);
  expect(screen.getByText(t('photos.title'))).toBeOnTheScreen();
  expect(screen.getByText(t('photos.first', { week: 4 }))).toBeOnTheScreen();
  expect(screen.queryByText(t('photos.delete'))).toBeNull();
});

test('no photo yet, week 4 reached or the first weeks over: due', async () => {
  await show('over');
  expect(screen.getByText(t('photos.firstDue'))).toBeOnTheScreen();
});

test('no photo yet, the week unknown: offered, not called due', async () => {
  await show(null);
  expect(screen.getByText(t('photos.anytime'))).toBeOnTheScreen();
});

test('after a photo: the day the window opens, then open since that day', async () => {
  mockChecks = [check('2026-08-01'), check('2026-09-20')];
  await show('over');
  expect(screen.getByText(t('photos.next', { date: 'Oct 18' }))).toBeOnTheScreen();
  expect(screen.getByText(t('photos.count.other', { count: 2 }))).toBeOnTheScreen();
});

test('the window open: since when, never how late', async () => {
  mockChecks = [check('2026-08-01')];
  await show('over');
  expect(screen.getByText(t('photos.open', { date: 'Aug 29' }))).toBeOnTheScreen();
  expect(screen.getByText(t('photos.count.one', { count: 1 }))).toBeOnTheScreen();
});

test('delete all: asked first, then every photo gone from the phone', async () => {
  mockChecks = [check('2026-09-20')];
  await show('over');
  await fireEvent.press(screen.getByRole('button', { name: t('photos.delete') }));
  expect(mockServices.photos.forget).not.toHaveBeenCalled();
  expect(screen.getByText(t('photos.deleteBody'))).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: t('photos.deleteConfirm') }));
  expect(mockServices.photos.forget).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(t('photos.count.one', { count: 1 }))).toBeNull();
  expect(screen.getByText(t('photos.firstDue'))).toBeOnTheScreen();
});

test('"Keep them" keeps them', async () => {
  mockChecks = [check('2026-09-20')];
  await show('over');
  await fireEvent.press(screen.getByRole('button', { name: t('photos.delete') }));
  await fireEvent.press(screen.getByRole('button', { name: t('photos.deleteKeep') }));
  expect(mockServices.photos.forget).not.toHaveBeenCalled();
  expect(screen.getByText(t('photos.count.one', { count: 1 }))).toBeOnTheScreen();
});

test('a delete that fails says so and is reported by name', async () => {
  mockChecks = [check('2026-09-20')];
  mockServices.photos.forget.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'FileSystemError' }));
  await show('over');
  await fireEvent.press(screen.getByRole('button', { name: t('photos.delete') }));
  await fireEvent.press(screen.getByRole('button', { name: t('photos.deleteConfirm') }));
  expect(screen.getByText(t('photos.deleteFailed'))).toBeOnTheScreen();
  expect(mockServices.report).toHaveBeenCalledWith({ name: 'FileSystemError' });
});

test('a retry that works clears the failure', async () => {
  mockChecks = [check('2026-09-20')];
  mockServices.photos.forget.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'FileSystemError' }));
  await show('over');
  await fireEvent.press(screen.getByRole('button', { name: t('photos.delete') }));
  await fireEvent.press(screen.getByRole('button', { name: t('photos.deleteConfirm') }));
  expect(screen.getByText(t('photos.deleteFailed'))).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: t('photos.delete') }));
  await fireEvent.press(screen.getByRole('button', { name: t('photos.deleteConfirm') }));
  expect(screen.queryByText(t('photos.deleteFailed'))).toBeNull();
});

test('a folder that cannot be read: reported by name, no card rather than a wrong one', async () => {
  mockServices.photos.checks.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'FileSystemError' }));
  await show('over');
  expect(mockServices.report).toHaveBeenCalledWith({ name: 'FileSystemError' });
  expect(screen.queryByTestId('photo-card')).toBeNull();
});
