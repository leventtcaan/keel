/**
 * The steps taken off the walk (ADR-069 #3, ADR-072 #8) keep their code, and so their tests: nothing opens them now
 * (onboarding-flow.test.tsx: a link lands on the first question), so each is mounted here on its own route, over the
 * draft a walk would have left. What to expect offered the reminders (K-434, ADR-037 #51); Apple Health was the last step
 * and finished onboarding (K-312, ADR-018). Their new places come with their own tasks (the plan's Monday reminder,
 * Apple Health when first useful).
 */
import { Stack } from 'expo-router/stack';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { type ReactNode, useEffect, useRef } from 'react';

import AppleHealthStep from '@/app/onboarding/apple-health';
import ExpectationsStep from '@/app/onboarding/expectations';
import { t } from '@/copy';
import { notificationParams } from '@/notifications/params';
import type { Draft } from '@/onboarding/draft';
import { OnboardingProvider, useDraft } from '@/onboarding/OnboardingContext';
import { ThemeProvider } from '@/theme/theme';

jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));

const mockProfile = { save: jest.fn(async (_profile: unknown) => {}) };
// The server's answer to a consent PUT; `mockConsentStatus` 200 records it.
let mockConsentStatus = 200;
const mockConsentAnswer = async (_path: string, _init: unknown) =>
  mockConsentStatus === 200
    ? { data: { status: 'GRANTED' }, response: new Response(null, { status: 200 }) }
    : { error: { code: 'X' }, response: new Response(null, { status: mockConsentStatus }) };
const mockApi = { PUT: jest.fn(mockConsentAnswer) };
const mockQueue = { record: jest.fn(async (_record: unknown) => true) };
const mockConsents = { remember: jest.fn(async (_kind: string, _status: string) => {}) };
const mockHealth = { available: false, requestRead: jest.fn(async () => {}) };
const mockTurnOn = jest.fn(async () => ({ granted: true, canAskAgain: false }));
const mockSetCue = jest.fn(async (_cue: string) => {});
let mockReminderSettings = { enabled: false, cue: '' }; // one object per test: useSyncExternalStore compares by identity
const mockReport = jest.fn();
jest.mock('@/services/ServicesProvider', () => ({
  useUnits: () => 'METRIC',
  useAppServices: () => ({
    profile: mockProfile,
    api: mockApi,
    queue: mockQueue,
    health: mockHealth,
    report: mockReport,
    consents: mockConsents,
    units: { current: () => 'METRIC' },
    reminders: { turnOn: mockTurnOn, setCue: mockSetCue, current: () => mockReminderSettings, subscribe: () => () => {} },
  }),
}));

/** What the walk would have left: every answer given (the weight counts only with the consent, set by the test). */
const WALKED: Partial<Draft> = {
  goal: 'LOSE_FAT',
  experience: 'Y1_3',
  programChoice: 'BUILD_ONE_FOR_ME',
  trainingDays: ['MONDAY', 'WEDNESDAY', 'FRIDAY'],
  height: { cm: '180', feet: '', inches: '' },
  birthYear: '1990',
  sex: 'MALE',
  activityLevel: 'ACTIVE',
  weight: '82.4',
};
let mockAnswers: Partial<Draft> = WALKED;

/** Gives the draft the walk's answers once, before the step is used. */
function Walked({ children }: { children: ReactNode }) {
  const { update } = useDraft();
  const given = useRef(false);
  useEffect(() => {
    if (given.current) return;
    given.current = true;
    update(mockAnswers);
  }, [update]);
  return children;
}

beforeEach(() => {
  mockAnswers = { ...WALKED, healthConsent: 'declined' };
  mockProfile.save.mockReset().mockResolvedValue(undefined);
  mockConsentStatus = 200;
  mockApi.PUT.mockReset().mockImplementation(mockConsentAnswer);
  mockQueue.record.mockReset().mockResolvedValue(true);
  mockConsents.remember.mockClear();
  mockHealth.available = false;
  mockHealth.requestRead.mockReset().mockResolvedValue(undefined);
  mockReport.mockClear();
  mockTurnOn.mockReset().mockResolvedValue({ granted: true, canAskAgain: false });
  mockSetCue.mockReset().mockResolvedValue(undefined);
  mockReminderSettings = { enabled: false, cue: '' };
});

async function mount(step: 'expectations' | 'apple-health', { allow = false } = {}) {
  mockAnswers = { ...WALKED, healthConsent: allow ? 'granted' : 'declined' };
  await renderRouter(
    {
      _layout: () => (
        <ThemeProvider scheme="light">
          <Stack screenOptions={{ headerShown: false }} />
        </ThemeProvider>
      ),
      'onboarding/_layout': () => (
        <OnboardingProvider>
          <Walked>
            <Stack screenOptions={{ headerShown: false }} />
          </Walked>
        </OnboardingProvider>
      ),
      'onboarding/expectations': ExpectationsStep,
      'onboarding/apple-health': AppleHealthStep,
    },
    { initialUrl: `/onboarding/${step}` },
  );
  await settle();
}

