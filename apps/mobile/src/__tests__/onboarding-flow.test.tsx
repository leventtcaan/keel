/**
 * Onboarding (K-306): who sees it, and the walk through it. Routes are rendered from the real src/app folder; the
 * services are faked — the answers that route (signed in, onboarding state) and the profile save.
 */
import * as path from 'path';

import { router as appRouter } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { t } from '@/copy';
import type { OnboardingState } from '@/onboarding/profileStatus';

jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));

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
const mockKeepOnPhone = jest.fn(async (system: 'METRIC' | 'IMPERIAL') => {
  mockUnits = system;
  mockUnitsListeners.forEach((listener) => listener());
});
jest.mock('@/services/ServicesProvider', () => ({
  ServicesProvider: ({ children }: { children: unknown }) => children,
  useSignedIn: () => mockSignedIn,
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
    units: { current: () => mockUnits, keepOnPhone: mockKeepOnPhone },
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

async function choose(name: string) {
  await fireEvent.press(screen.getByRole('radio', { name: new RegExp(`^${name}`) }));
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
  test('continue stays off until the step is answered', async () => {
    await open();
    expect(continueButton()).toBeDisabled();
    await choose(t('onboarding.goal.decide_for_me.title'));
    expect(continueButton()).toBeEnabled();
  });

  test('"decide for me" sits with the other goals, as an equal choice (K-222)', async () => {
    await open();
    expect(screen.getAllByRole('radio').map((option) => option.props.accessibilityLabel)).toEqual([
      expect.stringMatching(new RegExp(`^${t('onboarding.goal.lose_fat.title')}`)),
      expect.stringMatching(new RegExp(`^${t('onboarding.goal.build_muscle.title')}`)),
      expect.stringMatching(new RegExp(`^${t('onboarding.goal.decide_for_me.title')}`)),
    ]);
  });

  test('going back keeps the answer', async () => {
    const router = await open();
    await choose(t('onboarding.goal.build_muscle.title'));
    await press(t('onboarding.continue'));
    expect(router.getPathname()).toBe('/onboarding/program');
    await press(t('onboarding.back'));
    expect(router.getPathname()).toBe('/onboarding');
    expect(screen.getByRole('radio', { name: new RegExp(`^${t('onboarding.goal.build_muscle.title')}`) })).toBeChecked();
  });

  test('the whole walk sends one profile, with the user\'s answers', async () => {
    const router = await open();
    await choose(t('onboarding.goal.decide_for_me.title'));
    await press(t('onboarding.continue'));
    await choose(t('onboarding.program.bring_my_own.title'));
    await press(t('onboarding.continue'));
    await press(t('onboarding.schedule.dayName.TUESDAY'));
    await press(t('onboarding.schedule.dayName.MONDAY'));
    await press(t('onboarding.schedule.sessions.FOUR'));
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.schedule.time')), '7:30');
    await press(t('onboarding.continue'));
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
    expect(mockProfile.save).not.toHaveBeenCalled();
    await press(t('onboarding.expectations.action'));
    expect(mockProfile.save).toHaveBeenCalledTimes(1);
    expect(mockProfile.save).toHaveBeenCalledWith({
      goal: 'DECIDE_FOR_ME',
      sex: 'FEMALE',
      heightCm: 178,
      birthYear: 1994,
      activityLevel: 'LOW_ACTIVE',
      programChoice: 'BRING_MY_OWN',
      schedule: {
        trainingDays: ['MONDAY', 'TUESDAY'],
        usualTrainingTime: '07:30',
        sessionsLastMonth: 'FOUR',
        checkInDay: 'MONDAY',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      units: 'METRIC',
    });
  });

  test('a save that does not go through says so, and the same answers go again', async () => {
    mockProfile.save.mockRejectedValueOnce(new Error('profile save failed with HTTP 503'));
    const router = await walkTo('expectations');
    await press(t('onboarding.expectations.action'));
    expect(screen.getByText(t('onboarding.saveFailed'))).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/onboarding/expectations');
    await press(t('onboarding.expectations.action'));
    expect(mockProfile.save).toHaveBeenCalledTimes(2);
    expect(mockProfile.save.mock.calls[1][0]).toEqual(mockProfile.save.mock.calls[0][0]);
  });

  test('once the profile is saved, the tabs open, and there is no way back into onboarding', async () => {
    const router = await walkTo('expectations');
    await press(t('onboarding.expectations.action'));
    expect(router.getPathname()).toBe('/');
    expect(screen.getByRole('header', { name: t('screens.today.title') })).toBeOnTheScreen();
    expect(appRouter.canGoBack()).toBe(false);
  });

  test('a second tap while saving sends nothing more, and the button is off', async () => {
    let finish = () => {};
    mockProfile.save.mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));
    await walkTo('expectations');
    const button = screen.getByRole('button', { name: t('onboarding.expectations.action') });
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
    expect(screen.getByRole('button', { name: t('onboarding.expectations.action') })).toBeDisabled();
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
    expect(mockProfile.save).toHaveBeenCalledWith(expect.objectContaining({ heightCm: 178, units: 'IMPERIAL' }));
  });

  test('going back keeps typed answers too: height, year, sex, days, last month', async () => {
    await walkTo('activity');
    await press(t('onboarding.back'));
    expect(screen.getByLabelText(t('onboarding.about.heightCm')).props.value).toBe('180');
    expect(screen.getByLabelText(t('onboarding.about.birthYear')).props.value).toBe('1990');
    expect(screen.getByRole('button', { name: t('onboarding.about.male') })).toBeSelected();
    expect(continueButton()).toBeEnabled();
    await press(t('onboarding.back'));
    expect(screen.getByRole('button', { name: t('onboarding.schedule.dayName.MONDAY') })).toBeSelected();
    expect(screen.getByRole('button', { name: t('onboarding.schedule.sessions.FOUR') })).toBeSelected();
  });

  test('no step shows a missing text key', async () => {
    // A missing key shows "[missing: …]"; a placeholder left unfilled shows "{name}".
    const clean = () => {
      expect(screen.queryByText(/\[missing:/)).toBeNull();
      expect(screen.queryByText(/\{\w+\}/)).toBeNull();
    };
    await walkTo('expectations', clean);
    clean();
  });

  test('the first step offers a way out: signing out (a different Apple ID)', async () => {
    await open();
    await press(t('onboarding.signOut'));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});

describe('what the words promise is what the parameters say', () => {
  test('the rest-day note, the photo gap, the quiet days and the check-in day are filled in, not written out', async () => {
    const en = jest.requireActual<Record<string, Record<string, Record<string, unknown>>>>('../../../../data/copy/en.json');
    const onboarding = en.onboarding as Record<string, Record<string, unknown>>;
    expect(onboarding.schedule.restDay).toMatch(/\{max\}/);
    expect(JSON.stringify(onboarding.photos)).not.toMatch(/\b4\b|[Ff]our/);
    expect(JSON.stringify(onboarding.expectations)).not.toMatch(/two weeks|Monday/);
  });
});

describe('schedule', () => {
  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  test('six days at most: the seventh cannot be chosen, and the screen says why', async () => {
    await walkTo('schedule');
    for (const day of days) await press(t(`onboarding.schedule.dayName.${day}`));
    const sunday = screen.getByRole('button', { name: t('onboarding.schedule.dayName.SUNDAY') });
    expect(sunday).not.toBeSelected();
    expect(sunday).toBeDisabled();
    expect(screen.getByText(t('onboarding.schedule.restDay', { max: 6 }))).toBeOnTheScreen();
  });

  test('the plan sentence follows the days chosen, and last month', async () => {
    await walkTo('schedule');
    await press(t('onboarding.schedule.dayName.MONDAY'));
    await press(t('onboarding.schedule.dayName.THURSDAY'));
    await press(t('onboarding.schedule.dayName.SATURDAY'));
    expect(screen.getByText(t('onboarding.schedule.plan', { days: 3 }))).toBeOnTheScreen();
    await press(t('onboarding.schedule.sessions.TWO_TO_THREE'));
    expect(screen.getByText(t('onboarding.schedule.lighter'))).toBeOnTheScreen();
    await press(t('onboarding.schedule.sessions.FIVE_OR_MORE'));
    expect(screen.queryByText(t('onboarding.schedule.lighter'))).toBeNull();
    expect(screen.getByText(t('onboarding.schedule.addLater', { days: 3 }))).toBeOnTheScreen();
  });

  test('one day reads as one', async () => {
    await walkTo('schedule');
    await press(t('onboarding.schedule.dayName.MONDAY'));
    expect(screen.getByText(t('onboarding.schedule.planOne'))).toBeOnTheScreen();
  });

  test('a time that is not one says so and keeps continue off', async () => {
    await walkTo('schedule');
    await press(t('onboarding.schedule.dayName.MONDAY'));
    await press(t('onboarding.schedule.sessions.FOUR'));
    await fireEvent.changeText(screen.getByLabelText(t('onboarding.schedule.time')), '25:00');
    await settle();
    expect(screen.getByText(t('onboarding.schedule.timeInvalid'))).toBeOnTheScreen();
    expect(continueButton()).toBeDisabled();
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
      expect(screen.getByRole('radio', { name: `${t(`onboarding.activity.${level}.title`)}, ${t(`onboarding.activity.${level}.body`)}` })).toBeOnTheScreen();
    }
    expect(screen.getAllByRole('radio')).toHaveLength(4);
  });
});

/** Answers every step before `step`, the shortest way, and stops on it. */
async function walkTo(step: 'schedule' | 'about' | 'activity' | 'expectations', eachStep: () => void = () => {}) {
  const router = await open();
  eachStep();
  await choose(t('onboarding.goal.lose_fat.title'));
  await press(t('onboarding.continue'));
  await choose(t('onboarding.program.build_one_for_me.title'));
  await press(t('onboarding.continue'));
  eachStep();
  if (step === 'schedule') return router;
  await press(t('onboarding.schedule.dayName.MONDAY'));
  await press(t('onboarding.schedule.sessions.FOUR'));
  await press(t('onboarding.continue'));
  eachStep();
  if (step === 'about') return router;
  await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.heightCm')), '180');
  await fireEvent.changeText(screen.getByLabelText(t('onboarding.about.birthYear')), '1990');
  await press(t('onboarding.about.male'));
  await press(t('onboarding.continue'));
  eachStep();
  if (step === 'activity') return router;
  await choose(t('onboarding.activity.ACTIVE.title'));
  await press(t('onboarding.continue'));
  eachStep(); // photos
  await press(t('onboarding.continue'));
  return router;
}
