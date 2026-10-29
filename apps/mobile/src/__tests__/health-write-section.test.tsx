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
let mockRevoked = false; // taken back in the Health app since it was turned on
const mockListeners = new Set<() => void>();
const mockServices = {
  health: { available: true },
  healthWriting: {
    current: () => mockSettings,
    shown: (which: keyof HealthWriteSettings) => (!mockSettings[which] ? 'off' : mockRevoked ? 'refused' : 'on'),
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
let mockForeground: (state: string) => void = () => {};
jest.mock('react-native/Libraries/AppState/AppState', () => ({
  __esModule: true,
  default: {
    addEventListener: (_type: string, listener: (state: string) => void) => {
      mockForeground = listener;
      return { remove: () => {} };
    },
    currentState: 'active',
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockSettings = { workouts: false, weighIns: false };
  mockAllowed = true;
  mockRevoked = false;
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
/** The switch of a row (iOS switches, K-1062): found by the name it is given for VoiceOver. */
const switchOf = (what: string) => screen.getByRole('switch', { name: t('settings.healthWrite.switchLabel', { what }) });
const flip = async (what: string, to: boolean) => {
  await fireEvent(switchOf(what), 'valueChange', to);
  await act(async () => {});
};
const workouts = t('settings.healthWrite.workouts');
const weighIns = t('settings.healthWrite.weighIns');

test('both off, apart: turning workouts on asks for workouts only', async () => {
  await show();
  expect(screen.getByText(t('settings.healthWrite.note'))).toBeTruthy();
  expect(switchOf(workouts)).not.toBeChecked();
  await flip(workouts, true);
  expect(mockServices.healthWriting.turnOn).toHaveBeenCalledWith('workouts');
  expect(mockServices.healthWriting.turnOn).toHaveBeenCalledTimes(1);
  expect(switchOf(workouts)).toBeChecked();
  expect(switchOf(weighIns)).not.toBeChecked();
});

test('refused by Apple Health: it says where to allow it, and stays off', async () => {
  mockAllowed = false;
  await show();
  await flip(weighIns, true);
  expect(screen.getByText(t('settings.healthWrite.refused'))).toBeTruthy();
  expect(switchOf(weighIns)).not.toBeChecked();
});

test('turning off goes through the service', async () => {
  mockSettings = { workouts: true, weighIns: false };
  await show();
  expect(switchOf(workouts)).toBeChecked();
  await flip(workouts, false);
  expect(mockServices.healthWriting.turnOff).toHaveBeenCalledWith('workouts');
  expect(switchOf(workouts)).not.toBeChecked();
});

test('without HealthKit in the build: it says so, and there is nothing to turn on', async () => {
  mockServices.health.available = false;
  await show();
  expect(screen.getByText(t('settings.healthWrite.unavailable'))).toBeTruthy();
  expect(screen.queryByRole('switch')).toBeNull();
  expect(screen.queryByRole('button')).toBeNull();
});

test('a failure is worded and reported by name only', async () => {
  mockServices.healthWriting.turnOn.mockRejectedValueOnce(Object.assign(new Error('HK'), { name: 'HealthSheetFailed' }));
  await show();
  await flip(workouts, true);
  expect(screen.getByText(t('settings.healthWrite.failed'))).toBeTruthy();
  expect(mockServices.report).toHaveBeenCalledWith({ name: 'HealthSheetFailed' });
});

test('on, but taken back in the Health app: not shown on — where to allow it; turning it on asks again; seen again on return', async () => {
  mockSettings = { workouts: true, weighIns: false };
  await show();
  expect(switchOf(workouts)).toBeChecked();
  mockRevoked = true;
  await act(async () => mockForeground('active'));
  expect(switchOf(workouts)).not.toBeChecked();
  expect(screen.getByText(t('settings.healthWrite.refused'))).toBeTruthy();
  await flip(workouts, true);
  expect(mockServices.healthWriting.turnOn).toHaveBeenCalledWith('workouts');
});