async function settle() {
  await act(async () => {
    jest.runAllTimers();
  });
}

async function press(name: string) {
  await fireEvent.press(screen.getByRole('button', { name }));
  await settle();
}

describe('reminders, offered once in onboarding with what they are (K-434, ADR-037 #51)', () => {
  const cueField = () => screen.getByLabelText(t('settings.reminders.cue.label'));

  test('What to expect says the three kinds and asks for the user\'s own words; going on asks nothing, turns nothing on', async () => {
    await mount('expectations');
    expect(screen.getByText(t('settings.reminders.what', { minutes: notificationParams.trainingLeadMinutes }))).toBeOnTheScreen();
    await fireEvent.changeText(cueField(), 'After work, straight to the gym');
    await press(t('onboarding.expectations.action'));
    expect(mockTurnOn).not.toHaveBeenCalled();
    expect(mockSetCue).not.toHaveBeenCalled();
  });

  test('"Turn on" keeps the sentence, then asks iOS through the same service as Settings; on, it says so', async () => {
    await mount('expectations');
    await fireEvent.changeText(cueField(), 'After work, straight to the gym');
    await press(t('settings.reminders.turnOn'));
    expect(mockSetCue).toHaveBeenCalledWith('After work, straight to the gym');
    expect(mockTurnOn).toHaveBeenCalledTimes(1);
    expect(mockSetCue.mock.invocationCallOrder[0]).toBeLessThan(mockTurnOn.mock.invocationCallOrder[0]);
    expect(screen.getByText(t('onboarding.reminders.on'))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('settings.reminders.turnOn') })).toBeNull();
    await press(t('onboarding.expectations.action'));
    expect(mockTurnOn).toHaveBeenCalledTimes(1);
  });

  test('without a sentence none is kept; iOS saying no for good is said, with the way to iOS Settings, and no button that does nothing', async () => {
    mockTurnOn.mockResolvedValue({ granted: false, canAskAgain: false });
    await mount('expectations');
    await press(t('settings.reminders.turnOn'));
    expect(mockSetCue).not.toHaveBeenCalled();
    expect(screen.getByText(t('onboarding.reminders.refused'))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('settings.reminders.openSettings') })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('settings.reminders.turnOn') })).toBeNull();
    expect(screen.queryByText(t('onboarding.reminders.on'))).toBeNull();
  });

  test('iOS not deciding yet (its sheet can still show): nothing is said off, and the button stays', async () => {
    mockTurnOn.mockResolvedValue({ granted: false, canAskAgain: true });
    await mount('expectations');
    await press(t('settings.reminders.turnOn'));
    expect(screen.queryByText(t('onboarding.reminders.refused'))).toBeNull();
    expect(screen.getByRole('button', { name: t('settings.reminders.turnOn') })).toBeEnabled();
  });

  test('a sentence typed but not turned on says it is kept only with the reminders', async () => {
    await mount('expectations');
    expect(screen.queryByText(t('onboarding.reminders.cueKeptOnlyOn'))).toBeNull();
    await fireEvent.changeText(screen.getByLabelText(t('settings.reminders.cue.label')), 'After work');
    expect(screen.getByText(t('onboarding.reminders.cueKeptOnlyOn'))).toBeOnTheScreen();
  });

  test('reminders already on (the step opened again): said so, not offered again', async () => {
    mockReminderSettings = { enabled: true, cue: '' };
    await mount('expectations');
    expect(screen.getByText(t('onboarding.reminders.on'))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('settings.reminders.turnOn') })).toBeNull();
  });

  test('a sentence that could not be kept: iOS is not asked, and it is said', async () => {
    mockSetCue.mockRejectedValue(Object.assign(new Error('kv failed'), { name: 'KvFailed' }));
    await mount('expectations');
    await fireEvent.changeText(screen.getByLabelText(t('settings.reminders.cue.label')), 'After work');
    await press(t('settings.reminders.turnOn'));
    expect(mockTurnOn).not.toHaveBeenCalled();
    expect(screen.getByText(t('settings.reminders.failed'))).toBeOnTheScreen();
  });

  test('a second tap while iOS asks turns on once, and the button is off', async () => {
    let answer: (value: { granted: boolean; canAskAgain: boolean }) => void = () => {};
    mockTurnOn.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    await mount('expectations');
    const button = screen.getByRole('button', { name: t('settings.reminders.turnOn') });
    const overlapNote = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await act(async () => {
        void fireEvent.press(button);
        void fireEvent.press(button);
      });
    } finally {
      overlapNote.mockRestore();
    }
    expect(mockTurnOn).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: t('settings.reminders.turnOn') })).toBeDisabled();
    await act(async () => answer({ granted: true, canAskAgain: false }));
  });

  test('reminders that could not be kept say so and never hold the step up', async () => {
    mockTurnOn.mockRejectedValue(Object.assign(new Error('kv failed'), { name: 'KvFailed' }));
    await mount('expectations');
    await press(t('settings.reminders.turnOn'));
    expect(mockReport).toHaveBeenCalledWith({ name: 'KvFailed' });
    expect(screen.getByText(t('settings.reminders.failed'))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('onboarding.expectations.action') })).toBeEnabled();
  });
});

