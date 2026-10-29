/**
 * The sign-in screen, #welcome (K-305, ADR-072 #1-#2): the promise, example calls, the Apple button, and what the user sees
 * when it does not go through. Leaving the Apple sheet is not an error. Navigation after sign-in is the root layout's
 * (Stack.Protected), not this screen's.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Linking } from 'react-native';

import SignInScreen from '@/app/sign-in';
import { t } from '@/copy';
import { EXAMPLE_CALLS } from '@/onboarding/ExampleCalls';
import { onboardingParams } from '@/onboarding/params';
import { ThemeProvider } from '@/theme/theme';

const mockServices = {
  signInWithApple: jest.fn(),
  appleAvailable: jest.fn(async () => true),
  report: jest.fn(),
};
const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
// The build's legal addresses (subscription/links.ts): both set, or none, as a build without them leaves them out.
const BOTH = [
  { key: 'subscription.terms', url: 'https://example.test/terms' },
  { key: 'subscription.privacy', url: 'https://example.test/privacy' },
];
let mockLinks: { key: string; url: string }[] = BOTH;
jest.mock('@/subscription/links', () => ({ ...jest.requireActual('@/subscription/links'), configuredLegalLinks: () => mockLinks }));

let mockApplePress: () => void = () => {};

jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));
jest.mock('expo-apple-authentication', () => {
  const { Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    AppleAuthenticationButton: ({ onPress }: { onPress: () => void }) => {
      mockApplePress = onPress;
      return <Pressable testID="apple-button" onPress={onPress} />;
    },
    AppleAuthenticationButtonType: { SIGN_IN: 0, CONTINUE: 1 },
    AppleAuthenticationButtonStyle: { WHITE: 0, WHITE_OUTLINE: 1, BLACK: 2 },
  };
});

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <SignInScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}

beforeEach(() => {
  mockLinks = BOTH;
  openURL.mockClear();
  mockServices.report.mockClear();
  mockServices.signInWithApple.mockReset();
  mockServices.appleAvailable.mockResolvedValue(true);
});

test('says the promise, with the product name and the Apple button (ADR-072 #1)', async () => {
  await show();
  expect(screen.getByRole('header', { name: t('welcome.headline') })).toBeOnTheScreen();
  expect(t('welcome.headline')).toBe('Stop guessing in the gym.');
  expect(screen.getByText(t('welcome.lead'))).toBeOnTheScreen();
  expect(screen.getByText(t('app.name'))).toBeOnTheScreen();
  expect(screen.getByTestId('apple-button')).toBeOnTheScreen();
});

describe('the legal line under the button (prototype #welcome, audit C9)', () => {
  test('"18+ · Terms · Privacy": the age, and the two documents as links', async () => {
    await show();
    expect(screen.getByText(t('welcome.legal.age'))).toBeOnTheScreen();
    expect(t('welcome.legal.age')).toBe('18+');
    expect(screen.getByRole('link', { name: t('welcome.legal.terms') })).toBeOnTheScreen();
    expect(screen.getByRole('link', { name: t('welcome.legal.privacy') })).toBeOnTheScreen();
  });

  test('each link opens its address from the build, the one the paywall links to', async () => {
    await show();
    await fireEvent.press(screen.getByRole('link', { name: t('welcome.legal.terms') }));
    expect(openURL).toHaveBeenLastCalledWith('https://example.test/terms');
    await fireEvent.press(screen.getByRole('link', { name: t('welcome.legal.privacy') }));
    expect(openURL).toHaveBeenLastCalledWith('https://example.test/privacy');
  });

  test('an address the build does not have is left out, never a dead link; the age stays', async () => {
    mockLinks = [BOTH[1]];
    await show();
    expect(screen.queryByRole('link', { name: t('welcome.legal.terms') })).toBeNull();
    expect(screen.getByRole('link', { name: t('welcome.legal.privacy') })).toBeOnTheScreen();
    expect(screen.getByText(t('welcome.legal.age'))).toBeOnTheScreen();
  });

  test('a link that cannot be opened is reported by name, not left unhandled', async () => {
    openURL.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'NoBrowser' }));
    await show();
    await fireEvent.press(screen.getByRole('link', { name: t('welcome.legal.terms') }));
    await act(async () => {});
    expect(mockServices.report).toHaveBeenCalledWith({ name: 'NoBrowser' });
  });
});

describe('example calls', () => {
  const shown = () => EXAMPLE_CALLS.filter((key) => screen.queryByText(t(key)) !== null);

  afterEach(() => jest.useRealTimers());

  test('one at a time, each in turn, then the first again and they rest: no endless motion', async () => {
    jest.useFakeTimers();
    await show();
    expect(screen.getByText(t('welcome.examplesLabel'))).toBeOnTheScreen();
    expect(shown()).toEqual([EXAMPLE_CALLS[0]]);
    for (const key of [...EXAMPLE_CALLS.slice(1), EXAMPLE_CALLS[0]]) {
      await act(async () => {
        jest.advanceTimersByTime(onboardingParams.welcomeExampleMs);
      });
      expect(shown()).toEqual([key]);
    }
    // Not a whole number of rounds: an endless rotation would be showing another one now.
    await act(async () => {
      jest.advanceTimersByTime(onboardingParams.welcomeExampleMs * (EXAMPLE_CALLS.length + 1));
    });
    expect(shown()).toEqual([EXAMPLE_CALLS[0]]);
  });

  test('with Reduce Motion on, the first stays and nothing turns', async () => {
    jest.useFakeTimers();
    jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValueOnce(true);
    await show();
    for (let turn = 0; turn < EXAMPLE_CALLS.length; turn++) {
      await act(async () => {
        jest.advanceTimersByTime(onboardingParams.welcomeExampleMs);
      });
      expect(shown()).toEqual([EXAMPLE_CALLS[0]]);
    }
  });

  test('never "2 days, not 3": the engine does not propose fewer than three days (ADR-071 #8)', () => {
    expect(EXAMPLE_CALLS.length).toBeGreaterThan(1);
    for (const key of EXAMPLE_CALLS) expect(t(key)).not.toMatch(/\b2 days|not 3|fewer days/i);
  });
});

test('pressing the button signs in with Apple', async () => {
  mockServices.signInWithApple.mockResolvedValue({ kind: 'signedIn', newAccount: false });
  await show();
  await fireEvent.press(screen.getByTestId('apple-button'));
  expect(mockServices.signInWithApple).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(t('signIn.failed'))).toBeNull();
});

test('a failure says so, and can be tried again', async () => {
  mockServices.signInWithApple.mockResolvedValue({ kind: 'failed', reason: 'REFUSED' });
  await show();
  await fireEvent.press(screen.getByTestId('apple-button'));
  expect(screen.getByText(t('signIn.failed'))).toBeOnTheScreen();
  expect(screen.getByTestId('apple-button')).toBeOnTheScreen();
});

test('after a failure, trying again really tries again, and the old message goes', async () => {
  mockServices.signInWithApple.mockResolvedValueOnce({ kind: 'failed', reason: 'REFUSED' }).mockResolvedValueOnce({ kind: 'canceled' });
  await show();
  await fireEvent.press(screen.getByTestId('apple-button'));
  await fireEvent.press(screen.getByTestId('apple-button'));
  expect(mockServices.signInWithApple).toHaveBeenCalledTimes(2);
  expect(screen.queryByText(t('signIn.failed'))).toBeNull();
});

test('while trying again, the message from the last failure is gone', async () => {
  let finish!: (result: { kind: 'canceled' }) => void;
  mockServices.signInWithApple
    .mockResolvedValueOnce({ kind: 'failed', reason: 'REFUSED' })
    .mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
  await show();
  await fireEvent.press(screen.getByTestId('apple-button'));
  expect(screen.getByText(t('signIn.failed'))).toBeOnTheScreen();
  await act(async () => {
    mockApplePress(); // not awaited: the attempt is still going when we look
  });
  expect(screen.queryByText(t('signIn.failed'))).toBeNull();
  await act(async () => finish({ kind: 'canceled' }));
});

test('a second tap while signing in does not start a second sign-in', async () => {
  let finish!: (result: { kind: 'canceled' }) => void;
  mockServices.signInWithApple.mockReturnValue(new Promise((resolve) => (finish = resolve)));
  await show();
  const press = mockApplePress;
  // Two taps in the same moment: both handlers run before React renders again.
  await act(async () => {
    press();
    press();
  });
  expect(mockServices.signInWithApple).toHaveBeenCalledTimes(1);
  await act(async () => finish({ kind: 'canceled' }));
});

test('no answer from the server says to check the connection', async () => {
  mockServices.signInWithApple.mockResolvedValue({ kind: 'failed', reason: 'NO_ANSWER' });
  await show();
  await fireEvent.press(screen.getByTestId('apple-button'));
  expect(screen.getByText(t('signIn.offline'))).toBeOnTheScreen();
});

test('closing the Apple sheet shows nothing', async () => {
  mockServices.signInWithApple.mockResolvedValue({ kind: 'canceled' });
  await show();
  await fireEvent.press(screen.getByTestId('apple-button'));
  expect(screen.queryByText(t('signIn.failed'))).toBeNull();
  expect(screen.queryByText(t('signIn.offline'))).toBeNull();
});

test('where Sign in with Apple is not available, it says so instead of a dead button', async () => {
  mockServices.appleAvailable.mockResolvedValue(false);
  await show();
  expect(screen.queryByTestId('apple-button')).toBeNull();
  expect(screen.getByText(t('signIn.unavailable'))).toBeOnTheScreen();
});
