/**
 * Onboarding (K-306, ADR-072): who sees it, and the walk through it. Routes are rendered from the real src/app folder;
 * the services are faked — the answers that route (signed in, onboarding state) and the profile save. The route's
 * branches themselves are onboarding-route.test.ts; the screens taken off the walk, onboarding-retired.test.tsx.
 */
import * as path from 'path';

import { router as appRouter } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { t } from '@/copy';
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
// The profile is stored when the plan is prepared, and onboarding is done once the plan is seen (K-967).
const mockProfile = {
  store: jest.fn(async (profile: unknown) => profile),
  finish: jest.fn(async () => {}),
  refresh: jest.fn(async () => {}),
  // The profile the server holds when onboarding resumes after a restart (K-967); none on a fresh walk.
  resumed: jest.fn((): unknown => null),
};
const mockSignOut = jest.fn(async () => {});
// The server's answer to a consent PUT; `mockConsentStatus` 200 records it.
let mockConsentStatus = 200;
const mockConsentAnswer = async (_path: string, _init: unknown) =>
  mockConsentStatus === 200
    ? { data: { status: 'GRANTED' }, response: new Response(null, { status: 200 }) }
    : { error: { code: 'X' }, response: new Response(null, { status: mockConsentStatus }) };
const mockOk = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) });
type MockMove = { exerciseId: string; baseSets: number; sets: number; reps: { min: number; max: number }; targetRir: number; nextLoadKg?: number };
const mockMove = (exerciseId: string): MockMove => ({ exerciseId, baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 2 });
/** Like the server: a program on the days asked for, each day the same three moves, with the engine's cardio. */
function mockProgram(trainingDays: string[], loads: Record<string, number> = {}) {
  return {
    id: 'a1b2c3d4-0000-4000-8000-00000000000a',
    source: 'GENERATED',
    days: trainingDays.map((weekday, i) => ({
      id: `a1b2c3d4-0000-4000-8000-00000000001${i}`,
      nameKey: 'full_body_a',
      weekday,
      exercises: ['squat', 'bench_press', 'lat_pulldown'].map((id) => ({
        ...mockMove(id),
        ...(loads[id] === undefined ? {} : { nextLoadKg: loads[id] }),
      })),
    })),
    cardio: { source: 'GENERATED', minutes: 30, sessionsPerWeek: trainingDays.length, doneThisWeek: 0, afterLiftOverLine: false,
      sessions: trainingDays.map((weekday) => ({ weekday, place: 'AFTER_LIFT' })) },
  };
}
let mockTrainingDays: string[] = [];
const mockCatalog = [
  { id: 'squat', nameKey: 'exercises.squat.name', kind: 'COMPOUND', muscles: [], alternatives: [], load: 'EXTERNAL', equipment: 'BARBELL', unilateral: false, setupFields: [] },
  { id: 'lat_pulldown', nameKey: 'exercises.lat_pulldown.name', kind: 'COMPOUND', muscles: [], alternatives: [], load: 'EXTERNAL', equipment: 'CABLE', unilateral: false, setupFields: [] },
];
/** A consent PUT, or the starting weights: the program with each weight as its move's first target. */
const mockPut = async (path: string, init: unknown) => {
  if (path !== '/v1/program/starting-weights') return mockConsentAnswer(path, init);
  const { weights } = (init as { body: { weights: { exerciseId: string; kg: number }[] } }).body;
  return mockOk(mockProgram(mockTrainingDays, Object.fromEntries(weights.map((w) => [w.exerciseId, w.kg]))));
};
const mockGenerate = async (_path: string, init: unknown) => {
  mockTrainingDays = (init as { body: { trainingDays: string[] } }).body.trainingDays;
  return mockOk(mockProgram(mockTrainingDays));
};
const mockApi = {
  PUT: jest.fn(mockPut),
  DELETE: jest.fn(mockConsentAnswer),
  POST: jest.fn(mockGenerate),
  // The catalog; the tabs' reads find no connection (Today shows what it can).
  GET: jest.fn(async (path: string) => {
    if (path === '/v1/exercises') return mockOk(mockCatalog);
    // The user's own moves: none here (a move the catalog does not name is looked for there first).
    if (path === '/v1/custom-exercises') return mockOk([]);
    // The program the server holds: none until one is built (a resumed onboarding may find one).
    // Where the calories start (K-989): the server's answer, or a status meaning none (404 here by default: no weigh-in).
    if (path === '/v1/targets/starting') {
      return typeof mockStarting === 'number' ? { error: { code: 'X' }, response: new Response(null, { status: mockStarting }) } : mockOk(mockStarting);
    }
    if (path === '/v1/program') {
      return mockServerProgram === null ? { error: { code: 'NOT_FOUND' }, response: new Response(null, { status: 404 }) } : mockOk(mockServerProgram);
    }
    throw new TypeError('Network request failed');
  }),
};
let mockReminderSettings = { enabled: false, cue: '' };
const mockReminderListeners = new Set<() => void>();
const mockTurnOn = jest.fn(async () => {
  mockReminderSettings = { enabled: true, cue: '' };
  mockReminderListeners.forEach((listener) => listener());
  return { granted: true, canAskAgain: false };
});
const mockTurnOff = jest.fn(async () => {
  mockReminderSettings = { enabled: false, cue: '' };
  mockReminderListeners.forEach((listener) => listener());
});
const mockQueue = { record: jest.fn(async (_record: unknown) => true), drain: jest.fn(async () => {}) };
let mockServerProgram: unknown = null;
let mockStarting: unknown = 404;
// What the phone knows of the health data consent (a resumed onboarding reads it; the walk has its own answer).
let mockConsentGranted = false;
const mockConsents = { remember: jest.fn(async (_kind: string, _status: string) => {}), granted: jest.fn(async () => mockConsentGranted) };
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
    // Today hands on the program's week off (ADR-037 › 51b); the plan offers them on Monday morning (K-967).
    reminders: {
      era: () => 0,
      keepRestUntil: async () => {},
      current: () => mockReminderSettings,
      subscribe: (listener: () => void) => (mockReminderListeners.add(listener), () => mockReminderListeners.delete(listener)),
      turnOn: mockTurnOn,
      turnOff: mockTurnOff,
    },
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
  // Like the real service: a store hands back the profile; the plan's Continue marks onboarding done.
  mockProfile.store.mockReset().mockImplementation(async (profile) => profile);
  mockProfile.finish.mockReset().mockImplementation(async () => mockBecome('done'));
  mockSignOut.mockClear();
  mockConsentStatus = 200;
  mockApi.PUT.mockReset().mockImplementation(mockPut);
  mockApi.DELETE.mockReset().mockImplementation(mockConsentAnswer);
  mockApi.POST.mockReset().mockImplementation(mockGenerate);
  mockApi.GET.mockClear();
  mockTrainingDays = [];
  mockServerProgram = null;
  mockStarting = 404;
  mockConsentGranted = false;
  mockProfile.resumed.mockReset().mockReturnValue(null);
  mockReminderSettings = { enabled: false, cue: '' };
  mockTurnOn.mockClear();
  mockTurnOff.mockClear();
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

