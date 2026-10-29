/**
 * Main navigation (K-953, ADR-069 #3-#4): three system tabs (This week, Train, Progress), the app opens on This week, and
 * one "+" on every tab opens the log sheet over the tabs. The screens taken off the surface keep their code, and nothing
 * opens them: no screen, and no link either. Routes are rendered from the real src/app folder.
 */
import * as fs from 'fs';
import * as path from 'path';

import { router as appRouter } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import type { ComponentType } from 'react';
import { StyleSheet } from 'react-native';

import TodayScreen from '@/app/(tabs)/index';
import ProgressScreen from '@/app/(tabs)/progress';
import TrainScreen from '@/app/(tabs)/train';
import { t } from '@/copy';
import { RETIRED, TABS, type TabRoute } from '@/navigation/tabs';
import { ThemeProvider } from '@/theme/theme';

jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
// The services need a phone (SQLite, keychain); the session state is what navigation reads from them (K-305).
let mockSignedIn = true;
let mockGate: 'unknown' | 'required' | 'open' = 'open';
const mockHealthWriteOff = { workouts: false, weighIns: false };
// What the server says on opening the app about a gap in the log (K-981): nothing to ask, as for most opens.
let mockReturn: { awayDays: number; shouldPrompt: boolean; suggested: 'EASE_BACK' | 'PICK_UP' } = { awayDays: 0, shouldPrompt: false, suggested: 'PICK_UP' };
const mockAnswers: unknown[] = [];
const mockRemindersOff = { enabled: false, cue: '' };
const mockServices = {
  signInWithApple: jest.fn(),
  appleAvailable: async () => false,
  // What the settings screen reads on arrival (K-309); Today's parts (K-401) are not there yet, as for a new account.
  api: {
    GET: async (path: string) =>
      path === '/v1/consents'
        ? { data: [], response: new Response(null, { status: 200 }) }
        : path === '/v1/return'
          ? { data: mockReturn, response: new Response(null, { status: 200 }) }
          : { error: { code: 'NOT_FOUND', message: 'x' }, response: new Response(null, { status: 404 }) },
    POST: async (_path: string, init: { body: unknown }) => {
      mockAnswers.push(init.body);
      mockReturn = { ...mockReturn, shouldPrompt: false };
      return { data: mockReturn, response: new Response(null, { status: 200 }) };
    },
  },
  health: { available: false },
  consents: { granted: async () => false }, // the settings screen asks whether the health data consent is given (K-982)
  syncHealth: async () => ({ weighIns: 0, stepsToday: null }),
  bodyFigure: async () => 'male', // Progress's muscle map (K-979)
  queue: { drain: async () => {} }, // Today reads Apple Health's weigh-ins first (K-402); none here
  // The Train tab's program and catalog (K-405); none yet, as for a new account.
  training: {
    read: async () => ({ program: { state: 'none' }, exercises: { state: 'none' }, kept: false }),
    // Progress reads the workouts behind its strength chart (K-604); none yet.
    own: async () => [],
    history: async () => ({ state: 'none' }),
  },
  photos: { checks: async () => [], forget: async () => {} }, // Progress's photos card (K-614): none yet
  workoutRecords: async () => [],
  mealRecords: async () => [],
  report: () => {},
  // The settings screen's reminders (K-410): off, as for a new account. One settings object (useSyncExternalStore).
  reminders: {
    current: () => mockRemindersOff,
    subscribe: () => () => {},
    permission: async () => ({ granted: false, canAskAgain: true }),
    keepRestUntil: async () => {}, // Today hands on the program's week off (ADR-037 › 51b)
    keepFirstCall: async () => {}, // Today hands on the first call's day (K-992)
    keepWeighInWeek: async () => {}, // and the week's weigh-ins (ADR-089 Ek 2)
    era: () => 0,
  },  // The Apple Health write switches (K-412): off. One settings object (useSyncExternalStore).
  healthWriting: { current: () => mockHealthWriteOff, subscribe: () => () => {}, shown: () => 'off' },
  state: { keep: async () => {}, current: async () => null }, // Today keeps the state it read (K-518); Train reads it (K-528)
  opens: { previous: async () => null }, // Today counts its open (K-521)
  // The gate screen (K-706): it asks the gate when not known; the store is not in this build. Its account section counts.
  gate: { refresh: async () => {} },
  // The first-use guide (K-1065): shown already, so it never opens over these tabs.
  guide: { seen: async () => true, markSeen: async () => {}, forget: async () => {} },
  planPreviews: { current: () => null }, // no plan just shown: the gate met on opening the app (K-967)
  purchases: { available: false },
  pendingCount: async () => 0,
};
jest.mock('@/services/ServicesProvider', () => ({
  ServicesProvider: ({ children }: { children: unknown }) => children,
  useSignedIn: () => mockSignedIn,
  useOnboarding: () => 'done', // this file is about a finished account; onboarding-flow.test.tsx is about the rest
  useSubscriptionGate: () => mockGate,
  // One object for the life of the test, as the real services are built once per process: a screen may depend on it.
  useAppServices: () => mockServices,
  useUnits: () => 'METRIC',
  useAppearance: () => 'light',
}));

