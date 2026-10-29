/**
 * Settings › Reminders (K-410, K-1043): one switch for the three kinds, a one-line footer naming them (the full paragraph is on
 * the routine page, in front of the user's own sentence); on and off; iOS Settings when iOS says no; and the routine row that
 * opens the page for the sentence, the training reminder's words.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { t } from '@/copy';
import { notificationParams as P } from '@/notifications/params';
import type { NotificationPermission, ReminderSettings } from '@/notifications/reminders';
import { RemindersSection } from '@/settings/RemindersSection';
import { RoutineEditor } from '@/settings/RoutineEditor';
import { ThemeProvider } from '@/theme/theme';

let mockSettings: ReminderSettings = { enabled: false, cue: '' };
let mockPermission: NotificationPermission = { granted: false, canAskAgain: true };
const mockListeners = new Set<() => void>();
const mockChange = (next: Partial<ReminderSettings>) => {
  mockSettings = { ...mockSettings, ...next };
  mockListeners.forEach((listener) => listener());
};
const mockServices = {
  reminders: {
    current: () => mockSettings,
    subscribe: (listener: () => void) => {
      mockListeners.add(listener);
      return () => mockListeners.delete(listener);
    },
    permission: jest.fn(async () => mockPermission),
    turnOn: jest.fn(async (): Promise<NotificationPermission> => {
      if (mockPermission.canAskAgain) mockPermission = { granted: true, canAskAgain: false };
      if (mockPermission.granted) mockChange({ enabled: true });
      return mockPermission;
    }),
    turnOff: jest.fn(async () => mockChange({ enabled: false })),
    setCue: jest.fn(async (text: string) => mockChange({ cue: text.trim() })),
  },
  report: jest.fn(),
};
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args), back: () => mockBack() } }));
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));
// The app coming back to the front (AppState), captured so a test can send it — as after a trip to iOS Settings.
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
  mockSettings = { enabled: false, cue: '' };
  mockPermission = { granted: false, canAskAgain: true };
  mockListeners.clear();
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <RemindersSection />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const press = async (name: string) => {
  await fireEvent.press(screen.getByRole('button', { name }));
  await act(async () => {});
};
const reminders = () => screen.getByRole('switch', { name: t('settings.reminders.title') });
const flip = async (to: boolean) => {
  await fireEvent(reminders(), 'valueChange', to);
  await act(async () => {});
};

test('off: the switch is off and one line names the three kinds; turning it on asks iOS and shows it on', async () => {
  await show();
  expect(reminders()).toHaveProp('value', false);
  expect(screen.getByText(t('settings.reminders.kinds'))).toBeTruthy();
  // The paragraph is on the routine page, not under the switch.
  expect(screen.queryByText(t('settings.reminders.what', { minutes: P.trainingLeadMinutes }))).toBeNull();
  await flip(true);
  expect(mockServices.reminders.turnOn).toHaveBeenCalledTimes(1);
  expect(reminders()).toHaveProp('value', true);
});

test('Your routine is a row that opens the routine page, showing the sentence on its right', async () => {
  mockSettings = { enabled: true, cue: 'Lunch break' };
  mockPermission = { granted: true, canAskAgain: false };
  await show();
  await press(`${t('settings.reminders.routine')}, Lunch break`);
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/settings-detail', params: { part: 'routine' } });
});

test('iOS said no for good: the footer says so with the way to iOS Settings, and the switch stays off', async () => {
  mockServices.reminders.turnOn.mockImplementationOnce(async () => (mockPermission = { granted: false, canAskAgain: false }));
  const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  await show();
  await flip(true);
  expect(screen.getByText(t('settings.reminders.blocked'))).toBeTruthy();
  expect(reminders()).toHaveProp('value', false);
  await press(t('settings.reminders.openSettings'));
  expect(open).toHaveBeenCalledTimes(1);
});

test('already refused when the screen opens: the way to iOS Settings, in place of the kinds line', async () => {
  mockPermission = { granted: false, canAskAgain: false };
  await show();
  expect(screen.getByRole('button', { name: t('settings.reminders.openSettings') })).toBeTruthy();
  expect(screen.queryByText(t('settings.reminders.kinds'))).toBeNull();
});

test('on, but turned off in iOS Settings since: it says so, and the switch is not on', async () => {
  mockSettings = { enabled: true, cue: '' };
  mockPermission = { granted: false, canAskAgain: false };
  await show();
  expect(screen.getByText(t('settings.reminders.blocked'))).toBeTruthy();
  expect(reminders()).toHaveProp('value', false);
});

test('turning off goes through the service', async () => {
  mockSettings = { enabled: true, cue: '' };
  mockPermission = { granted: true, canAskAgain: false };
  await show();
  expect(reminders()).toHaveProp('value', true);
  await flip(false);
  expect(mockServices.reminders.turnOff).toHaveBeenCalledTimes(1);
  expect(reminders()).toHaveProp('value', false);
});

test('only the check-in morning on (from the plan, K-967): said, and all three a tap away', async () => {
  mockSettings = { enabled: true, cue: '', only: 'check_in' };
  mockPermission = { granted: true, canAskAgain: false };
  await show();
  expect(screen.getByText(t('settings.reminders.onlyCheckIn'))).toBeOnTheScreen();
  await press(t('settings.reminders.turnOnAll'));
  expect(mockServices.reminders.turnOn).toHaveBeenCalledWith();
});

test('the check-in morning alone, but no calls (no health data consent, K-992): not shown as on; all three a tap away', async () => {
  mockSettings = { enabled: true, cue: '', only: 'check_in', noCalls: true };
  mockPermission = { granted: true, canAskAgain: false };
  await show();
  expect(screen.getByText(t('settings.reminders.noCalls'))).toBeOnTheScreen();
  expect(reminders()).toHaveProp('value', false);
  expect(screen.queryByText(t('settings.reminders.onlyCheckIn'))).toBeNull();
  await press(t('settings.reminders.turnOnAll'));
  expect(mockServices.reminders.turnOn).toHaveBeenCalledWith();
});

test('a failure is worded, and reported by name only', async () => {
  mockServices.reminders.turnOn.mockRejectedValueOnce(Object.assign(new Error('the sheet failed'), { name: 'PermissionFailed' }));
  await show();
  await flip(true);
  expect(screen.getByText(t('settings.reminders.failed'))).toBeTruthy();
  expect(mockServices.report).toHaveBeenCalledWith({ name: 'PermissionFailed' });
});

test('back from iOS Settings: the permission is read again — blocked becomes off, "On" becomes blocked', async () => {
  mockPermission = { granted: false, canAskAgain: false };
  await show();
  expect(screen.getByText(t('settings.reminders.blocked'))).toBeTruthy();
  mockPermission = { granted: true, canAskAgain: false };
  await act(async () => mockForeground('active'));
  expect(screen.queryByText(t('settings.reminders.blocked'))).toBeNull();
  await flip(true);
  expect(reminders()).toHaveProp('value', true);
  mockPermission = { granted: false, canAskAgain: false };
  await act(async () => mockForeground('background'));
  expect(reminders()).toHaveProp('value', true); // only coming to the front reads it
  await act(async () => mockForeground('active'));
  expect(reminders()).toHaveProp('value', false);
  expect(screen.getByText(t('settings.reminders.blocked'))).toBeTruthy();
});

test('an older answer does not overwrite a newer one', async () => {
  let answerFirst: (p: NotificationPermission) => void = () => {};
  mockServices.reminders.permission.mockImplementationOnce(() => new Promise((resolve) => (answerFirst = resolve)));
  mockPermission = { granted: false, canAskAgain: false };
  await show();
  await act(async () => mockForeground('active')); // the second read answers at once: blocked
  await act(async () => answerFirst({ granted: true, canAskAgain: false })); // the first, older, answers late
  expect(screen.getByText(t('settings.reminders.blocked'))).toBeTruthy();
});

describe('the routine page (RoutineEditor)', () => {
  async function showPage() {
    await render(
      <ThemeProvider scheme="light">
        <RoutineEditor />
      </ThemeProvider>,
    );
    await act(async () => {});
  }

  test('the three kinds are said in full, before the sentence', async () => {
    await showPage();
    expect(screen.getByText(t('settings.reminders.what', { minutes: P.trainingLeadMinutes }))).toBeTruthy();
  });

  test('the sentence: shown as kept, saved when changed, and only then; saved, the page closes', async () => {
    mockSettings = { enabled: true, cue: 'Lunch break' };
    mockPermission = { granted: true, canAskAgain: false };
    await showPage();
    const field = screen.getByLabelText(t('settings.reminders.cue.label'));
    expect(field.props.value).toBe('Lunch break');
    expect(field.props.maxLength).toBe(P.cueMaxChars);
    const save = () => screen.getByRole('button', { name: t('settings.reminders.cue.saveLabel') });
    expect(save().props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(field, 'After work, straight to the gym');
    expect(save().props.accessibilityState.disabled).toBe(false);
    await press(t('settings.reminders.cue.saveLabel'));
    expect(mockServices.reminders.setCue).toHaveBeenCalledWith('After work, straight to the gym');
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('a sentence that could not be kept says so and the page stays', async () => {
    mockServices.reminders.setCue.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'DiskFull' }));
    await showPage();
    await fireEvent.changeText(screen.getByLabelText(t('settings.reminders.cue.label')), 'Early');
    await press(t('settings.reminders.cue.saveLabel'));
    expect(screen.getByText(t('settings.reminders.failed'))).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });
});
