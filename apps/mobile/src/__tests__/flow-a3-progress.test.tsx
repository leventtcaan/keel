/**
 * Flow test A3 (prototip/akis-testi.md: first-day Progress, the calorie target, the meal, back; K-979). Walked through the real
 * screens with a small stack standing in for the navigator: the target is a button that opens the meal, the meal is the real
 * meal screen (its search, ready to log), and back lands on Progress with its first-day targets as they were.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useEffect, useState } from 'react';

import MealScreen from '@/app/meal';
import ProgressScreen from '@/app/(tabs)/progress';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';

import { budget, muscle, program, starting, summary, training } from './support/progressFixtures';

// The navigator: a stack of paths. `push` adds one, `back` takes it off; the harness draws the top one.
let mockStack: string[] = ['/progress'];
let mockRedraw: () => void = () => {};
jest.mock('expo-router', () => ({
  router: {
    push: (to: string) => {
      mockStack.push(to);
      mockRedraw();
    },
    back: () => {
      mockStack.pop();
      mockRedraw();
    },
  },
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(() => {
      effect();
    }, [effect]);
  },
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ push: (to: string) => jest.requireMock('expo-router').router.push(to) }),
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));

const answers: Record<string, unknown> = {
  '/v1/training-progress': training(0, 0, [muscle('quads', 10, 0)]),
  '/v1/weigh-ins/summary': summary(3),
  '/v1/days/{day}/budget': budget(),
  '/v1/program': program({}),
  '/v1/targets/starting': starting(),
};
const mockServices = {
  api: {
    GET: async (path: string) =>
      path in answers ? { data: answers[path], response: new Response(null, { status: 200 }) } : { error: { code: 'NOT_FOUND', message: 'x' }, response: new Response(null, { status: 404 }) },
    POST: jest.fn(),
    PUT: jest.fn(),
  },
  training: { read: async () => ({ program: { state: 'none' }, exercises: { state: 'ready', value: [] }, kept: false }), own: async () => [] },
  syncHealth: async () => ({ weighIns: 0, stepsToday: 3240 }),
  bodyFigure: async () => 'male',
  photos: { checks: async () => [], forget: async () => {} },
  queue: { record: jest.fn(async () => true) },
  consents: { granted: async () => true, remember: jest.fn(async () => {}) },
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => 'METRIC' }));
jest.mock('@/components/MuscleMap', () => ({ MuscleMap: () => null }));

beforeAll(() => {
  jest.useFakeTimers({
    now: new Date(2026, 9, 15, 12, 0),
    doNotFake: ['hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
  });
});
afterAll(() => jest.useRealTimers());

function Stack() {
  const [, redraw] = useState(0);
  useEffect(() => {
    mockRedraw = () => redraw((n) => n + 1);
  }, []);
  const top = mockStack[mockStack.length - 1];
  return top === '/meal' ? <MealScreen /> : <ProgressScreen />;
}

test('first-day Progress, tap the calorie target, the meal opens, back to the same targets (A3)', async () => {
  mockStack = ['/progress'];
  await render(
    <ThemeProvider scheme="light">
      <Stack />
    </ThemeProvider>,
  );
  await act(async () => {});
  expect(screen.getByText("Today's targets.")).toBeOnTheScreen();

  await act(async () => fireEvent.press(screen.getByTestId('target-calories')));
  expect(mockStack).toEqual(['/progress', '/meal']);
  expect(screen.getByLabelText(t('meal.search.label'))).toBeOnTheScreen();
  expect(screen.queryByTestId('target-calories')).toBeNull();

  await act(async () => {
    (jest.requireMock('expo-router') as { router: { back: () => void } }).router.back();
  });
  expect(mockStack).toEqual(['/progress']);
  expect(screen.getByText("Today's targets.")).toBeOnTheScreen();
  expect(screen.getAllByTestId(/^target-/)).toHaveLength(4);
});