beforeEach(() => {
  mockSignedIn = true;
  mockGate = 'open';
  mockReturn = { awayDays: 0, shouldPrompt: false, suggested: 'PICK_UP' };
  mockAnswers.length = 0;
});

test.each(['required', 'unknown'] as const)(
  'the gate after onboarding (K-706) %s: the only screen is the gate — no tabs, no way around it',
  async (gate) => {
    mockGate = gate;
    const router = renderRouter(APP, { initialUrl: '/' });
    await router;
    expect(router.getPathname()).toBe('/subscribe');
    expect(screen.queryByRole('header', { name: t('screens.today.title') })).toBeNull();
    await act(async () => appRouter.push('/settings'));
    expect(router.getPathname()).toBe('/subscribe');
  },
);

test.each(['/ledger', '/what-if'])('a link straight to %s does not get around the gate (K-706 review)', async (url) => {
  mockGate = 'required';
  const router = renderRouter(APP, { initialUrl: url });
  await router;
  expect(router.getPathname()).toBe('/subscribe');
});

const APP = path.resolve(__dirname, '../app');

test('the tabs are This week, Train, Progress, in that order', () => {
  expect(TABS.map((tab) => t(tab.titleKey))).toEqual(['This week', 'Train', 'Progress']);
});

test('every tab has a screen file, and every screen file in the tab group is a tab', () => {
  const files = fs
    .readdirSync(path.join(APP, '(tabs)'))
    .filter((file) => file !== '_layout.tsx')
    .map((file) => file.replace(/\.tsx$/, ''));
  expect(files.sort()).toEqual(TABS.map((tab) => tab.name).sort());
});

test('the app opens on This week', async () => {
  const router = renderRouter(APP, { initialUrl: '/' });
  await router;
  expect(router.getPathname()).toBe('/');
  expect(router.getSegments()).toEqual(['(tabs)']);
  expect(screen.getByRole('header', { name: t('screens.today.title') })).toBeOnTheScreen();
});

const tabScreens: Record<TabRoute['name'], ComponentType> = {
  index: TodayScreen,
  train: TrainScreen,
  progress: ProgressScreen,
};

test.each(TABS.map((tab) => tab.name))('the %s tab shows the "+" and no coach entry', async (name) => {
  const Screen = tabScreens[name];
  // Inside a navigator, as in the app: Today reads again each time it comes into view (useFocusEffect, K-401 review).
  await renderRouter({
    index: () => (
      <ThemeProvider scheme="light">
        <Screen />
      </ThemeProvider>
    ),
  });
  expect(screen.getByRole('button', { name: t('plus.entry') })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('coach.entry') })).toBeNull();
  // The native tab bar overlays the screen; the bottom safe area keeps the "+" above it.
  expect(screen.getByTestId('screen').props.edges).toMatchObject({ top: 'additive', bottom: 'additive' });
  // It floats over the rows (K-1050): no strip of its own beside it, and only the button takes touches.
  const plus = screen.getByTestId('plus');
  expect(StyleSheet.flatten(plus.props.style)).toMatchObject({ position: 'absolute' });
  expect(plus.props.pointerEvents).toBe('box-none');
});