/**
 * From activity: the last answers — the activity, and the starting weights left unset where the walk asks them — and on
 * to the plan being prepared, where the profile is stored (K-967).
 */
async function endWalk(level: 'INACTIVE' | 'LOW_ACTIVE' | 'ACTIVE' | 'VERY_ACTIVE' = 'ACTIVE') {
  await choose(t(`onboarding.activity.${level}`));
  if (screen.queryByRole('header', { name: t('onboarding.weights.title') }) !== null) await press(t('onboarding.weights.skip'));
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

  test("the whole walk sends one profile, with the user's answers, once the last question is answered (K-967)", async () => {
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
    await choose(t('onboarding.activity.LOW_ACTIVE'));
    // An own program: the starting weights are the last question.
    expect(router.getPathname()).toBe('/onboarding/weights');
    expect(mockProfile.store).not.toHaveBeenCalled();
    await press(t('onboarding.weights.skip'));
    expect(router.getPathname()).toBe('/onboarding/preparing');
    expect(mockProfile.store).toHaveBeenCalledTimes(1);
    expect(mockProfile.store).toHaveBeenCalledWith({
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
  });

  test('a save that does not go through says so, and the same answers go again', async () => {
    mockProfile.store.mockRejectedValueOnce(Object.assign(new Error('profile save: no answer'), { name: 'NoConnection' }));
    const router = await walkTo('activity');
    await endWalk();
    expect(screen.getByText(t('onboarding.saveFailed'))).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/onboarding/preparing');
    await press(t('onboarding.tryAgain'));
    expect(mockProfile.store).toHaveBeenCalledTimes(2);
    expect(mockProfile.store.mock.calls[1][0]).toEqual(mockProfile.store.mock.calls[0][0]);
  });

  test('a save that fails again can be tried again again: a failure never leaves the user stuck', async () => {
    mockProfile.store
      .mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'NoConnection' }))
      .mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'NoConnection' }));
    await walkTo('activity');
    await endWalk();
    await press(t('onboarding.tryAgain'));
    expect(screen.getByText(t('onboarding.saveFailed'))).toBeOnTheScreen();
    await press(t('onboarding.tryAgain'));
    expect(mockProfile.store).toHaveBeenCalledTimes(3);
    expect(screen.getByRole('button', { name: t('onboarding.preparing.see') })).toBeEnabled();
  });

  test('a server that refuses (not the network) is not called a connection problem', async () => {
    mockProfile.store.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'ProfileSaveFailed' }));
    await walkTo('activity');
    await endWalk();
    expect(screen.getByText(t('onboarding.serverError'))).toBeOnTheScreen();
    expect(mockReport).toHaveBeenCalledWith({ name: 'ProfileSaveFailed' });
  });

  test('once the plan is seen, Continue opens the tabs, and there is no way back into onboarding', async () => {
    const router = await walkTo('activity');
    await endWalk();
    expect(mockProfile.finish).not.toHaveBeenCalled();
    await press(t('onboarding.preparing.see'));
    await press(t('onboarding.continue'));
    expect(mockProfile.finish).toHaveBeenCalledTimes(1);
    expect(router.getPathname()).toBe('/');
    expect(screen.getByRole('header', { name: t('screens.today.title') })).toBeOnTheScreen();
    expect(appRouter.canGoBack()).toBe(false);
  });

  test('while the answers are saved, nothing is sent twice and the plan cannot be opened yet', async () => {
    let finish = (_: unknown) => {};
    mockProfile.store.mockImplementation((profile) => new Promise((resolve) => (finish = () => resolve(profile))));
    await walkTo('activity');
    await endWalk();
    expect(mockProfile.store).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: t('onboarding.preparing.see') })).toBeDisabled();
    await act(async () => finish(undefined));
    await settle();
    expect(mockProfile.store).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: t('onboarding.preparing.see') })).toBeEnabled();
  });

  test('imperial all the way: feet and inches go out as centimetres, with the imperial choice', async () => {
    await walkTo('about');
    await press(t('onboarding.about.imperial'));
    await press(t('onboarding.about.male'));
    await press(t('onboarding.continue'));
    await endWalk();
    expect(mockProfile.store).toHaveBeenCalledWith(
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
    await endWalk();
    const sent = mockProfile.store.mock.calls[0][0] as { schedule: Record<string, unknown> };
    expect(sent.schedule.trainingDays).toEqual(defaultTrainingDays(4));
    expect(sent.schedule).not.toHaveProperty('sessionsLastMonth');
    expect(sent.schedule).not.toHaveProperty('usualTrainingTime');
  });
});

