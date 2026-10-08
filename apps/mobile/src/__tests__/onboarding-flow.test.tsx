/**
 * Onboarding (K-306): who sees it, and the walk through it. Routes are rendered from the real src/app folder; the
 * services are faked — the answers that route (signed in, onboarding state) and the profile save.
 */
import * as path from 'path';

import { router as appRouter } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { t } from '@/copy';
import { notificationParams } from '@/notifications/params';
import { walk } from '@/onboarding/flow';
import { defaultTrainingDays } from '@/onboarding/params';
import type { OnboardingState } from '@/onboarding/profileStatus';

jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));

let mockSignedIn = true;
let mockOnboarding: OnboardingState = 'needed';
const mockOnboardingListeners = new Set<() => void>();
/** Like the real service: the state changes and whoever listens re-renders. */
function mockBecome(state: OnboardingState) {
  mockOnboarding = state;
  mockOnboardingListeners.forEach((listener) => listener());
}
let mockUnits: 'METRIC' | 'IMPERIAL' = 'METRIC';
const mockUnitsListeners = new Set<() => void>();
const mockProfile = { save: jest.fn(async (_profile: unknown) => {}), refresh: jest.fn(async () => {}) };
const mockSignOut = jest.fn(async () => {});
// The server's answer to a consent PUT; `mockConsentStatus` 200 records it.
let mockConsentStatus = 200;
const mockConsentAnswer = async (_path: string, _init: unknown) =>
  mockConsentStatus === 200
    ? { data: { status: 'GRANTED' }, response: new Response(null, { status: 200 }) }
    : { error: { code: 'X' }, response: new Response(null, { status: mockConsentStatus }) };
const mockApi = { PUT: jest.fn(mockConsentAnswer), DELETE: jest.fn(mockConsentAnswer) };
const mockQueue = { record: jest.fn(async (_record: unknown) => true), drain: jest.fn(async () => {}) };
const mockConsents = { remember: jest.fn(async (_kind: string, _status: string) => {}) };
// Like the real service (K-231): a refusal throws by name; what went through leaves the phone's health entries behind.
const mockWithdrawHealthData = jest.fn(async () => {
  if (mockConsentStatus !== 200) throw Object.assign(new Error('x'), { name: 'ConsentRefused' });
});
const mockHealth = { available: false, requestRead: jest.fn(async () => {}) };
const mockTurnOn = jest.fn(async () => ({ granted: true, canAskAgain: false }));
const mockSetCue = jest.fn(async (_cue: string) => {});
let mockReminderSettings = { enabled: false, cue: '' }; // one object per test: useSyncExternalStore compares by identity
const mockReport = jest.fn();
const mockKeepOnPhone = jest.fn(async (system: 'METRIC' | 'IMPERIAL') => {
  mockUnits = system;
  mockUnitsListeners.forEach((listener) => listener());
});
jest.mock('@/services/ServicesProvider', () => ({
  ServicesProvider: ({ children }: { children: unknown }) => children,
  useSignedIn: () => mockSignedIn,
  useSubscriptionGate: () => 'open', // the gate after onboarding (K-706) is navigation.test.tsx's
  useAppearance: () => 'light',
  useOnboarding: () =>
    jest.requireActual<typeof import('react')>('react').useSyncExternalStore(
      (listener: () => void) => (mockOnboardingListeners.add(listener), () => mockOnboardingListeners.delete(listener)),
      () => mockOnboarding,
    ),
  // Like the real hook: the screen re-renders when the choice changes.
  useUnits: () =>
    jest.requireActual<typeof import('react')>('react').useSyncExternalStore(
      (listener: () => void) => (mockUnitsListeners.add(listener), () => mockUnitsListeners.delete(listener)),
      () => mockUnits,
    ),
  useAppServices: () => ({
    signInWithApple: jest.fn(),
    appleAvailable: async () => false,
    profile: mockProfile,
    signOut: mockSignOut,
    api: mockApi,
    queue: mockQueue,
    health: mockHealth,
    report: mockReport,
    withdrawHealthData: mockWithdrawHealthData,
    consents: mockConsents,
    syncHealth: async () => 0, // Today reads Apple Health's weigh-ins first (K-402); none here
    units: { current: () => mockUnits, keepOnPhone: mockKeepOnPhone },
    // Today hands on the program's week off (ADR-037 › 51b); What to expect offers to turn them on (K-434).
    reminders: {
      era: () => 0,
      keepRestUntil: async () => {},
      turnOn: mockTurnOn,
      setCue: mockSetCue,
      current: () => mockReminderSettings,
      subscribe: () => () => {},
    },
    state: { keep: async () => {} }, // Today keeps the state it read, for the reminders (K-518)
    opens: { previous: async () => null }, // Today counts its open (K-521)
  }),
}));

const APP = path.resolve(__dirname, '../app');