test.each(TABS.map((tab, position) => [tab.name, position] as const))(
  'from the %s tab, the "+" opens the log sheet over the tabs',
  async (name, position) => {
    const start = name === 'index' ? '/' : `/${name}`;
    const router = renderRouter(APP, { initialUrl: start });
    await router;
    // Native tabs keep every tab mounted (entries in tab order); only the focused tab's entry is live, as on a phone.
    await fireEvent.press(screen.getAllByRole('button', { name: t('plus.entry') })[position]);
    // renderRouter runs on fake timers; let the navigation's scheduled work finish.
    await act(async () => {
      jest.runAllTimers();
    });
    expect(router.getPathname()).toBe('/plus');
    expect(screen.getByRole('header', { name: t('plus.title') })).toBeOnTheScreen();
    // Over the tabs, not replacing them: closing the sheet returns to the same tab.
    expect(appRouter.canGoBack()).toBe(true);
    await act(async () => {
      appRouter.back();
      jest.runAllTimers();
    });
    expect(router.getPathname()).toBe(start);
  },
);

test.each(RETIRED.map((name) => `/${name}`))('a link straight to %s opens This week, not the retired screen', async (url) => {
  const router = renderRouter(APP, { initialUrl: url });
  await router;
  await act(async () => {
    jest.runAllTimers();
  });
  expect(router.getPathname()).toBe('/');
  expect(screen.getByRole('header', { name: t('screens.today.title') })).toBeOnTheScreen();
});

test("today's food is a route, not a tab and not retired (ADR-086): a link opens it, back returns to This week", async () => {
  expect(RETIRED as readonly string[]).not.toContain('food');
  expect(TABS.map((tab) => tab.name)).not.toContain('food');
  const router = renderRouter(APP, { initialUrl: '/food' });
  await router;
  await act(async () => {
    jest.runAllTimers();
  });
  expect(router.getPathname()).toBe('/food');
  expect(screen.getByRole('header', { name: t('screens.food.title') })).toBeOnTheScreen();
  // The tabs sit underneath (the anchor): back lands on This week.
  await act(async () => {
    appRouter.back();
    jest.runAllTimers();
  });
  expect(router.getPathname()).toBe('/');
});

test('opened cold from a link (keel://settings), the tabs are underneath (the anchor)', async () => {
  const router = renderRouter(APP, { initialUrl: '/settings' });
  await router;
  expect(router.getPathname()).toBe('/settings');
  expect(appRouter.canGoBack()).toBe(true);
  await act(async () => {
    appRouter.back();
    jest.runAllTimers();
  });
  expect(router.getPathname()).toBe('/');
});

test('"+" then "Life got in the way" opens the state sheet in its place; back returns to the tab', async () => {
  const router = renderRouter(APP, { initialUrl: '/train' });
  await router;
  await fireEvent.press(screen.getAllByRole('button', { name: t('plus.entry') })[1]);
  await act(async () => {
    jest.runAllTimers();
  });
  await fireEvent.press(screen.getByRole('button', { name: t('plus.life') }));
  await act(async () => {
    jest.runAllTimers();
  });
  expect(router.getPathname()).toBe('/state');
  await act(async () => {
    appRouter.back();
    jest.runAllTimers();
  });
  expect(router.getPathname()).toBe('/train');
});

test.each(['/', '/train', '/coach'])('signed out, the app opens on sign-in, even from %s', async (url) => {
  mockSignedIn = false;
  const router = renderRouter(APP, { initialUrl: url });
  await router;
  await act(async () => {
    jest.runAllTimers();
  });
  expect(router.getPathname()).toBe('/sign-in');
  expect(screen.queryByRole('button', { name: t('coach.entry') })).toBeNull();
});

test('signed in, sign-in is not reachable', async () => {
  const router = renderRouter(APP, { initialUrl: '/sign-in' });
  await router;
  await act(async () => {
    jest.runAllTimers();
  });
  expect(router.getPathname()).toBe('/');
});

/** The header the stack drew for the screen on top: the native one has its back button and the name it carries (ADR-070 Ek 2 #4). */
const topHeader = () => {
  const found = screen.root!.queryAll((n) => n.type === 'RNSScreenStackHeaderConfig');
  return found[found.length - 1]!.props as { hidden: boolean; backTitle?: string; title: string };
};
const inScreenBack = () => screen.queryAllByRole('button', { name: /^(‹ )?(Back|This week)$/ });

