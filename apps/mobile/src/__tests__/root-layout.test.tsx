/**
 * The root layout holds the splash until the heading font is ready — and never forever: a font that fails to load
 * falls back to the system face instead of leaving the app on the splash screen. It themes the app with the person's
 * appearance choice, and tells iOS the same so its own parts (status bar, tab bar, sheets) match (ADR-070 #3).
 */
import { render, screen } from '@testing-library/react-native';
import { Appearance } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import RootLayout from '@/app/_layout';

jest.mock('expo-font', () => ({ useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-router/stack', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  // The screens' theme, shown where a test can read it.
  function Stack() {
    const { useTheme } = jest.requireActual<typeof import('@/theme/theme')>('@/theme/theme');
    return <View testID="app" accessibilityLabel={useTheme().scheme} />;
  }
  Stack.Screen = function Screen() {
    return null;
  };
  Stack.Protected = function Protected() {
    return null;
  };
  return { Stack };
});
// The services need a phone (SQLite, keychain); signed in is enough for what this file checks. `mockServicesReady`
// stands for the database and keychain having been read.
let mockServicesReady = true;
let mockAppearance: 'light' | 'dark' | 'system' = 'light';
jest.mock('@/services/ServicesProvider', () => ({
  ServicesProvider: ({ children }: { children: unknown }) => (mockServicesReady ? children : null),
  useSignedIn: () => true,
  useOnboarding: () => 'done',
  useSubscriptionGate: () => 'open', // the gate (K-706) is navigation.test.tsx's
  useAppearance: () => mockAppearance,
}));

const fonts = useFonts as jest.Mock;
const hide = SplashScreen.hideAsync as jest.Mock;

const setColorScheme = jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => {});

beforeEach(() => {
  hide.mockClear();
  setColorScheme.mockClear();
  mockServicesReady = true;
  mockAppearance = 'light';
});

test('while the font loads: nothing rendered, splash kept', async () => {
  fonts.mockReturnValue([false, null]);
  await render(<RootLayout />);
  expect(screen.queryByTestId('app')).toBeNull();
  expect(hide).not.toHaveBeenCalled();
});

test('font loaded: splash hidden, app rendered', async () => {
  fonts.mockReturnValue([true, null]);
  await render(<RootLayout />);
  expect(screen.getByTestId('app')).toBeOnTheScreen();
  expect(hide).toHaveBeenCalled();
});

test('font failed: splash hidden, app rendered anyway, failure reported', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    fonts.mockReturnValue([false, new Error('asset missing')]);
    await render(<RootLayout />);
    expect(screen.getByTestId('app')).toBeOnTheScreen();
    expect(hide).toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/font/i), 'asset missing');
  } finally {
    warn.mockRestore();
  }
});

test('font loaded but the services still opening: splash kept, so no blank screen shows', async () => {
  fonts.mockReturnValue([true, null]);
  mockServicesReady = false;
  await render(<RootLayout />);
  expect(hide).not.toHaveBeenCalled();
});

test('an error while starting is shown by the root error screen, not a crash', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const layout = require('@/app/_layout') as { ErrorBoundary?: unknown };
  expect(layout.ErrorBoundary).toBeDefined();
});

describe('the appearance choice (ADR-070 #3)', () => {
  beforeEach(() => fonts.mockReturnValue([true, null]));

  test.each(['light', 'dark'] as const)('%s: the screens take it, and iOS is told the same', async (choice) => {
    mockAppearance = choice;
    await render(<RootLayout />);
    expect(screen.getByTestId('app')).toHaveProp('accessibilityLabel', choice);
    expect(setColorScheme).toHaveBeenLastCalledWith(choice);
  });

  test('System: iOS follows the phone again (no override)', async () => {
    mockAppearance = 'system';
    await render(<RootLayout />);
    expect(setColorScheme).toHaveBeenLastCalledWith('unspecified');
  });
});