beforeEach(() => {
  mockSignedIn = true;
  mockOnboarding = 'needed';
  mockUnits = 'METRIC';
  // Like the real service: a save that goes through marks onboarding done.
  mockProfile.save.mockReset().mockImplementation(async () => mockBecome('done'));
  mockSignOut.mockClear();
  mockConsentStatus = 200;
  mockApi.PUT.mockReset().mockImplementation(mockConsentAnswer);
  mockApi.DELETE.mockReset().mockImplementation(mockConsentAnswer);
  mockQueue.record.mockReset().mockResolvedValue(true);
  mockWithdrawHealthData.mockClear();
  mockConsents.remember.mockClear();
  mockHealth.available = false;
  mockReport.mockClear();
  mockHealth.requestRead.mockReset().mockResolvedValue(undefined);
  mockProfile.refresh.mockReset().mockResolvedValue(undefined);
  mockKeepOnPhone.mockClear();
  mockTurnOn.mockReset().mockResolvedValue({ granted: true, canAskAgain: false });
  mockSetCue.mockReset().mockResolvedValue(undefined);
  mockReminderSettings = { enabled: false, cue: '' };
});

/** The rendered router is itself awaitable, so it is wrapped: returned bare from an async function it would be awaited. */
async function open(url = '/') {
  const router = renderRouter(APP, { initialUrl: url });
  await router;
  await settle();
  return { getPathname: () => router.getPathname() };
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

/** An answer by the start of its words ("3+ years" read as text, not as a pattern). */
async function choose(name: string) {
  const start = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await fireEvent.press(screen.getByRole('radio', { name: new RegExp(`^${start}`) }));
  await settle();
}

const continueButton = () => screen.getByRole('button', { name: t('onboarding.continue') });

describe('who sees onboarding', () => {
  test.each(['/', '/train', '/coach'])('signed in without a profile: onboarding opens, even from %s', async (url) => {
    const router = await open(url);
    expect(router.getPathname()).toBe('/onboarding');
    expect(screen.queryByRole('button', { name: t('coach.entry') })).toBeNull();
  });

  test('signed in with a profile: the tabs, and onboarding is not reachable', async () => {
    mockOnboarding = 'done';
    const router = await open('/onboarding');
    expect(router.getPathname()).toBe('/');
  });

  test('signed out: sign-in, never onboarding', async () => {
    mockSignedIn = false;
    const router = await open('/onboarding');
    expect(router.getPathname()).toBe('/sign-in');
  });

  const named = (name: string) => Object.assign(new Error(name), { name });

  test('not known yet (the first start offline): a screen that asks the server, and can try again', async () => {
    mockOnboarding = 'unknown';
    mockProfile.refresh.mockRejectedValue(named('NoConnection'));
    const router = await open('/');
    expect(router.getPathname()).toBe('/checking');
    expect(mockProfile.refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByText(t('onboarding.checking.offline'))).toBeOnTheScreen();
    await press(t('onboarding.checking.retry'));
    expect(mockProfile.refresh).toHaveBeenCalledTimes(2);
    expect(screen.getByText(t('onboarding.checking.offline'))).toBeOnTheScreen(); // failed again: said again
    expect(screen.getByRole('button', { name: t('onboarding.checking.retry') })).toBeOnTheScreen();
  });

  test('the answer arriving on a retry moves on by itself: no profile → onboarding', async () => {
    mockOnboarding = 'unknown';
    mockProfile.refresh.mockRejectedValueOnce(named('NoConnection')).mockImplementationOnce(async () => mockBecome('needed'));
    const router = await open('/');
    await press(t('onboarding.checking.retry'));
    expect(router.getPathname()).toBe('/onboarding');
  });

  test('a server that answers with an error is not called "no connection"', async () => {
    mockOnboarding = 'unknown';
    mockProfile.refresh.mockRejectedValue(named('ProfileReadFailed'));
    await open('/');
    expect(screen.getByText(t('onboarding.checking.serverError'))).toBeOnTheScreen();
    expect(screen.queryByText(t('onboarding.checking.offline'))).toBeNull();
  });

  test('stuck on the checking screen, the user can still sign out', async () => {
    mockOnboarding = 'unknown';
    mockProfile.refresh.mockRejectedValue(named('ProfileReadFailed'));
    await open('/');
    await press(t('onboarding.signOut'));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});

describe('the walk through', () => {
  test('an answer is one tap: it is kept and the next question opens, with nothing to confirm', async () => {
    const router = await open();
    expect(screen.queryByRole('button', { name: t('onboarding.continue') })).toBeNull();
    await choose(t('onboarding.goal.decide_for_me.title'));
    expect(router.getPathname()).toBe('/onboarding/experience');
  });

  test('"Decide for me" is the recommended answer, first; the other goals stay one tap away (ADR-072 #2, K-222)', async () => {
    await open();
    expect(screen.getAllByRole('radio').map((option) => option.props.accessibilityLabel)).toEqual([
      `${t('onboarding.goal.decide_for_me.title')}, ${t('onboarding.recommended')}, ${t('onboarding.goal.decide_for_me.body')}`,
      t('onboarding.goal.lose_fat.title'),
      t('onboarding.goal.build_muscle.title'),
    ]);
  });

  test('going back keeps the answer', async () => {
    const router = await open();
    await choose(t('onboarding.goal.build_muscle.title'));
    expect(router.getPathname()).toBe('/onboarding/experience');
    await press(t('onboarding.back'));
    expect(router.getPathname()).toBe('/onboarding');
    expect(screen.getByRole('radio', { name: new RegExp(`^${t('onboarding.goal.build_muscle.title')}`) })).toBeChecked();
  });

  test("the whole walk sends one profile, with the user's answers", async () => {
    const router = await open();
    await choose(t('onboarding.goal.decide_for_me.title'));
    await choose(t('onboarding.experience.Y1_3'));
    await choose(t('onboarding.program.bring_my_own.title'));
    await choose(t('onboarding.days.label', { count: 2 }));
    expect(router.getPathname()).toBe('/onboarding/health-data');
    await press(t('onboarding.healthData.notNow'));
    expect(router.getPathname()).toBe('/onboarding/about');
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.heightCm')), '178');
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.birthYear')), '1994');
    await press(t('onboarding.about.female'));
    await press(t('onboarding.continue'));
    await choose(t('onboarding.activity.LOW_ACTIVE.title'));
    await press(t('onboarding.continue'));
    expect(router.getPathname()).toBe('/onboarding/photos');
    await press(t('onboarding.continue'));
    expect(router.getPathname()).toBe('/onboarding/expectations');
    await press(t('onboarding.expectations.action'));
    expect(router.getPathname()).toBe('/onboarding/apple-health');
    expect(mockProfile.save).not.toHaveBeenCalled();
    await press(t('onboarding.appleHealth.finish'));
    expect(mockProfile.save).toHaveBeenCalledTimes(1);
    expect(mockProfile.save).toHaveBeenCalledWith({
      goal: 'DECIDE_FOR_ME',
      sex: 'FEMALE',
      heightCm: 178,
      birthYear: 1994,
      activityLevel: 'LOW_ACTIVE',
      experience: 'Y1_3',
      programChoice: 'BRING_MY_OWN',
      schedule: {
        trainingDays: ['MONDAY', 'THURSDAY'],
        checkInDay: 'MONDAY',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      units: 'METRIC',
    });
  });

  test('a save that does not go through says so, and the same answers go again', async () => {
    mockProfile.save.mockRejectedValueOnce(Object.assign(new Error('profile save: no answer'), { name: 'NoConnection' }));
    const router = await walkTo('appleHealth');
    await press(t('onboarding.appleHealth.finish'));
    expect(screen.getByText(t('onboarding.saveFailed'))).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/onboarding/apple-health');
    await press(t('onboarding.appleHealth.finish'));
    expect(mockProfile.save).toHaveBeenCalledTimes(2);
    expect(mockProfile.save.mock.calls[1][0]).toEqual(mockProfile.save.mock.calls[0][0]);
  });

  test('once the profile is saved, the tabs open, and there is no way back into onboarding', async () => {
    const router = await walkTo('appleHealth');
    await press(t('onboarding.appleHealth.finish'));
    expect(router.getPathname()).toBe('/');
    expect(screen.getByRole('header', { name: t('screens.today.title') })).toBeOnTheScreen();
    expect(appRouter.canGoBack()).toBe(false);
  });

  test('a second tap while saving sends nothing more, and the button is off', async () => {
    let finish = () => {};
    mockProfile.save.mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));
    await walkTo('appleHealth');
    const button = screen.getByRole('button', { name: t('onboarding.appleHealth.finish') });
    // Two taps in the same moment while the save is on its way. Awaiting a press whose save never ends hangs React's
    // act(), so both go into one act unawaited; React notes the overlap, which is the point here, so the note is muted.
    const overlapNote = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await act(async () => {
        void fireEvent.press(button);
        void fireEvent.press(button);
      });
    } finally {
      overlapNote.mockRestore();
    }
    expect(mockProfile.save).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: t('onboarding.appleHealth.finish') })).toBeDisabled();
    await act(async () => finish());
  });

  test('imperial all the way: feet and inches go out as centimetres, with the imperial choice', async () => {
    await walkTo('about');
    await press(t('onboarding.about.imperial'));
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.heightFeet')), '5');
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.heightInches')), '10');
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.birthYear')), '1990');
    await press(t('onboarding.about.male'));
    await press(t('onboarding.continue'));
    await choose(t('onboarding.activity.ACTIVE.title'));
    await press(t('onboarding.continue'));
    await press(t('onboarding.continue'));
    await press(t('onboarding.expectations.action'));
    await press(t('onboarding.appleHealth.finish'));
    expect(mockProfile.save).toHaveBeenCalledWith(expect.objectContaining({ heightCm: 178, units: 'IMPERIAL' }));
  });

  test('going back keeps typed answers too: height, year, sex, the days', async () => {
    await walkTo('activity');
    await press(t('onboarding.back'));
    expect(screen.getByLabelText(t('onboarding.about.heightCm')).props.value).toBe('180');
    expect(screen.getByLabelText(t('onboarding.about.birthYear')).props.value).toBe('1990');
    expect(screen.getByRole('button', { name: t('onboarding.about.male') })).toBeSelected();
    expect(continueButton()).toBeEnabled();
    await press(t('onboarding.back')); // the health consent
    await press(t('onboarding.back'));
    expect(screen.getByRole('radio', { name: t('onboarding.days.label', { count: 3 }) })).toBeChecked();
  });

  test('no step shows a missing text key', async () => {
    // A missing key shows "[missing: …]"; a placeholder left unfilled shows "{name}".
    const clean = () => {
      expect(screen.queryByText(/\[missing:/)).toBeNull();
      expect(screen.queryByText(/\{\w+\}/)).toBeNull();
    };
    await walkTo('appleHealth', { eachStep: clean });
    clean();
  });

  test('the first step offers a way out: signing out (a different Apple ID)', async () => {
    await open();
    await press(t('onboarding.signOut'));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});

describe('what the words promise is what the parameters say', () => {
  test('the photo gap, the quiet days and the check-in day are filled in, not written out', async () => {
    const en = jest.requireActual<Record<string, Record<string, Record<string, unknown>>>>('../../../../data/copy/en.json');
    const onboarding = en.onboarding as Record<string, Record<string, unknown>>;
    expect(JSON.stringify(onboarding.photos)).not.toMatch(/\b4\b|[Ff]our/);
    expect(JSON.stringify(onboarding.expectations)).not.toMatch(/two weeks|Monday/);
  });
});

describe('experience (ADR-072 #3)', () => {
  test('four answers, in years; the one chosen opens the program question', async () => {
    const router = await walkTo('experience');
    expect(screen.getByText(t('onboarding.experience.why'))).toBeOnTheScreen();
    expect(screen.getAllByRole('radio').map((option) => option.props.accessibilityLabel)).toEqual(
      ['NEW', 'UNDER_1Y', 'Y1_3', 'Y3_PLUS'].map((level) => t(`onboarding.experience.${level}`)),
    );
    await choose(t('onboarding.experience.Y3_PLUS'));
    expect(router.getPathname()).toBe('/onboarding/program');
    await press(t('onboarding.back'));
    expect(screen.getByRole('radio', { name: t('onboarding.experience.Y3_PLUS') })).toBeChecked();
  });
});

describe('program (ADR-072 #2)', () => {
  test('"Build it for me" is recommended, first; "I have my own" is a tap away', async () => {
    await walkTo('program');
    expect(screen.getAllByRole('radio').map((option) => option.props.accessibilityLabel)).toEqual([
      `${t('onboarding.program.build_one_for_me.title')}, ${t('onboarding.recommended')}, ${t('onboarding.program.build_one_for_me.body')}`,
      `${t('onboarding.program.bring_my_own.title')}, ${t('onboarding.program.bring_my_own.body')}`,
    ]);
  });

  test('bringing a program opens its branch, which asks the days until bringing it in has its screen (K-968)', async () => {
    const router = await walkTo('program');
    await choose(t('onboarding.program.bring_my_own.title'));
    expect(router.getPathname()).toBe('/onboarding/days');
  });
});

describe('days (ADR-072 #4)', () => {
  test('two to five boxes and nothing else to answer: last month and a usual time are no longer asked', async () => {
    await walkTo('days');
    expect(screen.getByText(t('onboarding.days.note'))).toBeOnTheScreen();
    expect(screen.getAllByRole('radio').map((option) => option.props.accessibilityLabel)).toEqual(
      [2, 3, 4, 5].map((count) => t('onboarding.days.label', { count })),
    );
    expect(screen.queryByRole('button', { name: t('onboarding.continue') })).toBeNull();
  });

  test('a box places the days itself, from the parameter, and moves on (We place the days)', async () => {
    const router = await walkTo('consent', { days: 4 });
    expect(router.getPathname()).toBe('/onboarding/health-data');
    await press(t('onboarding.healthData.notNow'));
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.heightCm')), '180');
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.birthYear')), '1990');
    await press(t('onboarding.about.male'));
    await press(t('onboarding.continue'));
    await choose(t('onboarding.activity.ACTIVE.title'));
    await press(t('onboarding.continue'));
    await press(t('onboarding.continue'));
    await press(t('onboarding.expectations.action'));
    await press(t('onboarding.appleHealth.finish'));
    const sent = mockProfile.save.mock.calls[0][0] as { schedule: Record<string, unknown> };
    expect(sent.schedule.trainingDays).toEqual(defaultTrainingDays(4));
    expect(sent.schedule).not.toHaveProperty('sessionsLastMonth');
    expect(sent.schedule).not.toHaveProperty('usualTrainingTime');
  });
});

describe('the step indicator follows the branch', () => {
  const indicator = (step: number, total: number) => screen.getByLabelText(t('onboarding.progress', { step, total }));

  test.each([
    ['a new lifter', 'NEW', 'build_one_for_me'],
    ['an experienced lifter', 'Y3_PLUS', 'build_one_for_me'],
    ['an own program', 'UNDER_1Y', 'bring_my_own'],
  ] as const)('%s: the steps of its walk (flow.ts), this one filled', async (_, experience, program) => {
    const total = walk({
      experience,
      programChoice: program === 'bring_my_own' ? 'BRING_MY_OWN' : 'BUILD_ONE_FOR_ME',
      healthConsent: null,
    }).length;
    await walkTo('days', { experience, program });
    expect(indicator(4, total)).toBeOnTheScreen();
  });

  test('on the first question: step 1', async () => {
    await open();
    expect(indicator(1, walk({ experience: null, programChoice: null, healthConsent: null }).length)).toBeOnTheScreen();
  });
});

describe('about you', () => {
  test('a birth year under 18 says so and is not accepted (ADR-027 #13)', async () => {
    await walkTo('about');
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.heightCm')), '178');
    await press(t('onboarding.about.male'));
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.birthYear')), String(new Date().getFullYear() - 17));
    await settle();
    expect(screen.getByText(t('onboarding.about.tooYoung'))).toBeOnTheScreen();
    expect(continueButton()).toBeDisabled();
  });

  test('a half-typed answer is not called wrong: no problem shown on "19" or "17"', async () => {
    await walkTo('about');
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.birthYear')), '19');
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.heightCm')), '17');
    await settle();
    expect(screen.queryByText(t('onboarding.about.notAYear'))).toBeNull();
    expect(screen.queryByText(t('onboarding.about.heightInvalid'))).toBeNull();
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.heightCm')), '17.');
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.heightCm')), '99');
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.heightCm')), '990');
    await settle();
    expect(screen.getByText(t('onboarding.about.heightInvalid'))).toBeOnTheScreen();
  });

  test('imperial users type feet and inches; the choice of units is made here too', async () => {
    await walkTo('about');
    expect(screen.queryByLabelText(t('onboarding.about.heightFeet'))).toBeNull();
    await press(t('onboarding.about.imperial'));
    expect(mockKeepOnPhone).toHaveBeenCalledWith('IMPERIAL'); // no profile yet: no network needed
    expect(screen.getByLabelText(t('onboarding.about.heightFeet'))).toBeOnTheScreen();
    expect(screen.getByLabelText(t('onboarding.about.heightInches'))).toBeOnTheScreen();
  });
});

describe('activity: the four NASEM levels, each with a day to recognise (ADR-027 #6)', () => {
  test('four choices, each with its example', async () => {
    await walkTo('activity');
    for (const level of ['INACTIVE', 'LOW_ACTIVE', 'ACTIVE', 'VERY_ACTIVE']) {
      expect(
        screen.getByRole('radio', { name: `${t(`onboarding.activity.${level}.title`)}, ${t(`onboarding.activity.${level}.body`)}` }),
      ).toBeOnTheScreen();
    }
    expect(screen.getAllByRole('radio')).toHaveLength(4);
  });
});

type Walk = {
  eachStep?: () => void;
  /** The health consent allowed; declined otherwise. */
  allow?: boolean;
  experience?: 'NEW' | 'UNDER_1Y' | 'Y1_3' | 'Y3_PLUS';
  program?: 'build_one_for_me' | 'bring_my_own';
  days?: number;
};

/** Answers every step before `step`, the shortest way (the health consent declined unless `allow`), and stops on it. */
async function walkTo(
  step: 'experience' | 'program' | 'days' | 'consent' | 'about' | 'activity' | 'expectations' | 'appleHealth',
  { eachStep = () => {}, allow = false, experience = 'Y1_3', program = 'build_one_for_me', days = 3 }: Walk = {},
) {
  const router = await open();
  eachStep();
  await choose(t('onboarding.goal.lose_fat.title'));
  eachStep();
  if (step === 'experience') return router;
  await choose(t(`onboarding.experience.${experience}`));
  eachStep();
  if (step === 'program') return router;
  await choose(t(`onboarding.program.${program}.title`));
  eachStep();
  if (step === 'days') return router;
  await choose(t('onboarding.days.label', { count: days }));
  eachStep();
  if (step === 'consent') return router;
  await press(t(allow ? 'onboarding.healthData.allow' : 'onboarding.healthData.notNow'));
  eachStep();
  if (step === 'about') return router;
  await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.heightCm')), '180');
  await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.birthYear')), '1990');
  await press(t('onboarding.about.male'));
  if (allow) await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.weight')), '82.4');
  await press(t('onboarding.continue'));
  eachStep();
  if (step === 'activity') return router;
  await choose(t('onboarding.activity.ACTIVE.title'));
  await press(t('onboarding.continue'));
  eachStep();
  if (allow) {
    await press(t('onboarding.continue')); // foods: optional
    eachStep();
  }
  await press(t('onboarding.continue')); // photos
  eachStep();
  if (step === 'expectations') return router;
  await press(t('onboarding.expectations.action'));
  return router;
}

describe('reminders, offered once in onboarding with what they are (K-434, ADR-037 #51)', () => {
  const cueField = () => screen.getByLabelText(t('settings.reminders.cue.label'));

  test('What to expect says the three kinds and asks for the user\'s own words; going on asks nothing, turns nothing on', async () => {
    const router = await walkTo('expectations');
    expect(router.getPathname()).toBe('/onboarding/expectations');
    expect(screen.getByText(t('settings.reminders.what', { minutes: notificationParams.trainingLeadMinutes }))).toBeOnTheScreen();
    await fireEvent.changeText(cueField(), 'After work, straight to the gym');
    await press(t('onboarding.expectations.action'));
    expect(router.getPathname()).toBe('/onboarding/apple-health');
    expect(mockTurnOn).not.toHaveBeenCalled();
    expect(mockSetCue).not.toHaveBeenCalled();
  });

  test('"Turn on" keeps the sentence, then asks iOS through the same service as Settings; on, it says so', async () => {
    await walkTo('expectations');
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
    await walkTo('expectations');
    await press(t('settings.reminders.turnOn'));
    expect(mockSetCue).not.toHaveBeenCalled();
    expect(screen.getByText(t('onboarding.reminders.refused'))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('settings.reminders.openSettings') })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('settings.reminders.turnOn') })).toBeNull();
    expect(screen.queryByText(t('onboarding.reminders.on'))).toBeNull();
  });

  test('iOS not deciding yet (its sheet can still show): nothing is said off, and the button stays', async () => {
    mockTurnOn.mockResolvedValue({ granted: false, canAskAgain: true });
    await walkTo('expectations');
    await press(t('settings.reminders.turnOn'));
    expect(screen.queryByText(t('onboarding.reminders.refused'))).toBeNull();
    expect(screen.getByRole('button', { name: t('settings.reminders.turnOn') })).toBeEnabled();
  });

  test('a sentence typed but not turned on says it is kept only with the reminders', async () => {
    await walkTo('expectations');
    expect(screen.queryByText(t('onboarding.reminders.cueKeptOnlyOn'))).toBeNull();
    await fireEvent.changeText(screen.getByLabelText(t('settings.reminders.cue.label')), 'After work');
    expect(screen.getByText(t('onboarding.reminders.cueKeptOnlyOn'))).toBeOnTheScreen();
  });

  test('reminders already on (the step opened again): said so, not offered again', async () => {
    mockReminderSettings = { enabled: true, cue: '' };
    await walkTo('expectations');
    expect(screen.getByText(t('onboarding.reminders.on'))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('settings.reminders.turnOn') })).toBeNull();
  });

  test('a sentence that could not be kept: iOS is not asked, and it is said', async () => {
    mockSetCue.mockRejectedValue(Object.assign(new Error('kv failed'), { name: 'KvFailed' }));
    await walkTo('expectations');
    await fireEvent.changeText(screen.getByLabelText(t('settings.reminders.cue.label')), 'After work');
    await press(t('settings.reminders.turnOn'));
    expect(mockTurnOn).not.toHaveBeenCalled();
    expect(screen.getByText(t('settings.reminders.failed'))).toBeOnTheScreen();
  });

  test('a second tap while iOS asks turns on once, and the button is off', async () => {
    let answer: (value: { granted: boolean; canAskAgain: boolean }) => void = () => {};
    mockTurnOn.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    await walkTo('expectations');
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

  test('reminders that could not be kept say so and never hold onboarding up', async () => {
    mockTurnOn.mockRejectedValue(Object.assign(new Error('kv failed'), { name: 'KvFailed' }));
    const router = await walkTo('expectations');
    await press(t('settings.reminders.turnOn'));
    expect(mockReport).toHaveBeenCalledWith({ name: 'KvFailed' });
    expect(screen.getByText(t('settings.reminders.failed'))).toBeOnTheScreen();
    await press(t('onboarding.expectations.action'));
    expect(router.getPathname()).toBe('/onboarding/apple-health');
  });
});

