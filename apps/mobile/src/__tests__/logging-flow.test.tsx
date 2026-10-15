/**
 * The logging flows, walked tap by tap (K-980; prototype/akis-testi.md A2: "+ → weigh-in → Apple Health, just in time →
 * This week"). ADR-018 Ek 1 sets the count: a weigh-in in four taps at most, the first one included, with Apple Health
 * asked on the way. The screens are the real ones; only the navigator and the services are stand-ins.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useEffect, useState } from 'react';

import PlusScreen from '@/app/plus';
import WeighInScreen from '@/app/weigh-in';
import { PlusEntry } from '@/components/PlusEntry';
import { t } from '@/copy';
import { createHealthAsk } from '@/health/justInTime';
import { ThemeProvider } from '@/theme/theme';

const ok = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) });

// A navigator in a few lines: the stack of screens, the top one drawn.
let mockStack: string[] = [];
let mockSetStack: (next: (stack: string[]) => string[]) => void = () => {};
const mockRouter = {
  push: (path: string) => mockSetStack((stack) => [...stack, path]),
  replace: (path: string) => mockSetStack((stack) => [...stack.slice(0, -1), path]),
  back: () => mockSetStack((stack) => stack.slice(0, -1)),
  dismissTo: (_path: string) => mockSetStack(() => ['/']),
};
jest.mock('expo-router', () => ({
  router: {
    push: (p: string) => mockRouter.push(p),
    replace: (p: string) => mockRouter.replace(p),
    back: () => mockRouter.back(),
    dismissTo: (p: string) => mockRouter.dismissTo(p),
  },
  useRouter: () => mockRouter,
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(() => effect(), [effect]);
  },
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));

const kept = new Map<string, string>();
const requestRead = jest.fn(async () => {});
const mockServices = {
  api: {
    GET: jest.fn(async (path: string, _init?: unknown) =>
      path === '/v1/weigh-ins/summary'
        ? ok({ last: { id: 'w0', clientId: 'w0', measuredAt: '2026-10-14T05:00:00Z', kg: 80.4, source: 'MANUAL' }, weighInCount: 3, trendMinWeighIns: 7, trendReady: false })
        : { error: { code: 'NOT_FOUND', message: 'x' }, response: new Response(null, { status: 404 }) },
    ),
    PUT: jest.fn(async (_path: string, _init?: unknown) => ok({ status: 'GRANTED' })),
    DELETE: jest.fn(),
  },
  queue: { record: jest.fn(async (_record: unknown) => true) },
  training: { read: jest.fn(async () => ({ program: { state: 'none' as const }, exercises: { state: 'none' as const }, kept: false })) },
  workoutRecords: async () => [],
  takeBack: jest.fn(),
  consents: { granted: async (kind: string) => kind === 'HEALTH_DATA', remember: jest.fn(async () => {}) },
  health: { available: true, requestRead },
  healthAsk: createHealthAsk({
    kv: {
      getItemAsync: async (key: string) => kept.get(key) ?? null,
      setItemAsync: async (key: string, value: string) => void kept.set(key, value),
      removeItemAsync: async (key: string) => void kept.delete(key),
    },
  }),
  healthWriting: { weighInSaved: jest.fn(async () => {}), shown: jest.fn(() => 'off') },
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => 'METRIC' }));

function Harness() {
  const [stack, setStack] = useState<string[]>(['/']);
  useEffect(() => {
    mockStack = stack;
    mockSetStack = (next) => setStack(next);
  });
  const top = stack[stack.length - 1];
  return (
    <ThemeProvider scheme="light">
      {top === '/plus' ? <PlusScreen /> : top === '/weigh-in' ? <WeighInScreen /> : <PlusEntry />}
    </ThemeProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  kept.clear();
});

let taps = 0;
/** One tap on a control, counted. */
const tap = async (name: string | RegExp) => {
  taps += 1;
  await fireEvent.press(screen.getByRole('button', { name }));
  await act(async () => {});
};
const show = async () => {
  taps = 0;
  await render(<Harness />);
  await act(async () => {});
};

test('A2: "+" → Weigh-in → Save → Apple Health, asked on the way → back on the page it began from, in four taps', async () => {
  await show();

  await tap(t('plus.entry')); // 1 · the "+"
  await tap(new RegExp(`^${t('plus.weighIn')}`)); // 2 · the weigh-in
  expect(mockStack).toEqual(['/', '/weigh-in']); // the sheet gave way to it
  await tap(t('weighIn.save')); // 3 · the last weight was filled in
  expect(mockServices.queue.record).toHaveBeenCalledWith(expect.objectContaining({ kind: 'weighIn', body: expect.objectContaining({ kg: 80.4 }) }));
  await tap(t('health.jit.continue')); // 4 · Apple's sheet, just in time

  expect(requestRead).toHaveBeenCalled();
  expect(taps).toBeLessThanOrEqual(4);
  // Done is the way out, not a step of logging: the weigh-in is kept and Apple Health asked before it.
  await tap(t('weighIn.done'));
  expect(mockStack).toEqual(['/']);
});

test('the next weigh-in is three taps: Apple Health is not asked twice', async () => {
  kept.set('health.asked', '1');
  await show();

  await tap(t('plus.entry'));
  await tap(new RegExp(`^${t('plus.weighIn')}`));
  await tap(t('weighIn.save'));

  expect(mockServices.queue.record).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('header', { name: t('health.jit.title') })).toBeNull();
  expect(taps).toBe(3);
});

test('the sheet names every way to log, each one tap from the "+"', async () => {
  await show();
  await tap(t('plus.entry'));
  for (const key of ['plus.weighIn', 'plus.meal', 'plus.workout', 'plus.life']) {
    expect(screen.getByRole('button', { name: new RegExp(t(key)) })).toBeOnTheScreen();
  }
});
