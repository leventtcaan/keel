/**
 * Onboarding (K-306, ADR-072): who sees it, and the walk through it. Routes are rendered from the real src/app folder;
 * the services are faked — the answers that route (signed in, onboarding state) and the profile save. The route's
 * branches themselves are onboarding-route.test.ts; the screens taken off the walk, onboarding-retired.test.tsx.
 */
import * as path from 'path';

import { router as appRouter } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { t } from '@/copy';
import { walk } from '@/onboarding/flow';
import { defaultTrainingDays, onboardingParams } from '@/onboarding/params';
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
    report: mockReport,
    withdrawHealthData: mockWithdrawHealthData,
    consents: mockConsents,
    syncHealth: async () => 0, // Today reads Apple Health's weigh-ins first (K-402); none here
    units: { current: () => mockUnits, keepOnPhone: mockKeepOnPhone },
    // Today hands on the program's week off (ADR-037 › 51b).
    reminders: { era: () => 0, keepRestUntil: async () => {} },
    state: { keep: async () => {} }, // Today keeps the state it read, for the reminders (K-518)
    opens: { previous: async () => null }, // Today counts its open (K-521)
  }),
}));

const APP = path.resolve(__dirname, '../app');
const THIS_YEAR = new Date().getFullYear();
/** The year the wheel starts on (about_wheel_start). */
const SUGGESTED_YEAR = THIS_YEAR - onboardingParams.wheelStart.age_years;

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
  mockReport.mockClear();
  mockProfile.refresh.mockReset().mockResolvedValue(undefined);
  mockKeepOnPhone.mockClear();
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

const wheel = (label: string) => screen.getByRole('adjustable', { name: label });

/** A wheel stepped as VoiceOver steps it: a swipe up or down per step. */
async function turn(label: string, actionName: 'increment' | 'decrement', times = 1) {
  for (let i = 0; i < times; i++) {
    await fireEvent(wheel(label), 'accessibilityAction', { nativeEvent: { actionName } });
  }
  await settle();
}