describe('the health data consent (K-312, ADR-007)', () => {
  test('its own step, with the consent text; "Allow" records the version shown, then moves on', async () => {
    const router = await walkTo('consent');
    expect(screen.getByRole('header', { name: t('consent.health_data.title') })).toBeOnTheScreen();
    expect(screen.getByText(t('consent.health_data.body'))).toBeOnTheScreen();
    await press(t('onboarding.healthData.allow'));
    expect(mockApi.PUT).toHaveBeenCalledWith('/v1/consents/{kind}', {
      params: { path: { kind: 'HEALTH_DATA' } },
      body: { textVersion: t('consent.health_data.version') },
    });
    expect(router.getPathname()).toBe('/onboarding/about');
  });

  test('allowed: the weight and waist are asked, the foods step is in the walk, and the profile goes before the records', async () => {
    const order: string[] = [];
    mockQueue.record.mockImplementation(async (record) => (order.push((record as { kind: string }).kind), true));
    mockProfile.save.mockImplementation(async () => {
      order.push('profile');
      mockBecome('done');
    });
    const router = await walkTo('activity', { allow: true });
    await choose(t('onboarding.activity.ACTIVE.title'));
    await press(t('onboarding.continue'));
    expect(router.getPathname()).toBe('/onboarding/foods');
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.foods.label')), 'peanuts, shellfish');
    await press(t('onboarding.continue'));
    await press(t('onboarding.continue'));
    await press(t('onboarding.expectations.action'));
    await press(t('onboarding.appleHealth.finish'));
    expect(order).toEqual(['profile', 'weighIn']);
    expect(mockQueue.record).toHaveBeenCalledWith({
      kind: 'weighIn',
      body: expect.objectContaining({ kg: 82.4, source: 'MANUAL', clientId: expect.stringMatching(/^[0-9a-f-]{36}$/) }),
    });
    expect(mockProfile.save).toHaveBeenCalledWith(expect.objectContaining({ food: { avoid: ['peanuts', 'shellfish'] } }));
  });

  test('"Not now": nothing recorded, no weight or waist asked, no foods step, no health records sent', async () => {
    const router = await walkTo('about');
    expect(mockApi.PUT).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(t('onboarding.about.weight'))).toBeNull();
    expect(screen.queryByLabelText(t('onboarding.about.waist'))).toBeNull();
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.heightCm')), '180');
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.birthYear')), '1990');
    await press(t('onboarding.about.male'));
    await press(t('onboarding.continue'));
    await choose(t('onboarding.activity.ACTIVE.title'));
    await press(t('onboarding.continue'));
    expect(router.getPathname()).toBe('/onboarding/photos');
    await press(t('onboarding.continue'));
    await press(t('onboarding.expectations.action'));
    await press(t('onboarding.appleHealth.finish'));
    expect(mockQueue.record).not.toHaveBeenCalled();
    expect(mockProfile.save).toHaveBeenCalledWith(expect.not.objectContaining({ food: expect.anything() }));
  });

  test('a consent the server did not record says so, and does not move on', async () => {
    mockConsentStatus = 503;
    const router = await walkTo('consent');
    await press(t('onboarding.healthData.allow'));
    // The server answered (503): not called a connection problem.
    expect(screen.getByText(t('onboarding.serverError'))).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/onboarding/health-data');
  });

  test('allowed, the weight is required; a waist typed must be one', async () => {
    await walkTo('about', { allow: true });
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.heightCm')), '180');
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.birthYear')), '1990');
    await press(t('onboarding.about.male'));
    expect(continueButton()).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.weight')), '82');
    await settle();
    expect(continueButton()).toBeEnabled();
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.waist')), '8x');
    await settle();
    expect(screen.getByText(t('onboarding.about.waistInvalid'))).toBeOnTheScreen();
    expect(continueButton()).toBeDisabled();
  });

  test('the step count follows the walk: 10 steps without the consent, 11 with it', async () => {
    await walkTo('about');
    expect(screen.getByLabelText(t('onboarding.progress', { step: 6, total: 10 }))).toBeOnTheScreen();
  });

  test('allowed, no step shows a missing text key or an unfilled placeholder either', async () => {
    const clean = () => {
      expect(screen.queryByText(/\[missing:/)).toBeNull();
      expect(screen.queryByText(/\{\w+\}/)).toBeNull();
    };
    await walkTo('appleHealth', { eachStep: clean, allow: true });
    clean();
  });
});