describe('Apple Health, the old last step (K-312, ADR-018)', () => {
  test('where HealthKit is in the build: "Connect" records the consent, shows Apple\'s sheet, then finishes', async () => {
    mockHealth.available = true;
    const order: string[] = [];
    mockApi.PUT.mockImplementation(async (_path, init) => {
      order.push(`consent ${(init as { params: { path: { kind: string } } }).params.path.kind}`);
      return { data: { status: 'GRANTED' }, response: new Response(null, { status: 200 }) };
    });
    mockHealth.requestRead.mockImplementation(async () => void order.push('sheet'));
    mockProfile.save.mockImplementation(async () => void order.push('profile'));
    await mount('apple-health', { allow: true });
    await press(t('onboarding.appleHealth.connect'));
    // Apple's sheet first: if it fails, no consent is left recorded for a connection that never happened.
    expect(order).toEqual(['sheet', 'consent APPLE_HEALTH', 'profile']);
    // The phone knows at once (K-402 review): a weigh-in offline right after onboarding still finds it.
    expect(mockConsents.remember).toHaveBeenCalledWith('APPLE_HEALTH', 'GRANTED');
  });

  test('"Not now" records nothing and finishes', async () => {
    mockHealth.available = true;
    await mount('apple-health', { allow: true });
    await press(t('onboarding.appleHealth.notNow'));
    expect(mockApi.PUT).not.toHaveBeenCalled();
    expect(mockHealth.requestRead).not.toHaveBeenCalled();
    expect(mockProfile.save).toHaveBeenCalledTimes(1);
  });

  test("a connection that fails says so and does not finish: the choice is the user's to make again", async () => {
    mockHealth.available = true;
    await mount('apple-health', { allow: true });
    mockConsentStatus = 503;
    await press(t('onboarding.appleHealth.connect'));
    expect(screen.getByText(t('onboarding.serverError'))).toBeOnTheScreen(); // the server answered 503
    expect(mockProfile.save).not.toHaveBeenCalled();
  });

  test('without HealthKit in the build (Expo Go): the screen says so, offers no Connect, records no consent', async () => {
    await mount('apple-health');
    expect(screen.getByText(t('onboarding.appleHealth.unavailable'))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('onboarding.appleHealth.connect') })).toBeNull();
    await press(t('onboarding.appleHealth.finish'));
    expect(mockApi.PUT).not.toHaveBeenCalled();
    expect(mockProfile.save).toHaveBeenCalledTimes(1);
  });

  test('without the health consent, Apple Health is not offered even where HealthKit is in the build', async () => {
    mockHealth.available = true;
    await mount('apple-health');
    expect(screen.queryByRole('button', { name: t('onboarding.appleHealth.connect') })).toBeNull();
    expect(screen.getByText(t('onboarding.appleHealth.needsConsent'))).toBeOnTheScreen();
  });

  test('Apple\'s sheet failing says so, records no consent, and "Not now" still finishes cleanly', async () => {
    mockHealth.available = true;
    await mount('apple-health', { allow: true });
    mockHealth.requestRead.mockRejectedValueOnce(new Error('HealthKit'));
    await press(t('onboarding.appleHealth.connect'));
    expect(screen.getByText(t('onboarding.appleHealth.sheetFailed'))).toBeOnTheScreen();
    expect(mockApi.PUT).not.toHaveBeenCalled();
    expect(mockReport).toHaveBeenCalledWith({ name: 'HealthSheetFailed' }); // named by connectAppleHealth (K-309)
    await press(t('onboarding.appleHealth.notNow'));
    expect(mockApi.PUT).not.toHaveBeenCalled();
    expect(mockProfile.save).toHaveBeenCalledTimes(1);
  });

  test('a server that refuses (not the network) is not called a connection problem', async () => {
    mockProfile.save.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'ProfileSaveFailed' }));
    await mount('apple-health');
    await press(t('onboarding.appleHealth.finish'));
    expect(screen.getByText(t('onboarding.serverError'))).toBeOnTheScreen();
    expect(mockReport).toHaveBeenCalledWith({ name: 'ProfileSaveFailed' });
  });
});
