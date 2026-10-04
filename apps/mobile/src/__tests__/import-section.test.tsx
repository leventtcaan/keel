/**
 * Settings › Bring in your history (K-616, ADR-018 §3, ADR-053): Apple Health's older weigh-ins, read once when the user
 * asks. It says how many were found, that a call is never changed by them, what is missing when a consent is, and where
 * Apple Health cannot be read at all.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { t } from '@/copy';
import { ImportSection } from '@/settings/ImportSection';
import { ThemeProvider } from '@/theme/theme';

const mockServices = {
  health: { available: true },
  importHealthWeights: jest.fn(async (): Promise<number | 'consent'> => 0),
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));

beforeEach(() => {
  jest.clearAllMocks();
  mockServices.health.available = true;
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <ImportSection />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const what = () => t('settings.import.weighIns');
async function importWeighIns() {
  await fireEvent.press(screen.getByRole('button', { name: t('settings.import.importLabel', { what: what() }) }));
  await act(async () => {});
}

test('nothing is read until the user asks; the note says a call is never changed by it', async () => {
  await show();

  expect(screen.getByRole('header', { name: t('settings.import.title') })).toBeOnTheScreen();
  expect(screen.getByText(t('settings.import.note'))).toBeOnTheScreen();
  expect(mockServices.importHealthWeights).not.toHaveBeenCalled();
});

test('asked, it reads once and says how many were found', async () => {
  mockServices.importHealthWeights.mockResolvedValueOnce(212);
  await show();

  await importWeighIns();

  expect(mockServices.importHealthWeights).toHaveBeenCalledTimes(1);
  expect(screen.getByText(t('settings.import.found', { count: 212 }))).toBeOnTheScreen();
});

test('one found is said in the singular', async () => {
  mockServices.importHealthWeights.mockResolvedValueOnce(1);
  await show();

  await importWeighIns();

  expect(screen.getByText(t('settings.import.foundOne'))).toBeOnTheScreen();
});

test('none new: it says so, not "0 found"', async () => {
  await show();

  await importWeighIns();

  expect(screen.getByText(t('settings.import.noneNew'))).toBeOnTheScreen();
});

test('without both consents it says which are needed and reads nothing', async () => {
  mockServices.importHealthWeights.mockResolvedValueOnce('consent');
  await show();

  await importWeighIns();

  expect(screen.getByText(t('settings.import.needsConsent'))).toBeOnTheScreen();
});

test('a failure is said, by name only to the report', async () => {
  mockServices.importHealthWeights.mockRejectedValueOnce(Object.assign(new Error('weights 81.4'), { name: 'HealthReadError' }));
  await show();

  await importWeighIns();

  expect(screen.getByText(t('settings.import.failed'))).toBeOnTheScreen();
  expect(mockServices.report).toHaveBeenCalledWith({ name: 'HealthReadError' });
});

test('a second import says only its own outcome, not the last one beside it', async () => {
  mockServices.importHealthWeights.mockResolvedValueOnce(3).mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'HealthReadError' }));
  await show();

  await importWeighIns();
  await importWeighIns();

  expect(screen.queryByText(t('settings.import.found', { count: 3 }))).toBeNull();
  expect(screen.getByText(t('settings.import.failed'))).toBeOnTheScreen();
});

test('while it reads, the button is off', async () => {
  let finish: (n: number) => void = () => {};
  mockServices.importHealthWeights.mockImplementationOnce(() => new Promise<number>((resolve) => (finish = resolve)));
  await show();

  await importWeighIns();
  expect(screen.getByRole('button', { name: t('settings.import.importLabel', { what: what() }) })).toBeDisabled();
  await act(async () => finish(0));
  expect(screen.getByRole('button', { name: t('settings.import.importLabel', { what: what() }) })).toBeEnabled();
});

test('a second tap while it reads does nothing', async () => {
  let finish: (n: number) => void = () => {};
  mockServices.importHealthWeights.mockImplementationOnce(() => new Promise<number>((resolve) => (finish = resolve)));
  await show();
  const button = screen.getByRole('button', { name: t('settings.import.importLabel', { what: what() }) });

  await fireEvent.press(button);
  await fireEvent.press(button);
  await act(async () => finish(3));

  expect(mockServices.importHealthWeights).toHaveBeenCalledTimes(1);
});

test('where Apple Health cannot be read (Expo Go), it says so and offers nothing', async () => {
  mockServices.health.available = false;
  await show();

  expect(screen.getByText(t('settings.import.unavailable'))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('settings.import.importLabel', { what: what() }) })).toBeNull();
});

test('workouts from Strong or Hevy open their own screen (K-609)', async () => {
  await show();

  await fireEvent.press(screen.getByRole('button', { name: t('settings.import.workoutsLabel') }));

  expect(mockPush).toHaveBeenCalledWith('/import');
});

test('where Apple Health cannot be read, workouts can still be brought in: a file needs no HealthKit', async () => {
  mockServices.health.available = false;
  await show();

  expect(screen.getByText(t('settings.import.unavailable'))).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: t('settings.import.workoutsLabel') })).toBeOnTheScreen();
});
