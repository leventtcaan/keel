/**
 * The sign-in screen (K-305): the Apple button, and what the user sees when it does not go through. Leaving the Apple
 * sheet is not an error. Navigation after sign-in is the root layout's (Stack.Protected), not this screen's.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import SignInScreen from '@/app/sign-in';
import { t } from '@/copy';
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

test('shows the product name and the Apple button', async () => {
  await show();
  expect(screen.getByRole('header', { name: t('app.name') })).toBeOnTheScreen();
  expect(screen.getByTestId('apple-button')).toBeOnTheScreen();
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