describe('Apple Health, the last step (K-312, ADR-018)', () => {
  test('where HealthKit is in the build: "Connect" records the consent, shows Apple\'s sheet, then finishes', async () => {
    mockHealth.available = true;
    const order: string[] = [];
    mockApi.PUT.mockImplementation(async (_path, init) => {
      order.push(`consent ${(init as { params: { path: { kind: string } } }).params.path.kind}`);
      return { data: { status: 'GRANTED' }, response: new Response(null, { status: 200 }) };
    });
    mockHealth.requestRead.mockImplementation(async () => void order.push('sheet'));
    mockProfile.save.mockImplementation(async () => {
      order.push('profile');
      mockBecome('done');
    });
    await walkTo('appleHealth', { allow: true });
    order.length = 0; // the health data consent on the way
    await press(t('onboarding.appleHealth.connect'));
    // Apple's sheet first: if it fails, no consent is left recorded for a connection that never happened.
    expect(order).toEqual(['sheet', 'consent APPLE_HEALTH', 'profile']);
    // The phone knows both at once (K-402 review): a weigh-in offline right after onboarding still finds them.
    expect(mockConsents.remember).toHaveBeenCalledWith('HEALTH_DATA', 'GRANTED');
    expect(mockConsents.remember).toHaveBeenCalledWith('APPLE_HEALTH', 'GRANTED');
  });

  test('"Not now" records nothing and finishes', async () => {
    mockHealth.available = true;
    await walkTo('appleHealth', { allow: true });
    mockApi.PUT.mockClear();
    await press(t('onboarding.appleHealth.notNow'));
    expect(mockApi.PUT).not.toHaveBeenCalled();
    expect(mockHealth.requestRead).not.toHaveBeenCalled();
    expect(mockProfile.save).toHaveBeenCalledTimes(1);
  });

  test("a connection that fails says so and does not finish: the choice is the user's to make again", async () => {
    mockHealth.available = true;
    await walkTo('appleHealth', { allow: true });
    mockConsentStatus = 503;
    await press(t('onboarding.appleHealth.connect'));
    expect(screen.getByText(t('onboarding.serverError'))).toBeOnTheScreen(); // the server answered 503
    expect(mockProfile.save).not.toHaveBeenCalled();
  });

  test('without HealthKit in the build (Expo Go): the screen says so, offers no Connect, records no consent', async () => {
    await walkTo('appleHealth');
    expect(screen.getByText(t('onboarding.appleHealth.unavailable'))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: t('onboarding.appleHealth.connect') })).toBeNull();
    await press(t('onboarding.appleHealth.finish'));
    expect(mockApi.PUT).not.toHaveBeenCalled();
    expect(mockProfile.save).toHaveBeenCalledTimes(1);
  });
});