const continueButton = () => screen.getByRole('button', { name: t('onboarding.continue') });

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
  step: 'experience' | 'program' | 'days' | 'consent' | 'about' | 'activity',
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
  if (allow) {
    await press(t('onboarding.healthData.allow'));
  } else {
    await press(t('onboarding.healthData.notNow'));
    eachStep();
    await press(t('onboarding.consent.continueWithout'));
  }
  eachStep();
  if (step === 'about') return router;
  await press(t('onboarding.about.male'));
  if (allow) await turn(t('onboarding.about.weight'), 'increment');
  await press(t('onboarding.continue'));
  eachStep();
  return router;
}

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

  test("the whole walk sends one profile, with the user's answers, and ends on activity", async () => {
    const router = await open();
    await choose(t('onboarding.goal.decide_for_me.title'));
    await choose(t('onboarding.experience.Y1_3'));
    await choose(t('onboarding.program.build_one_for_me.title'));
    await choose(t('onboarding.days.label', { count: 2 }));
    expect(router.getPathname()).toBe('/onboarding/health-data');
    await press(t('onboarding.healthData.notNow'));
    await press(t('onboarding.consent.continueWithout'));
    expect(router.getPathname()).toBe('/onboarding/about');
    await turn(t('onboarding.about.height'), 'increment', 2);
    await turn(t('onboarding.about.born'), 'decrement', 3);
    await press(t('onboarding.about.female'));
    await press(t('onboarding.continue'));
    expect(router.getPathname()).toBe('/onboarding/activity');
    expect(mockProfile.save).not.toHaveBeenCalled();
    await choose(t('onboarding.activity.LOW_ACTIVE'));
    expect(mockProfile.save).toHaveBeenCalledTimes(1);
    expect(mockProfile.save).toHaveBeenCalledWith({
      goal: 'DECIDE_FOR_ME',
      sex: 'FEMALE',
      heightCm: onboardingParams.wheelStart.height_cm + 2,
      birthYear: SUGGESTED_YEAR - 3,
      activityLevel: 'LOW_ACTIVE',
      experience: 'Y1_3',
      programChoice: 'BUILD_ONE_FOR_ME',
      schedule: {
        trainingDays: ['MONDAY', 'THURSDAY'],
        checkInDay: 'MONDAY',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      units: 'METRIC',
    });
    expect(router.getPathname()).toBe('/');
  });

  test('a save that does not go through says so, and the same answers go again', async () => {
    mockProfile.save.mockRejectedValueOnce(Object.assign(new Error('profile save: no answer'), { name: 'NoConnection' }));
    const router = await walkTo('activity');
    await choose(t('onboarding.activity.ACTIVE'));
    expect(screen.getByText(t('onboarding.saveFailed'))).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/onboarding/activity');
    await press(t('onboarding.tryAgain'));
    expect(mockProfile.save).toHaveBeenCalledTimes(2);
    expect(mockProfile.save.mock.calls[1][0]).toEqual(mockProfile.save.mock.calls[0][0]);
  });

  test('after a failed save, choosing again also tries again', async () => {
    mockProfile.save.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'NoConnection' }));
    await walkTo('activity');
    await choose(t('onboarding.activity.ACTIVE'));
    await choose(t('onboarding.activity.INACTIVE'));
    expect(mockProfile.save).toHaveBeenCalledTimes(2);
    expect(mockProfile.save).toHaveBeenLastCalledWith(expect.objectContaining({ activityLevel: 'INACTIVE' }));
  });

  test('a server that refuses (not the network) is not called a connection problem', async () => {
    mockProfile.save.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'ProfileSaveFailed' }));
    await walkTo('activity');
    await choose(t('onboarding.activity.ACTIVE'));
    expect(screen.getByText(t('onboarding.serverError'))).toBeOnTheScreen();
    expect(mockReport).toHaveBeenCalledWith({ name: 'ProfileSaveFailed' });
  });

  test('once the profile is saved, the tabs open, and there is no way back into onboarding', async () => {
    const router = await walkTo('activity');
    await choose(t('onboarding.activity.ACTIVE'));
    expect(router.getPathname()).toBe('/');
    expect(screen.getByRole('header', { name: t('screens.today.title') })).toBeOnTheScreen();
    expect(appRouter.canGoBack()).toBe(false);
  });

  test('a second tap while saving sends nothing more, and the way back is off', async () => {
    let finish = () => {};
    mockProfile.save.mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));
    await walkTo('activity');
    const option = screen.getByRole('radio', { name: t('onboarding.activity.ACTIVE') });
    // Two taps in the same moment while the save is on its way. Awaiting a press whose save never ends hangs React's
    // act(), so both go into one act unawaited; React notes the overlap, which is the point here, so the note is muted.
    const overlapNote = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await act(async () => {
        void fireEvent.press(option);
        void fireEvent.press(option);
      });
    } finally {
      overlapNote.mockRestore();
    }
    expect(mockProfile.save).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: t('onboarding.back') })).toBeDisabled();
    // While it saves, it says so, and the answers are off (review #463).
    expect(screen.getByText(t('onboarding.saving'))).toBeOnTheScreen();
    for (const answer of screen.getAllByRole('radio')) expect(answer).toBeDisabled();
    await act(async () => finish());
  });

  test('imperial all the way: feet and inches go out as centimetres, with the imperial choice', async () => {
    await walkTo('about');
    await press(t('onboarding.about.imperial'));
    await press(t('onboarding.about.male'));
    await press(t('onboarding.continue'));
    await choose(t('onboarding.activity.ACTIVE'));
    expect(mockProfile.save).toHaveBeenCalledWith(
      expect.objectContaining({ heightCm: onboardingParams.wheelStart.height_cm, units: 'IMPERIAL' }),
    );
  });

  test('going back keeps the answers: height, year, sex, the days', async () => {
    await walkTo('about');
    await turn(t('onboarding.about.height'), 'decrement', 4);
    await press(t('onboarding.about.male'));
    await press(t('onboarding.continue'));
    await press(t('onboarding.back'));
    expect(wheel(t('onboarding.about.height')).props.accessibilityValue).toEqual({
      text: `${onboardingParams.wheelStart.height_cm - 4} ${t('units.cmUnit')}`,
    });
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
    await walkTo('activity', { eachStep: clean });
    clean();
  });

  test('the first step offers a way out: signing out (a different Apple ID)', async () => {
    await open();
    await press(t('onboarding.signOut'));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});

