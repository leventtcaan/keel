/**
 * The sign-in screen, #welcome (K-305, ADR-072 #1-#2): the promise, example calls, the Apple button, and what the user sees
 * when it does not go through. Leaving the Apple sheet is not an error. Navigation after sign-in is the root layout's
 * (Stack.Protected), not this screen's.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import SignInScreen from '@/app/sign-in';
import { t } from '@/copy';
import { EXAMPLE_CALLS } from '@/onboarding/ExampleCalls';
import { onboardingParams } from '@/onboarding/params';
import { ThemeProvider } from '@/theme/theme';

const mockServices = {
  signInWithApple: jest.fn(),
  appleAvailable: jest.fn(async () => true),
};

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
