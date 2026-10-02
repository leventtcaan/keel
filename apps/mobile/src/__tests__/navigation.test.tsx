/**
 * Main navigation (K-307, ADR-006, ADR-016): four system tabs — Today, Train, Food, Progress — the app opens on Today,
 * and the coach is one tap away from every tab. Routes are rendered from the real src/app folder.
 */
import * as fs from 'fs';
import * as path from 'path';

import { router as appRouter } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import type { ComponentType } from 'react';

import FoodScreen from '@/app/(tabs)/food';
import TodayScreen from '@/app/(tabs)/index';
import ProgressScreen from '@/app/(tabs)/progress';
import TrainScreen from '@/app/(tabs)/train';
import { t } from '@/copy';
import { TABS, type TabRoute } from '@/navigation/tabs';
import { ThemeProvider } from '@/theme/theme';

jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
// The services need a phone (SQLite, keychain); the session state is what navigation reads from them (K-305).
let mockSignedIn = true;
const mockHealthWriteOff = { workouts: false, weighIns: false };
const mockRemindersOff = { enabled: false, cue: '' };
const mockServices = {
  signInWithApple: jest.fn(),
  appleAvailable: async () => false,
  // What the settings screen reads on arrival (K-309); Today's parts (K-401) are not there yet, as for a new account.
  api: {
    GET: async (path: string) =>
      path === '/v1/consents'
        ? { data: [], response: new Response(null, { status: 200 }) }
        : { error: { code: 'NOT_FOUND', message: 'x' }, response: new Response(null, { status: 404 }) },
  },
  health: { available: false },
  syncHealth: async () => 0,
  queue: { drain: async () => {} }, // Today reads Apple Health's weigh-ins first (K-402); none here
  // The Train tab's program and catalog (K-405); none yet, as for a new account.
  training: { read: async () => ({ program: { state: 'none' }, exercises: { state: 'none' }, kept: false }) },
  workoutRecords: async () => [],
  mealRecords: async () => [],
  report: () => {},
  // The settings screen's reminders (K-410): off, as for a new account. One settings object (useSyncExternalStore).
  reminders: {
    current: () => mockRemindersOff,
    subscribe: () => () => {},
    permission: async () => ({ granted: false, canAskAgain: true }),
    keepRestUntil: async () => {}, // Today hands on the program's week off (ADR-037 › 51b)
    era: () => 0,
  },  // The Apple Health write switches (K-412): off. One settings object (useSyncExternalStore).
  healthWriting: { current: () => mockHealthWriteOff, subscribe: () => () => {}, shown: () => 'off' },
};
jest.mock('@/services/ServicesProvider', () => ({
  ServicesProvider: ({ children }: { children: unknown }) => children,
  useSignedIn: () => mockSignedIn,
  useOnboarding: () => 'done', // this file is about a finished account; onboarding-flow.test.tsx is about the rest
  // One object for the life of the test, as the real services are built once per process: a screen may depend on it.
  useAppServices: () => mockServices,
  useUnits: () => 'METRIC',
}));

beforeEach(() => {
  mockSignedIn = true;
});

const APP = path.resolve(__dirname, '../app');

test('the tabs are Today, Train, Food, Progress, in that order', () => {
  expect(TABS.map((tab) => t(tab.titleKey))).toEqual(['Today', 'Train', 'Food', 'Progress']);
});

test('every tab has a screen file, and every screen file in the tab group is a tab', () => {
  const files = fs
    .readdirSync(path.join(APP, '(tabs)'))
    .filter((file) => file !== '_layout.tsx')
    .map((file) => file.replace(/\.tsx$/, ''));
  expect(files.sort()).toEqual(TABS.map((tab) => tab.name).sort());
});

test('the app opens on Today', async () => {
  const router = renderRouter(APP, { initialUrl: '/' });
  await router;
  expect(router.getPathname()).toBe('/');
  expect(router.getSegments()).toEqual(['(tabs)']);
  expect(screen.getByRole('header', { name: t('screens.today.title') })).toBeOnTheScreen();
});

const tabScreens: Record<TabRoute['name'], ComponentType> = {
  index: TodayScreen,
  train: TrainScreen,
  food: FoodScreen,
  progress: ProgressScreen,
};

test.each(TABS.map((tab) => tab.name))('the %s tab shows the coach entry', async (name) => {
  const Screen = tabScreens[name];
  // Inside a navigator, as in the app: Today reads again each time it comes into view (useFocusEffect, K-401 review).
  await renderRouter({
    index: () => (
      <ThemeProvider scheme="light">
        <Screen />
      </ThemeProvider>
    ),
  });
  expect(screen.getByRole('button', { name: t('coach.entry') })).toBeOnTheScreen();
  // The native tab bar overlays the screen; the bottom safe area keeps the coach bar above it.
  expect(screen.getByTestId('screen').props.edges).toMatchObject({ top: 'additive', bottom: 'additive' });
});

test.each(TABS.map((tab, position) => [tab.name, position] as const))(
  'from the %s tab, its coach entry opens the coach over the tabs',
  async (name, position) => {
    const start = name === 'index' ? '/' : `/${name}`;
    const router = renderRouter(APP, { initialUrl: start });
    await router;
    // Native tabs keep every tab mounted (entries in tab order); only the focused tab's entry is live, as on a phone.
    await fireEvent.press(screen.getAllByRole('button', { name: t('coach.entry') })[position]);
    // renderRouter runs on fake timers; let the navigation's scheduled work finish.
    await act(async () => {
      jest.runAllTimers();
    });
    expect(router.getPathname()).toBe('/coach');
    expect(screen.getByRole('header', { name: t('screens.coach.title') })).toBeOnTheScreen();
    // Pushed over the tabs, not replacing them: closing the coach returns to the same tab.
    expect(appRouter.canGoBack()).toBe(true);
    await act(async () => {
      appRouter.back();
      jest.runAllTimers();
    });
    expect(router.getPathname()).toBe(start);
  },
);

test('the coach screen does not offer a way to itself', async () => {
  const router = renderRouter(APP, { initialUrl: '/coach' });
  await router;
  expect(screen.queryByRole('button', { name: t('coach.entry') })).toBeNull();
});

test('opened cold from a link (keel://coach), the coach still has the tabs underneath', async () => {
  const router = renderRouter(APP, { initialUrl: '/coach' });
  await router;
  expect(appRouter.canGoBack()).toBe(true);
  await act(async () => {
    appRouter.back();
    jest.runAllTimers();
  });
  expect(router.getPathname()).toBe('/');
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

test('Settings opens from Today, over the tabs (K-309, prototype 5.2)', async () => {
  const router = renderRouter(APP, { initialUrl: '/' });
  await router;
  await fireEvent.press(screen.getByRole('button', { name: t('settings.entry') }));
  await act(async () => {
    jest.runAllTimers();
  });
  expect(router.getPathname()).toBe('/settings');
  expect(screen.getByRole('header', { name: t('settings.title') })).toBeOnTheScreen();
  // Its own way back (prototype: "‹ Today"), not only the swipe.
  await fireEvent.press(screen.getByRole('button', { name: t('settings.back') }));
  await act(async () => {
    jest.runAllTimers();
  });
  expect(router.getPathname()).toBe('/');
});

test.each(['/check-in'])('signed out, %s is not reachable (K-501)', async (url) => {
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