describe('the step indicator follows the branch', () => {
  const indicator = (step: number, total: number) => screen.getByLabelText(t('onboarding.progress', { step, total }));

  // The totals written out, not worked out from flow.ts (K-966 review): the indicator is checked against the walk the
  // product decided (ADR-072 #2), so a walk that changed by mistake fails here.
  test.each([
    ['a new lifter', 'NEW', 'build_one_for_me', 7],
    ['an experienced lifter', 'Y3_PLUS', 'build_one_for_me', 8],
  ] as const)('%s: step 4 of %s', async (_, experience, program, total) => {
    await walkTo('days', { experience, program });
    expect(indicator(4, total)).toBeOnTheScreen();
  });

  test('an own program: bringing it in is the fourth of nine steps, then its review, in place of the days (K-968), the weights last', async () => {
    await walkTo('program', { experience: 'UNDER_1Y' });
    await choose(t('onboarding.program.bring_my_own.title'));
    expect(indicator(4, 9)).toBeOnTheScreen();
  });

  test('the starting weights are the last step: 8 of 8', async () => {
    await walkTo('activity', { experience: 'Y3_PLUS' });
    await choose(t('onboarding.activity.ACTIVE'));
    expect(indicator(8, 8)).toBeOnTheScreen();
  });

  test('on the first question: step 1 of the shortest walk (no answers yet: the new lifter)', async () => {
    await open();
    expect(indicator(1, 7)).toBeOnTheScreen();
  });

  test('the health consent no longer changes the walk: the foods to avoid moved to Settings (ADR-072 #8)', async () => {
    await walkTo('about');
    expect(indicator(6, 8)).toBeOnTheScreen();
    await press(t('onboarding.back'));
    await press(t('onboarding.healthData.allow'));
    expect(indicator(6, 8)).toBeOnTheScreen();
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
    await endWalk();
    expect(mockQueue.record).not.toHaveBeenCalled();
    expect(mockProfile.store).toHaveBeenCalledWith(expect.not.objectContaining({ food: expect.anything() }));
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
    mockProfile.store.mockImplementation(async (profile) => {
      order.push('profile');
      return profile;
    });
    await walkTo('activity', { allow: true });
    await endWalk();
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
    await endWalk();
    expect(mockQueue.record).toHaveBeenCalledWith(expect.objectContaining({ kind: 'weighIn', body: expect.objectContaining({ kg: 81.65 }) }));
    expect(mockQueue.record).toHaveBeenCalledTimes(1); // no waist: not asked any more (ADR-072 #2)
    expect(mockProfile.store).toHaveBeenCalledWith(expect.objectContaining({ units: 'IMPERIAL' }));
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

const startingWeightsSent = () => mockApi.PUT.mock.calls.filter(([path]) => path === '/v1/program/starting-weights');
const KG = (value: number) => t('units.kg', { value });
const S = onboardingParams.startingWeightStepper;

describe('#ob-weights: the starting weights (ADR-072 #3, #5)', () => {
  const name = (move: string) => t(`exercises.${move}.name`);

  test('never for a new lifter: from activity straight to the plan being prepared, no weights sent', async () => {
    const router = await walkTo('activity', { experience: 'NEW' });
    await choose(t('onboarding.activity.ACTIVE'));
    expect(router.getPathname()).toBe('/onboarding/preparing');
    expect(startingWeightsSent()).toEqual([]);
  });

  test('three moves, each unset at first: "more" sets an empty bar, then a pair of plates; "less" steps back', async () => {
    await walkTo('activity', { experience: 'Y3_PLUS' });
    await choose(t('onboarding.activity.ACTIVE'));
    expect(screen.getByRole('header', { name: t('onboarding.weights.title') })).toBeOnTheScreen();
    expect(screen.getByText(t('onboarding.weights.why', { reps: onboardingParams.startingWeightReps }))).toBeOnTheScreen();
    for (const move of onboardingParams.startingWeightMoves) {
      expect(screen.getByLabelText(`${name(move)}, ${t('onboarding.weights.unset')}`)).toBeOnTheScreen();
      // Nothing to take off an unset weight.
      expect(screen.getByRole('button', { name: t('onboarding.weights.less', { move: name(move) }) })).toBeDisabled();
    }
    const squat = name('squat');
    await press(t('onboarding.weights.more', { move: squat }));
    expect(screen.getByLabelText(`${squat}, ${KG(S.start_kg)}`)).toBeOnTheScreen();
    await press(t('onboarding.weights.more', { move: squat }));
    expect(screen.getByLabelText(`${squat}, ${KG(S.start_kg + S.step_kg)}`)).toBeOnTheScreen();
    await press(t('onboarding.weights.less', { move: squat }));
    expect(screen.getByLabelText(`${squat}, ${KG(S.start_kg)}`)).toBeOnTheScreen();
    // Down from the bar: unset again, skipped (K-967 review).
    await press(t('onboarding.weights.less', { move: squat }));
    expect(screen.getByLabelText(`${squat}, ${t('onboarding.weights.unset')}`)).toBeOnTheScreen();
    expect(continueButton()).toBeDisabled();
  });

  test('Continue sends weights, so it waits for one; with none, "Skip" is the way on', async () => {
    await walkTo('activity', { experience: 'Y1_3' });
    await choose(t('onboarding.activity.ACTIVE'));
    expect(continueButton()).toBeDisabled();
    expect(screen.getByRole('button', { name: t('onboarding.weights.skip') })).toBeEnabled();
    await press(t('onboarding.weights.more', { move: name('bench_press') }));
    expect(continueButton()).toBeEnabled();
  });

  test('each weight set becomes its move\'s first target, sent once the program is built; one left unset is skipped', async () => {
    await walkTo('activity', { experience: 'Y3_PLUS' });
    await choose(t('onboarding.activity.ACTIVE'));
    await press(t('onboarding.weights.more', { move: name('squat') }));
    await press(t('onboarding.weights.more', { move: name('squat') }));
    await press(t('onboarding.weights.more', { move: name('bench_press') }));
    await press(t('onboarding.continue'));
    expect(mockApi.POST.mock.invocationCallOrder[0]).toBeLessThan(mockApi.PUT.mock.invocationCallOrder.at(-1)!);
    expect(startingWeightsSent()).toEqual([
      ['/v1/program/starting-weights', { body: { weights: [
        { exerciseId: 'squat', kg: S.start_kg + S.step_kg },
        { exerciseId: 'bench_press', kg: S.start_kg },
      ] } }],
    ]);
  });

  test('"Skip" goes on with none: no weight is sent, even one set before', async () => {
    const router = await walkTo('activity', { experience: 'UNDER_1Y' });
    await choose(t('onboarding.activity.ACTIVE'));
    await press(t('onboarding.weights.more', { move: name('squat') }));
    await press(t('onboarding.weights.skip'));
    expect(router.getPathname()).toBe('/onboarding/preparing');
    expect(startingWeightsSent()).toEqual([]);
  });
});

describe('#ob-preparing: each line ticked by the server, never a timer (ADR-072 #6)', () => {
  // Without the health data consent there are no calls: the third line is the first workout (K-967 review).
  const lines = (third = t('onboarding.preparing.firstWorkout')) => [t('onboarding.preparing.program', { count: 3 }), t('onboarding.preparing.cardio'), third];
  const ticked = (line: string) => screen.queryByLabelText(t('onboarding.preparing.done', { line })) !== null;

  test('until the program is built nothing is ticked and the plan cannot open; then the three lines, and "See my plan"', async () => {
    let build = () => {};
    mockApi.POST.mockImplementation((path, init) => new Promise((resolve) => (build = () => resolve(mockGenerate(path, init)))));
    await walkTo('activity', { experience: 'NEW' });
    await endWalk();
    await settle();
    expect(lines().map(ticked)).toEqual([false, false, false]);
    expect(screen.getByRole('button', { name: t('onboarding.preparing.see') })).toBeDisabled();
    await act(async () => build());
    await settle();
    expect(lines().map(ticked)).toEqual([true, true, true]);
    expect(screen.getByRole('button', { name: t('onboarding.preparing.see') })).toBeEnabled();
  });

  test('the food is on the second line only when the plan will show its row', async () => {
    mockStarting = { targetKcal: 2450, maintenanceKcal: { low: 2600, high: 3000 }, observationDays: 14 };
    await walkTo('activity', { experience: 'NEW', allow: true });
    await endWalk();
    expect(ticked(t('onboarding.preparing.foodAndCardio'))).toBe(true);
    expect(screen.queryByText(t('onboarding.preparing.cardio'))).toBeNull();
  });

  test('with the health data consent, the third line is the first call', async () => {
    await walkTo('activity', { experience: 'NEW', allow: true });
    await endWalk();
    expect(lines(t('onboarding.preparing.firstCall', { day: t('onboarding.schedule.dayName.MONDAY') })).map(ticked)).toEqual([true, true, true]);
    expect(screen.queryByText(t('onboarding.preparing.firstWorkout'))).toBeNull();
  });

  test('a program that could not be built is tried again from there: the answers are not saved twice', async () => {
    mockApi.POST.mockRejectedValueOnce(new TypeError('Network request failed'));
    await walkTo('activity', { experience: 'NEW' });
    await endWalk();
    expect(screen.getByText(t('onboarding.saveFailed'))).toBeOnTheScreen();
    expect(mockReport).toHaveBeenCalledWith({ name: 'NoConnection' });
    await press(t('onboarding.tryAgain'));
    expect(mockProfile.store).toHaveBeenCalledTimes(1);
    expect(mockApi.POST).toHaveBeenCalledTimes(2);
    expect(lines().map(ticked)).toEqual([true, true, true]);
  });

  test('a failure that keeps coming is not a dead end: signing out is offered beside "Try again"', async () => {
    mockApi.POST.mockRejectedValue(new TypeError('Network request failed'));
    await walkTo('activity', { experience: 'NEW' });
    await endWalk();
    await press(t('onboarding.tryAgain'));
    expect(screen.getByText(t('onboarding.saveFailed'))).toBeOnTheScreen();
    await press(t('onboarding.signOut'));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  test('while it works, no way out is offered (the answers are being saved)', async () => {
    let build = () => {};
    mockApi.POST.mockImplementation((path, init) => new Promise((resolve) => (build = () => resolve(mockGenerate(path, init)))));
    await walkTo('activity', { experience: 'NEW' });
    await endWalk();
    expect(screen.queryByRole('button', { name: t('onboarding.signOut') })).toBeNull();
    await act(async () => build());
  });

  test.each(['/onboarding/preparing', '/onboarding/plan'])('a link to %s before the walk is answered lands on its start; nothing is sent', async (url) => {
    const router = await open(url);
    expect(router.getPathname()).toBe('/onboarding');
    expect(mockProfile.store).not.toHaveBeenCalled();
    expect(mockApi.POST).not.toHaveBeenCalled();
  });
});

describe('closed with the plan still to be seen: it comes back (K-967 review)', () => {
  const RESUMED_PROFILE = {
    goal: 'BUILD_MUSCLE',
    sex: 'MALE',
    heightCm: 180,
    birthYear: 1990,
    activityLevel: 'ACTIVE',
    experience: 'Y1_3',
    programChoice: 'BUILD_ONE_FOR_ME',
    schedule: { trainingDays: ['MONDAY', 'WEDNESDAY', 'FRIDAY'], checkInDay: 'MONDAY', timeZone: 'Europe/Istanbul' },
    units: 'METRIC',
  };
  beforeEach(() => {
    mockOnboarding = 'resume';
    mockProfile.resumed.mockReturnValue(RESUMED_PROFILE);
  });

  test('(c) the app opened again: the plan is prepared on the saved profile and shown, nothing asked again', async () => {
    mockServerProgram = mockProgram(['MONDAY', 'WEDNESDAY', 'FRIDAY'], { squat: 100 });
    const router = await open('/');
    expect(router.getPathname()).toBe('/onboarding/preparing');
    expect(mockProfile.store).not.toHaveBeenCalled();
    await press(t('onboarding.preparing.see'));
    expect(router.getPathname()).toBe('/onboarding/plan');
    expect(screen.getByText(t('onboarding.plan.goal', { goal: t('onboarding.plan.goalName.BUILD_MUSCLE') }))).toBeOnTheScreen();
    await press(t('onboarding.continue'));
    expect(mockProfile.finish).toHaveBeenCalledTimes(1);
    expect(router.getPathname()).toBe('/');
  });

  test('(b) closed after the program was built: not built again, its starting weights kept', async () => {
    mockServerProgram = mockProgram(['MONDAY', 'WEDNESDAY', 'FRIDAY'], { squat: 100 });
    await open('/');
    expect(mockApi.POST).not.toHaveBeenCalled();
    expect(startingWeightsSent()).toEqual([]);
    await press(t('onboarding.preparing.see'));
    expect(screen.getAllByText(KG(100)).length).toBeGreaterThan(0);
  });

  test('(a) closed before the program was built: built now, on the saved days', async () => {
    await open('/');
    expect(mockApi.POST).toHaveBeenCalledWith('/v1/program/generate', { body: { trainingDays: ['MONDAY', 'WEDNESDAY', 'FRIDAY'] } });
  });

  test('the consent, the walk\'s answer being gone, is what the phone knows: given, the first call is named', async () => {
    mockConsentGranted = true;
    await open('/');
    await press(t('onboarding.preparing.see'));
    expect(screen.getByText(t('onboarding.plan.firstCall'))).toBeOnTheScreen();
  });
});

describe('#ob-plan: the starting call in U3\'s parts (ADR-072 #6)', () => {
  // A Wednesday at noon, the phone's clock: the dates on the plan are known, whatever day the tests run (review).
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 9, 14, 12, 0) });
  });

  async function toPlan(walk: Walk = {}, weights: string[] = []) {
    const router = await walkTo('activity', walk);
    await choose(t('onboarding.activity.ACTIVE'));
    for (const move of weights) await press(t('onboarding.weights.more', { move: t(`exercises.${move}.name`) }));
    if (screen.queryByRole('header', { name: t('onboarding.weights.title') }) !== null) await press(t(weights.length > 0 ? 'onboarding.continue' : 'onboarding.weights.skip'));
    await press(t('onboarding.preparing.see'));
    expect(router.getPathname()).toBe('/onboarding/plan');
    return router;
  }

  test('the answers reflected: the goal, how many days, which days', async () => {
    await toPlan({ experience: 'NEW' });
    expect(screen.getByRole('header', { name: t('onboarding.plan.title') })).toBeOnTheScreen();
    expect(screen.getByText(t('onboarding.plan.goal', { goal: t('onboarding.plan.goalName.LOSE_FAT') }))).toBeOnTheScreen();
    expect(screen.getByText(t('onboarding.plan.days', { count: 3 }))).toBeOnTheScreen();
    expect(screen.getByText(['MONDAY', 'WEDNESDAY', 'FRIDAY'].map((day) => t(`onboarding.schedule.dayShort.${day}`)).join(', '))).toBeOnTheScreen();
  });

  test('the first workout: each move with its image, sets × range; no weights known, "Session 1 finds your weights"', async () => {
    await toPlan({ experience: 'NEW' });
    expect(screen.getByText(t('programDays.full_body_a.name'))).toBeOnTheScreen();
    expect(screen.getByText(t('onboarding.plan.findsWeights'))).toBeOnTheScreen();
    for (const move of ['squat', 'bench_press', 'lat_pulldown']) expect(screen.getByText(t(`exercises.${move}.name`))).toBeOnTheScreen();
    expect(screen.getAllByText(t('onboarding.plan.setsReps', { sets: 3, min: 6, max: 10 }))).toHaveLength(3);
    // The image is what the move is lifted with (the catalog's equipment); one the catalog does not name gets the bar.
    // Decorative, so hidden from VoiceOver: found among hidden elements.
    expect(screen.getAllByTestId('move-thumb-BARBELL', { includeHiddenElements: true })).toHaveLength(2);
    expect(screen.getAllByTestId('move-thumb-CABLE', { includeHiddenElements: true })).toHaveLength(1);
  });

  test('with a starting weight: the weight on its move, and no "Session 1 finds your weights"', async () => {
    await toPlan({ experience: 'Y3_PLUS' }, ['squat']);
    expect(screen.getByText(KG(S.start_kg))).toBeOnTheScreen();
    expect(screen.queryByText(t('onboarding.plan.findsWeights'))).toBeNull();
  });

  test('the cardio as the program sets it: a dose, after the weights (ADR-074)', async () => {
    await toPlan({ experience: 'NEW' });
    expect(screen.getByText(t('onboarding.plan.cardioDose', { sessions: 3, minutes: 30 }))).toBeOnTheScreen();
    expect(screen.getByText(t('onboarding.plan.cardioAfter'))).toBeOnTheScreen();
    expect(screen.queryByText(/kcal/)).toBeNull();
  });

  test('the first call and the days to it, with the health consent; without it there are no calls, so none is promised', async () => {
    await toPlan({ experience: 'NEW', allow: true });
    expect(screen.getByText(t('onboarding.plan.firstCall'))).toBeOnTheScreen();
    expect(screen.getByText('Mon, Oct 19')).toBeOnTheScreen();
    expect(screen.getByText(t('onboarding.plan.inDays', { count: 5 }))).toBeOnTheScreen();
    // The first workout is today's: Wednesday is a training day.
    expect(screen.getByText(t('onboarding.plan.firstWorkout', { day: t('onboarding.plan.today') }))).toBeOnTheScreen();
  });

  test('a finish that cannot be kept on the phone says so; Continue tries again', async () => {
    mockProfile.finish.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'KvFailed' }));
    const router = await toPlan({ experience: 'NEW' });
    await press(t('onboarding.continue'));
    expect(screen.getByText(t('onboarding.plan.finishFailed'))).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/onboarding/plan');
    await press(t('onboarding.continue'));
    expect(router.getPathname()).toBe('/');
  });

  test('allowed, with a starting target: "Food to start", one number, and the days the scale corrects it in — the server\'s, not 14', async () => {
    mockStarting = { targetKcal: 1850, maintenanceKcal: { low: 2050, high: 2400 }, observationDays: 28 };
    await toPlan({ experience: 'NEW', allow: true });
    expect(screen.getByText(t('onboarding.plan.food'))).toBeOnTheScreen();
    expect(screen.getByText(t('onboarding.plan.foodKcal', { kcal: '1,850' }))).toBeOnTheScreen();
    expect(screen.getByText(t('onboarding.plan.foodNote', { days: 28 }))).toBeOnTheScreen();
    // Never the estimate's range as a promise, never a number for Monday.
    expect(screen.queryByText(/2,050|2,400/)).toBeNull();
  });

  test.each([403, 404, 409])('allowed, the server answering %i for the starting target: no food row, the plan as before', async (status) => {
    mockStarting = status;
    await toPlan({ experience: 'NEW', allow: true });
    expect(screen.queryByText(t('onboarding.plan.food'))).toBeNull();
    expect(screen.getByText(t('onboarding.plan.firstCall'))).toBeOnTheScreen();
  });

  test('declined: the starting target is not asked for, and there is no food row', async () => {
    mockStarting = { targetKcal: 1850, maintenanceKcal: { low: 2050, high: 2400 }, observationDays: 14 };
    await toPlan({ experience: 'NEW' });
    expect(mockApi.GET).not.toHaveBeenCalledWith('/v1/targets/starting');
    expect(screen.queryByText(t('onboarding.plan.food'))).toBeNull();
  });

  test('declined: no first call on the plan', async () => {
    await toPlan({ experience: 'NEW' });
    expect(screen.queryByText(t('onboarding.plan.firstCall'))).toBeNull();
  });

  test('Monday morning: the switch turns on the check-in morning reminder alone, through the service Settings uses, and off again', async () => {
    await toPlan({ experience: 'NEW' });
    const toggle = screen.getByLabelText(t('onboarding.plan.remind', { day: t('onboarding.schedule.dayName.MONDAY') }));
    expect(toggle.props.value).toBe(false);
    await act(async () => fireEvent(toggle, 'valueChange', true));
    // The Monday morning one alone (product decision on review): not the other two kinds.
    expect(mockTurnOn).toHaveBeenCalledWith({ only: 'check_in' });
    expect(screen.getByLabelText(t('onboarding.plan.remind', { day: t('onboarding.schedule.dayName.MONDAY') })).props.value).toBe(true);
    await act(async () => fireEvent(toggle, 'valueChange', false));
    expect(mockTurnOff).toHaveBeenCalledTimes(1);
  });

  test('iOS saying no for good is said; the plan goes on', async () => {
    mockTurnOn.mockImplementationOnce(async () => ({ granted: false, canAskAgain: false }));
    await toPlan({ experience: 'NEW' });
    await act(async () => fireEvent(screen.getByLabelText(t('onboarding.plan.remind', { day: t('onboarding.schedule.dayName.MONDAY') })), 'valueChange', true));
    expect(screen.getByText(t('onboarding.reminders.refused'))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('onboarding.continue') })).toBeEnabled();
  });

  test('no screen after the questions shows a missing text key or an unfilled placeholder', async () => {
    const clean = () => {
      expect(screen.queryByText(/\[missing:/)).toBeNull();
      expect(screen.queryByText(/\{\w+\}/)).toBeNull();
    };
    await walkTo('activity', { experience: 'Y3_PLUS', allow: true });
    await choose(t('onboarding.activity.ACTIVE'));
    clean();
    await press(t('onboarding.weights.skip'));
    clean();
    await press(t('onboarding.preparing.see'));
    clean();
  });
});