describe('steps off the walk (ADR-069 #3, ADR-072 #8)', () => {
  test.each(['/onboarding/foods', '/onboarding/photos', '/onboarding/expectations', '/onboarding/apple-health'])(
    'nothing leads to %s, a link neither: it lands on the first question',
    async (url) => {
      const router = await open(url);
      expect(router.getPathname()).toBe('/onboarding');
      expect(screen.getByRole('header', { name: t('onboarding.goal.title') })).toBeOnTheScreen();
    },
  );
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

  test('bringing a program opens its branch: the program is brought in in place of the days (K-968)', async () => {
    const router = await walkTo('program');
    await choose(t('onboarding.program.bring_my_own.title'));
    expect(router.getPathname()).toBe('/onboarding/own-program');
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
    const router = await walkTo('activity', { days: 4 });
    expect(router.getPathname()).toBe('/onboarding/activity');
    await choose(t('onboarding.activity.ACTIVE'));
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
  ] as const)('%s: the steps of its walk (flow.ts), this one filled', async (_, experience, program) => {
    await walkTo('days', { experience, program });
    expect(indicator(4, 7)).toBeOnTheScreen();
  });

  test('an own program: bringing it in is the fourth of seven steps, in place of the days (K-968)', async () => {
    await walkTo('program', { experience: 'UNDER_1Y' });
    await choose(t('onboarding.program.bring_my_own.title'));
    expect(indicator(4, 7)).toBeOnTheScreen();
  });

  test('on the first question: step 1', async () => {
    await open();
    expect(indicator(1, walk({ experience: null, programChoice: null }).length)).toBeOnTheScreen();
  });

  test('the health consent no longer changes the walk: the foods to avoid moved to Settings (ADR-072 #8)', async () => {
    await walkTo('about');
    expect(indicator(6, 7)).toBeOnTheScreen();
    await press(t('onboarding.back'));
    await press(t('onboarding.healthData.allow'));
    expect(indicator(6, 7)).toBeOnTheScreen();
  });
});

