/**
 * Flow test D, the Progress leg (prototip/akis-testi.md: "Progress, pick a lift"; K-979). Walked through the real screens with a
 * small stack for the navigator: pick the second lift (its set shows), open a past call that was not applied from Calls (the real
 * call screen, read only: no button to change it), and come back to Progress, which still shows the lift picked.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useEffect, useState } from 'react';

import ProgressScreen from '@/app/(tabs)/progress';
import CallScreen from '@/app/call';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';

import { budget, consistency, decision, decisionPage, lift, liftWeeks, muscle, program, summary, training, trendPoints, weeks } from './support/progressFixtures';

type Route = { pathname: string; params?: { id?: string; from?: string } };
let mockStack: Route[] = [{ pathname: '/progress' }];
let mockRedraw: () => void = () => {};
const go = (to: string | Route) => {
  mockStack.push(typeof to === 'string' ? { pathname: to } : to);
  mockRedraw();
};
jest.mock('expo-router', () => ({
  router: {
    push: (to: string | Route) => go(to),
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
  useLocalSearchParams: () => mockStack[mockStack.length - 1].params ?? {},
  useRouter: () => ({ push: (to: string | Route) => go(to) }),
}));
jest.mock('@/components/MuscleMap', () => ({ MuscleMap: () => null }));

const DECLINED = decision('c1', '2026-10-05', { application: { state: 'DECLINED' }, declinable: false });
const answers: Record<string, unknown> = {
  '/v1/training-progress': {
    ...training(1, 2, [muscle('quads', 10, 6)]),
    lifts: [lift('squat', true, { weeks: liftWeeks([100, 105]) }), lift('bench_press', false, { weeks: liftWeeks([60]), best: { loadKg: 60, reps: 10, day: '2026-09-07' } })],
  },
  '/v1/consistency': consistency({ weeks: weeks(['ON_TRACK', 'ON_TRACK']) }),
  '/v1/weigh-ins/summary': summary(80, true),
  '/v1/days/{day}/budget': budget(),
  '/v1/program': program({}),
  '/v1/weight-trend': trendPoints([81, 80.5, 80]),
  '/v1/decisions': decisionPage([decision('c2', '2026-10-12'), DECLINED]),
  '/v1/decisions/{id}': DECLINED,
};
const mockServices = {
  api: {
    GET: async (path: string) =>
      path in answers ? { data: answers[path], response: new Response(null, { status: 200 }) } : { error: { code: 'NOT_FOUND', message: 'x' }, response: new Response(null, { status: 404 }) },
    POST: jest.fn(),
  },
  training: { read: async () => ({ program: { state: 'none' }, exercises: { state: 'ready', value: [] }, kept: false }), own: async () => [] },
  syncHealth: async () => ({ weighIns: 0, stepsToday: null }),
  bodyFigure: async () => 'male',
  // What waits on the phone is sent before the read (K-1051); nothing waits here.
  queue: { drain: async () => {} },
  photos: { checks: async () => [], forget: async () => {} },
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => 'METRIC' }));

beforeAll(() => {
  jest.useFakeTimers({
    now: new Date(2026, 9, 15, 12, 0),
    doNotFake: ['hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
  });
});
afterAll(() => jest.useRealTimers());

// Progress stays mounted under the call, as a tab does under a pushed screen.
function Stack() {
  const [, redraw] = useState(0);
  useEffect(() => {
    mockRedraw = () => redraw((n) => n + 1);
  }, []);
  const top = mockStack[mockStack.length - 1];
  return (
    <>
      <ProgressScreen />
      {top.pathname === '/call' ? <CallScreen /> : null}
    </>
  );
}

test('pick a lift, open a call that was not applied (read only), come back to Progress (D)', async () => {
  mockStack = [{ pathname: '/progress' }];
  await render(
    <ThemeProvider scheme="light">
      <Stack />
    </ThemeProvider>,
  );
  await act(async () => {});

  await fireEvent.press(screen.getByRole('button', { name: t('exercises.bench_press.name') }));
  expect(screen.getByTestId('strength-best')).toHaveTextContent('60 kg × 10');

  await act(async () => fireEvent.press(screen.getByTestId('call-c1')));
  expect(mockStack[mockStack.length - 1]).toEqual({ pathname: '/call', params: { id: 'c1', from: 'progress' } });
  expect(screen.getByText(t('callScreen.notApplied'))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('callScreen.use') })).toBeNull();
  expect(screen.queryByRole('button', { name: t('callScreen.keep') })).toBeNull();

  // The way back is the system header's (none drawn in the screen); the stack pops as the header's button would.
  expect(screen.queryByRole('button', { name: /^(‹ )?(Back|Progress)$/ })).toBeNull();
  await act(async () => jest.requireMock('expo-router').router.back());
  expect(mockStack).toEqual([{ pathname: '/progress' }]);
  expect(screen.queryByText(t('callScreen.notApplied'))).toBeNull();
  expect(screen.getByTestId('strength-best')).toHaveTextContent('60 kg × 10');
});