test('Settings opens from Today, over the tabs (K-309, prototype 5.2); its way back is the system header, named for This week (ADR-070 Ek 2 #4)', async () => {
  const router = renderRouter(APP, { initialUrl: '/' });
  await router;
  await fireEvent.press(screen.getByRole('button', { name: t('settings.entry') }));
  await act(async () => {
    jest.runAllTimers();
  });
  expect(router.getPathname()).toBe('/settings');
  expect(screen.getByRole('header', { name: t('settings.title') })).toBeOnTheScreen();
  // No back button of its own in the screen: the header's, "‹ This week".
  expect(inScreenBack()).toEqual([]);
  expect(screen.queryByText(`${t('settings.backMark')} Today`)).toBeNull();
  expect(topHeader()).toMatchObject({ hidden: false, backTitle: t('tabs.today'), title: '' });
  await act(async () => {
    appRouter.back();
    jest.runAllTimers();
  });
  expect(router.getPathname()).toBe('/');
});

// One back pattern for the screens pushed onto the stack: the system header with a back button naming the screen before it; no "Back" in the
// screen. Each is opened cold from a link, so the tabs (This week) sit underneath, and each can be left.
test.each(['/settings', '/settings-detail?part=sources', '/edit-program', '/build-program', '/import', '/call', '/check-in', '/share', '/food', '/state'])(
  'a pushed screen (%s) has the system back, named for the screen before it, and none of its own',
  async (url) => {
    const router = renderRouter(APP, { initialUrl: url });
    await router;
    await act(async () => {
      jest.runAllTimers();
    });
    expect(topHeader()).toMatchObject({ hidden: false, backTitle: t('tabs.today') });
    expect(inScreenBack()).toEqual([]);
    expect(appRouter.canGoBack()).toBe(true);
    await act(async () => {
      appRouter.back();
      jest.runAllTimers();
    });
    expect(router.getPathname()).toBe('/');
  },
);

test('a page under Settings names Settings on its back button; Settings opened from Train names Train', async () => {
  const router = renderRouter(APP, { initialUrl: '/train' });
  await router;
  await act(async () => {
    appRouter.push('/settings');
    jest.runAllTimers();
  });
  expect(topHeader().backTitle).toBe(t('tabs.train'));
  await act(async () => {
    appRouter.push({ pathname: '/settings-detail', params: { part: 'sources' } });
    jest.runAllTimers();
  });
  expect(router.getPathname()).toBe('/settings-detail');
  expect(topHeader().backTitle).toBe(t('settings.title'));
});

test.each(['/check-in', '/state'])('signed out, %s is not reachable (K-501, K-518)', async (url) => {
  mockSignedIn = false;
  const router = renderRouter(APP, { initialUrl: url });
  await router;
  await act(async () => {
    jest.runAllTimers();
  });
  expect(router.getPathname()).toBe('/sign-in');
});

test('signed out, Settings is not reachable', async () => {
  mockSignedIn = false;
  const router = renderRouter(APP, { initialUrl: '/settings' });
  await router;
  await act(async () => {
    jest.runAllTimers();
  });
  expect(router.getPathname()).toBe('/sign-in');
});

describe('coming back after a gap in the log (K-981, ADR-077 #5)', () => {
  test('the server says to ask: the app opens on the return screen over This week; answered, it is back on This week', async () => {
    mockReturn = { awayDays: 22, shouldPrompt: true, suggested: 'EASE_BACK' };
    const router = renderRouter(APP, { initialUrl: '/' });
    await router;
    await act(async () => {
      jest.runAllTimers();
    });
    expect(router.getPathname()).toBe('/return');
    expect(screen.getByRole('header', { name: t('return.title') })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: t('return.continue') }));
    await act(async () => {
      jest.runAllTimers();
    });
    expect(mockAnswers).toEqual([{ choice: 'EASE_BACK' }]);
    expect(router.getPathname()).toBe('/');
  });

  test('the server says not to: the app stays on This week', async () => {
    const router = renderRouter(APP, { initialUrl: '/' });
    await router;
    await act(async () => {
      jest.runAllTimers();
    });
    expect(router.getPathname()).toBe('/');
  });

  test('signed out, /return is not reachable', async () => {
    mockSignedIn = false;
    const router = renderRouter(APP, { initialUrl: '/return' });
    await router;
    await act(async () => {
      jest.runAllTimers();
    });
    expect(router.getPathname()).toBe('/sign-in');
  });
});
