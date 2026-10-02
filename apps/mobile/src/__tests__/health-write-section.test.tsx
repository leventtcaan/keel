/**
 * Settings › Add to Apple Health (K-412, ADR-018 §1): two switches, apart — finished workouts, weigh-ins typed in —
 * each off until turned on, each asking iOS; refused, it says where to allow it. Without HealthKit in the build, it
 * says so and offers nothing.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { t } from '@/copy';
import type { HealthWriteSettings } from '@/health/healthWrite';
import { HealthWriteSection } from '@/settings/HealthWriteSection';
import { ThemeProvider } from '@/theme/theme';

let mockSettings: HealthWriteSettings = { workouts: false, weighIns: false };
let mockAllowed = true;
const mockListeners = new Set<() => void>();
const mockServices = {
  health: { available: true },
  healthWriting: {
    current: () => mockSettings,
    subscribe: (listener: () => void) => (mockListeners.add(listener), () => mockListeners.delete(listener)),
    turnOn: jest.fn(async (which: keyof HealthWriteSettings) => {
      if (mockAllowed) {
        mockSettings = { ...mockSettings, [which]: true };
        mockListeners.forEach((l) => l());
      }
      return mockAllowed;
    }),
    turnOff: jest.fn(async (which: keyof HealthWriteSettings) => {
      mockSettings = { ...mockSettings, [which]: false };
      mockListeners.forEach((l) => l());
    }),
  },
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));

beforeEach(() => {
  jest.clearAllMocks();
  mockSettings = { workouts: false, weighIns: false };
  mockAllowed = true;
  mockServices.health.available = true;
  mockListeners.clear();
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <HealthWriteSection />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const press = async (name: string) => {
  await fireEvent.press(screen.getByRole('button', { name }));
  await act(async () => {});
};
const workouts = t('settings.healthWrite.workouts');
const weighIns = t('settings.healthWrite.weighIns');

test('both off, apart: turning workouts on asks for workouts only', async () => {
  await show();
  expect(screen.getByText(t('settings.healthWrite.note'))).toBeTruthy();
  await press(t('settings.healthWrite.turnOnLabel', { what: workouts }));
  expect(mockServices.healthWriting.turnOn).toHaveBeenCalledWith('workouts');
  expect(screen.getByRole('button', { name: t('settings.healthWrite.turnOffLabel', { what: workouts }) })).toBeTruthy();
  expect(screen.getByRole('button', { name: t('settings.healthWrite.turnOnLabel', { what: weighIns }) })).toBeTruthy();
});

test('refused by Apple Health: it says where to allow it, and stays off', async () => {
  mockAllowed = false;
  await show();
  await press(t('settings.healthWrite.turnOnLabel', { what: weighIns }));
  expect(screen.getByText(t('settings.healthWrite.refused'))).toBeTruthy();
  expect(screen.getByRole('button', { name: t('settings.healthWrite.turnOnLabel', { what: weighIns }) })).toBeTruthy();
});

test('turning off goes through the service', async () => {
  mockSettings = { workouts: true, weighIns: false };
  await show();
  await press(t('settings.healthWrite.turnOffLabel', { what: workouts }));
  expect(mockServices.healthWriting.turnOff).toHaveBeenCalledWith('workouts');
});

test('without HealthKit in the build: it says so, and there is nothing to turn on', async () => {
  mockServices.health.available = false;
  await show();
  expect(screen.getByText(t('settings.healthWrite.unavailable'))).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
});

test('a failure is worded and reported by name only', async () => {
  mockServices.healthWriting.turnOn.mockRejectedValueOnce(Object.assign(new Error('HK'), { name: 'HealthSheetFailed' }));
  await show();
  await press(t('settings.healthWrite.turnOnLabel', { what: workouts }));
  expect(screen.getByText(t('settings.healthWrite.failed'))).toBeTruthy();
  expect(mockServices.report).toHaveBeenCalledWith({ name: 'HealthSheetFailed' });
});