describe('review fixes (K-312)', () => {
  test('while "Allow" is on its way, "Not now" and back are off: the last choice is the one that counts', async () => {
    let answer: (value: Awaited<ReturnType<typeof mockConsentAnswer>>) => void = () => {};
    mockApi.PUT.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    await walkTo('consent');
    const overlapNote = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await act(async () => {
        void fireEvent.press(screen.getByRole('button', { name: t('onboarding.healthData.allow') }));
        void fireEvent.press(screen.getByRole('button', { name: t('onboarding.healthData.allow') }));
      });
    } finally {
      overlapNote.mockRestore();
    }
    expect(mockApi.PUT).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: t('onboarding.healthData.notNow') })).toBeDisabled();
    expect(screen.getByRole('button', { name: t('onboarding.back') })).toBeDisabled();
    await act(async () => answer({ data: { status: 'GRANTED' }, response: new Response(null, { status: 200 }) }));
  });

  test('allowed, the consent can be taken back here: withdrawn on the server, health answers cleared, not asked again', async () => {
    const router = await walkTo('about', { allow: true });
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.weight')), '82');
    await press(t('onboarding.back'));
    expect(router.getPathname()).toBe('/onboarding/health-data');
    await press(t('onboarding.healthData.withdraw'));
    // K-231: the one path that confirms the deletion on the server and forgets the phone's health entries.
    expect(mockWithdrawHealthData).toHaveBeenCalledTimes(1);
    expect(router.getPathname()).toBe('/onboarding/about');
    expect(screen.queryByLabelText(t('onboarding.about.weight'))).toBeNull();
    await press(t('onboarding.back'));
    await press(t('onboarding.healthData.allow'));
    expect(screen.getByLabelText(t('onboarding.about.weight')).props.value).toBe(''); // the 82 went with the consent
  });

  test('declined, then back and allowed: the weight is asked and the walk has 11 steps', async () => {
    await walkTo('about');
    expect(screen.getByLabelText(t('onboarding.progress', { step: 6, total: 10 }))).toBeOnTheScreen();
    await press(t('onboarding.back'));
    await press(t('onboarding.healthData.allow'));
    expect(screen.getByLabelText(t('onboarding.about.weight'))).toBeOnTheScreen();
    expect(screen.getByLabelText(t('onboarding.progress', { step: 6, total: 11 }))).toBeOnTheScreen();
  });

  test('changing the units after typing a weight clears it: 82 kg must not become 82 lb', async () => {
    await walkTo('about', { allow: true });
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.weight')), '82');
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.waist')), '84');
    await press(t('onboarding.about.imperial'));
    expect(screen.getByLabelText(t('onboarding.about.weight')).props.value).toBe('');
    expect(screen.getByLabelText(t('onboarding.about.waist')).props.value).toBe('');
  });

  test('imperial weight all the way: 180 lb goes as 81.65 kg', async () => {
    await walkTo('about', { allow: true });
    await press(t('onboarding.about.imperial'));
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.heightFeet')), '5');
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.heightInches')), '10');
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.birthYear')), '1990');
    await press(t('onboarding.about.male'));
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.weight')), '180');
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.waist')), '34');
    await press(t('onboarding.continue'));
    await choose(t('onboarding.activity.ACTIVE.title'));
    for (let i = 0; i < 3; i++) await press(t('onboarding.continue'));
    await press(t('onboarding.expectations.action'));
    await press(t('onboarding.appleHealth.finish'));
    expect(mockQueue.record).toHaveBeenCalledWith(expect.objectContaining({ kind: 'weighIn', body: expect.objectContaining({ kg: 81.65 }) }));
    expect(mockQueue.record).toHaveBeenCalledWith(expect.objectContaining({ kind: 'waist', body: expect.objectContaining({ cm: 86.4 }) }));
    expect(mockProfile.save).toHaveBeenCalledWith(expect.objectContaining({ units: 'IMPERIAL' }));
  });

  test('without the health consent, Apple Health is not offered even where HealthKit is in the build', async () => {
    mockHealth.available = true;
    await walkTo('appleHealth');
    expect(screen.queryByRole('button', { name: t('onboarding.appleHealth.connect') })).toBeNull();
    expect(screen.getByText(t('onboarding.appleHealth.needsConsent'))).toBeOnTheScreen();
  });

  test('Apple\'s sheet failing says so, records no consent, and "Not now" still finishes cleanly', async () => {
    mockHealth.available = true;
    await walkTo('appleHealth', { allow: true });
    mockApi.PUT.mockClear();
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
    await walkTo('appleHealth');
    await press(t('onboarding.appleHealth.finish'));
    expect(screen.getByText(t('onboarding.serverError'))).toBeOnTheScreen();
    expect(mockReport).toHaveBeenCalledWith({ name: 'ProfileSaveFailed' });
  });
});