describe('#ob-consent: the health data consent (K-312, ADR-007, GDPR Art. 9)', () => {
  test('what it covers in three lines; the full text, whose version is recorded, one tap away', async () => {
    await walkTo('consent');
    expect(screen.getByRole('header', { name: t('onboarding.consent.title') })).toBeOnTheScreen();
    expect(screen.getByText(t('onboarding.consent.why'))).toBeOnTheScreen();
    for (const line of ['kept', 'sold', 'deleted']) expect(screen.getByText(t(`onboarding.consent.${line}`))).toBeOnTheScreen();
    expect(screen.queryByText(t('consent.health_data.body'))).toBeNull();
    await press(t('onboarding.consent.fullText'));
    expect(screen.getByText(t('consent.health_data.body'))).toBeOnTheScreen();
  });

  test('"Allow" records the version of that text, then moves on', async () => {
    const router = await walkTo('consent');
    await press(t('onboarding.healthData.allow'));
    expect(mockApi.PUT).toHaveBeenCalledWith('/v1/consents/{kind}', {
      params: { path: { kind: 'HEALTH_DATA' } },
      body: { textVersion: t('consent.health_data.version') },
    });
    expect(mockConsents.remember).toHaveBeenCalledWith('HEALTH_DATA', 'GRANTED');
    expect(router.getPathname()).toBe('/onboarding/about');
  });

  test('"Not now": nothing recorded; it says what that means, and the way on is "Continue without"', async () => {
    const router = await walkTo('consent');
    await press(t('onboarding.healthData.notNow'));
    expect(router.getPathname()).toBe('/onboarding/health-data');
    expect(screen.getByText(t('onboarding.healthData.declinedNote'))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('onboarding.healthData.allow') })).toBeOnTheScreen();
    await press(t('onboarding.consent.continueWithout'));
    expect(router.getPathname()).toBe('/onboarding/about');
    expect(mockApi.PUT).not.toHaveBeenCalled();
    expect(screen.queryByRole('adjustable', { name: t('onboarding.about.weight') })).toBeNull();
  });

  test('declined all the way: no health record is sent', async () => {
    await walkTo('activity');
    await choose(t('onboarding.activity.ACTIVE'));
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

  test('allowed: the weight is asked, and goes as the first weigh-in after the profile; no waist, no foods', async () => {
    const order: string[] = [];
    mockQueue.record.mockImplementation(async (record) => (order.push((record as { kind: string }).kind), true));
    mockProfile.save.mockImplementation(async () => {
      order.push('profile');
      mockBecome('done');
    });
    await walkTo('activity', { allow: true });
    await choose(t('onboarding.activity.ACTIVE'));
    expect(order).toEqual(['profile', 'weighIn']);
    expect(mockQueue.record).toHaveBeenCalledWith({
      kind: 'weighIn',
      body: expect.objectContaining({
        kg: onboardingParams.wheelStart.weight_kg + onboardingParams.weightWheel.step_kg,
        source: 'MANUAL',
        clientId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      }),
    });
  });

  test('allowed, the weight counts only once its wheel is moved: the suggestion is never sent as a weigh-in', async () => {
    await walkTo('about', { allow: true });
    await press(t('onboarding.about.male'));
    expect(continueButton()).toBeDisabled();
    // VoiceOver hears why: the weight is not set yet, and how to set it (review #463).
    expect(wheel(t('onboarding.about.weight')).props.accessibilityValue.text).toBe(
      t('onboarding.wheel.unset', { value: `${onboardingParams.wheelStart.weight_kg}.0 ${t('units.kgUnit')}` }),
    );
    expect(wheel(t('onboarding.about.weight')).props.accessibilityHint).toBe(t('onboarding.wheel.unsetHint'));
    await turn(t('onboarding.about.weight'), 'decrement');
    expect(continueButton()).toBeEnabled();
    expect(wheel(t('onboarding.about.weight')).props.accessibilityHint).toBeUndefined();
  });

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

  test('allowed, the consent can be taken back here: withdrawn on the server, the weight cleared, not asked again', async () => {
    const router = await walkTo('about', { allow: true });
    await press(t('onboarding.about.male'));
    await turn(t('onboarding.about.weight'), 'increment');
    await press(t('onboarding.back'));
    expect(router.getPathname()).toBe('/onboarding/health-data');
    await press(t('onboarding.healthData.withdraw'));
    // K-231: the one path that confirms the deletion on the server and forgets the phone's health entries.
    expect(mockWithdrawHealthData).toHaveBeenCalledTimes(1);
    expect(router.getPathname()).toBe('/onboarding/about');
    expect(screen.queryByRole('adjustable', { name: t('onboarding.about.weight') })).toBeNull();
    await press(t('onboarding.back'));
    await press(t('onboarding.healthData.allow'));
    expect(continueButton()).toBeDisabled(); // the weight went with the consent: set again before going on
  });

  test('declined, then back and allowed: the weight is asked', async () => {
    await walkTo('about');
    expect(screen.queryByRole('adjustable', { name: t('onboarding.about.weight') })).toBeNull();
    await press(t('onboarding.back'));
    await press(t('onboarding.healthData.allow'));
    expect(wheel(t('onboarding.about.weight'))).toBeOnTheScreen();
  });

  test('changing the units after setting a weight clears it: 84.5 kg must not become 84.5 lb', async () => {
    await walkTo('about', { allow: true });
    await press(t('onboarding.about.male'));
    await turn(t('onboarding.about.weight'), 'increment');
    expect(continueButton()).toBeEnabled();
    await press(t('onboarding.about.imperial'));
    expect(continueButton()).toBeDisabled();
  });

  test('imperial weight all the way: 180 lb goes as 81.65 kg', async () => {
    await walkTo('about', { allow: true });
    await press(t('onboarding.about.imperial'));
    const start = Number(String(wheel(t('onboarding.about.weight')).props.accessibilityValue.text).split(' ')[0]);
    await turn(t('onboarding.about.weight'), start > 180 ? 'decrement' : 'increment', Math.abs(start - 180));
    await press(t('onboarding.about.male'));
    await press(t('onboarding.continue'));
    await choose(t('onboarding.activity.ACTIVE'));
    expect(mockQueue.record).toHaveBeenCalledWith(expect.objectContaining({ kind: 'weighIn', body: expect.objectContaining({ kg: 81.65 }) }));
    expect(mockQueue.record).toHaveBeenCalledTimes(1); // no waist: not asked any more (ADR-072 #2)
    expect(mockProfile.save).toHaveBeenCalledWith(expect.objectContaining({ units: 'IMPERIAL' }));
  });

  test('allowed, no step shows a missing text key or an unfilled placeholder either', async () => {
    const clean = () => {
      expect(screen.queryByText(/\[missing:/)).toBeNull();
      expect(screen.queryByText(/\{\w+\}/)).toBeNull();
    };
    await walkTo('activity', { eachStep: clean, allow: true });
    clean();
  });
});

describe('#ob-about (ADR-072 #2)', () => {
  test('height and year on wheels, starting on the suggestion; sex in two options, for the energy math', async () => {
    await walkTo('about');
    expect(screen.getByText(t('onboarding.about.why'))).toBeOnTheScreen();
    expect(wheel(t('onboarding.about.height')).props.accessibilityValue).toEqual({
      text: `${onboardingParams.wheelStart.height_cm} ${t('units.cmUnit')}`,
    });
    expect(wheel(t('onboarding.about.born')).props.accessibilityValue).toEqual({ text: `${SUGGESTED_YEAR} ${t('onboarding.about.year')}` });
    expect(screen.getByText(t('onboarding.about.sex'))).toBeOnTheScreen();
    expect(continueButton()).toBeDisabled(); // the sex is not suggested
    await press(t('onboarding.about.female'));
    expect(continueButton()).toBeEnabled();
  });

  test('a year under 18 cannot be chosen: the wheel ends on the youngest adult year (ADR-027 #13)', async () => {
    await walkTo('about');
    await turn(t('onboarding.about.born'), 'increment', onboardingParams.wheelStart.age_years);
    expect(wheel(t('onboarding.about.born')).props.accessibilityValue).toEqual({
      text: `${THIS_YEAR - onboardingParams.adultMinYearGap} ${t('onboarding.about.year')}`,
    });
  });

  test('imperial users get feet and inches; the choice of units is made here too (K-310)', async () => {
    await walkTo('about');
    await press(t('onboarding.about.imperial'));
    expect(mockKeepOnPhone).toHaveBeenCalledWith('IMPERIAL'); // no profile yet: no network needed
    expect(wheel(t('onboarding.about.height')).props.accessibilityValue.text).toMatch(new RegExp(t('units.ftUnit')));
  });
});

describe('#ob-activity: the four NASEM levels, each a day to recognise (ADR-027 #6)', () => {
  test('four answers in a few words; the whole day, training included', async () => {
    await walkTo('activity');
    expect(screen.getByText(t('onboarding.activity.why'))).toBeOnTheScreen();
    expect(screen.getAllByRole('radio').map((option) => option.props.accessibilityLabel)).toEqual(
      ['INACTIVE', 'LOW_ACTIVE', 'ACTIVE', 'VERY_ACTIVE'].map((level) => t(`onboarding.activity.${level}`)),
    );
  });
});
