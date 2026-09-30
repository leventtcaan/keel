/**
 * The root layout holds the splash until the heading font is ready — and never forever: a font that fails to load
 * falls back to the system face instead of leaving the app on the splash screen.
 */
import { render, screen } from '@testing-library/react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import RootLayout from '@/app/_layout';

jest.mock('expo-font', () => ({ useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-router/js-tabs', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  function Tabs() {
    return <View testID="tabs" />;
  }
  Tabs.Screen = function Screen() {
    return null;
  };
  return { Tabs };
});

const fonts = useFonts as jest.Mock;
const hide = SplashScreen.hideAsync as jest.Mock;

beforeEach(() => {
  hide.mockClear();
});

test('while the font loads: nothing rendered, splash kept', async () => {
  fonts.mockReturnValue([false, null]);
  await render(<RootLayout />);
  expect(screen.queryByTestId('tabs')).toBeNull();
  expect(hide).not.toHaveBeenCalled();
});

test('font loaded: splash hidden, tabs rendered', async () => {
  fonts.mockReturnValue([true, null]);
  await render(<RootLayout />);
  expect(screen.getByTestId('tabs')).toBeOnTheScreen();
  expect(hide).toHaveBeenCalled();
});

test('font failed: splash hidden, tabs rendered anyway, failure reported', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    fonts.mockReturnValue([false, new Error('asset missing')]);
    await render(<RootLayout />);
    expect(screen.getByTestId('tabs')).toBeOnTheScreen();
    expect(hide).toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/font/i), 'asset missing');
  } finally {
    warn.mockRestore();
  }
});
