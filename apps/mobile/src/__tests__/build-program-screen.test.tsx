/**
 * Build my program (K-1037, ADR-084): the way out for an account with a profile and no program. The onboarding's days
 * question, asked once more (2 to 5 days, the app places them: defaultTrainingDays); the answer is POST /v1/program/generate
 * and then the Train tab. No answer from the server is "no connection"; an error answer is "couldn't build it"; both can
 * be tried again.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import BuildProgramScreen from '@/app/build-program';
import { t } from '@/copy';
import { defaultTrainingDays, offeredDayCounts } from '@/onboarding/params';
import { ThemeProvider } from '@/theme/theme';

type Answer = { data?: unknown; error?: unknown; response: { status: number } };
const built: Answer = { data: { id: 'p1', source: 'GENERATED', days: [], week: [] }, response: { status: 200 } };

let mockAnswer: () => Promise<Answer>;
const mockPost = jest.fn(async (_path: string, _init?: unknown) => mockAnswer());
const mockServices = { api: { POST: (path: string, init?: unknown) => mockPost(path, init) } };
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));
const mockDismissTo = jest.fn();
const mockBack = jest.fn();
/** The options the screen gave its Stack.Screen last (the system header's back button and the edge swipe are two of them). */
let mockScreenOptions: { headerBackVisible?: boolean; gestureEnabled?: boolean } | undefined;
jest.mock('expo-router', () => ({
  Stack: {
    Screen: ({ options }: { options?: { headerBackVisible?: boolean; gestureEnabled?: boolean } }) => {
      mockScreenOptions = options;
      return null;
    },
  },
  router: { dismissTo: (...args: unknown[]) => mockDismissTo(...args), back: () => mockBack() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockScreenOptions = undefined;
  mockAnswer = async () => built;
});

const show = () =>
  render(
    <ThemeProvider>
      <BuildProgramScreen />
    </ThemeProvider>,
  );
const choose = async (count: number) => {
  await fireEvent.press(screen.getByRole('radio', { name: t('onboarding.days.label', { count }) }));
  await act(async () => {});
};

test('the onboarding question: the same words, one box for each count it offers', async () => {
  await show();
  expect(screen.getByRole('header', { name: t('buildProgram.title') })).toBeOnTheScreen();
  expect(screen.getByText(t('onboarding.days.title'))).toBeOnTheScreen();
  expect(screen.getByText(t('buildProgram.note'))).toBeOnTheScreen();
  expect(screen.getAllByRole('radio').map((r) => r.props.accessibilityLabel)).toEqual(offeredDayCounts.map((count) => t('onboarding.days.label', { count })));
  expect(mockPost).not.toHaveBeenCalled();
});

test('choosing 3 builds the program on the default weekdays for 3, and opens the Train tab', async () => {
  await show();
  await choose(3);
  expect(mockPost).toHaveBeenCalledTimes(1);
  expect(mockPost).toHaveBeenCalledWith('/v1/program/generate', { body: { trainingDays: defaultTrainingDays(3) } });
  expect(defaultTrainingDays(3)).toHaveLength(3);
  expect(mockDismissTo).toHaveBeenCalledWith('/train');
});

test.each(offeredDayCounts)('every count sends its own default days (%i)', async (count) => {
  await show();
  await choose(count);
  expect(mockPost).toHaveBeenCalledWith('/v1/program/generate', { body: { trainingDays: defaultTrainingDays(count) } });
});

test('while the server builds: a busy sign, the boxes off, a second tap sends nothing more', async () => {
  let answer: (a: Answer) => void = () => undefined;
  mockAnswer = () => new Promise((resolve) => (answer = resolve));
  await show();
  await choose(4);
  expect(screen.getByText(t('buildProgram.building'))).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('radio', { name: t('onboarding.days.label', { count: 5 }) }));
  expect(mockPost).toHaveBeenCalledTimes(1);
  expect(mockDismissTo).not.toHaveBeenCalled();
  await act(async () => answer(built));
  expect(mockDismissTo).toHaveBeenCalledWith('/train');
});

test('no answer from the server: "no connection", and no Train tab', async () => {
  mockAnswer = async () => {
    throw new TypeError('Network request failed');
  };
  await show();
  await choose(3);
  expect(screen.getByText(t('buildProgram.offline'))).toBeOnTheScreen();
  expect(screen.queryByText(t('buildProgram.failed'))).toBeNull();
  expect(screen.queryByText(t('buildProgram.building'))).toBeNull();
  expect(mockDismissTo).not.toHaveBeenCalled();
});

test('the server answers with an error: "couldn\'t build it", not "no connection"', async () => {
  mockAnswer = async () => ({ error: { code: 'INTERNAL' }, response: { status: 500 } });
  await show();
  await choose(3);
  expect(screen.getByText(t('buildProgram.failed'))).toBeOnTheScreen();
  expect(screen.queryByText(t('buildProgram.offline'))).toBeNull();
  expect(mockDismissTo).not.toHaveBeenCalled();
});

test('Try again sends the same days again, and a build that goes through opens Train', async () => {
  mockAnswer = async () => {
    throw new TypeError('Network request failed');
  };
  await show();
  await choose(4);
  mockAnswer = async () => built;
  await fireEvent.press(screen.getByRole('button', { name: t('buildProgram.retry') }));
  await act(async () => {});
  expect(mockPost).toHaveBeenCalledTimes(2);
  expect(mockPost).toHaveBeenLastCalledWith('/v1/program/generate', { body: { trainingDays: defaultTrainingDays(4) } });
  expect(mockDismissTo).toHaveBeenCalledWith('/train');
  expect(screen.queryByText(t('buildProgram.offline'))).toBeNull();
});

test('after a failure another count can be chosen instead, and the old message goes while it is sent', async () => {
  mockAnswer = async () => ({ error: { code: 'INTERNAL' }, response: { status: 500 } });
  await show();
  await choose(3);
  let answer: (a: Answer) => void = () => undefined;
  mockAnswer = () => new Promise((resolve) => (answer = resolve));
  await choose(5);
  expect(screen.queryByText(t('buildProgram.failed'))).toBeNull();
  expect(mockPost).toHaveBeenLastCalledWith('/v1/program/generate', { body: { trainingDays: defaultTrainingDays(5) } });
  await act(async () => answer(built));
  expect(mockDismissTo).toHaveBeenCalledWith('/train');
});

// The way back is the system's (ADR-070 Ek 2 #4): no Back button in the screen, and the header's is open until the build is on its way.
test('there is no Back of its own in the screen; the header back is open, and shut only while the program is being built', async () => {
  await show();
  expect(screen.queryByRole('button', { name: /^Back$/ })).toBeNull();
  expect(mockScreenOptions).toEqual({ headerBackVisible: true, gestureEnabled: true });
  let answer: (a: Answer) => void = () => undefined;
  mockAnswer = () => new Promise((resolve) => (answer = resolve));
  await choose(3);
  expect(mockScreenOptions).toEqual({ headerBackVisible: false, gestureEnabled: false });
  await act(async () => answer(built));
  expect(mockPost).toHaveBeenCalledTimes(1);
});

test('opening the screen sends nothing: leaving by the header sends nothing', async () => {
  await show();
  expect(mockPost).not.toHaveBeenCalled();
});
