/**
 * The logging flows, walked tap by tap (K-980; prototip/akis-testi.md A2: "+ → weigh-in → Apple Health, just in time →
 * This week; add a meal"). ADR-018 Ek 1 sets the count: a weigh-in in four taps at most, the first one included, with Apple
 * Health asked on the way, and a meal in two or three. A save closes its sheet and the app's one banner confirms it (K-1044,
 * ADR-070 Ek 2 #6): no Done to tap after a save. The screens are the real ones; only the navigator and the services are
 * stand-ins.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useEffect, useState } from 'react';

import CardioScreen from '@/app/cardio';
import MealScreen from '@/app/meal';
import PlusScreen from '@/app/plus';
import WeighInScreen from '@/app/weigh-in';
import { PlusEntry } from '@/components/PlusEntry';
import { t } from '@/copy';
import { createHealthAsk } from '@/health/justInTime';
import { ThemeProvider } from '@/theme/theme';

import { WithSaved, banner } from './support/saved';

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
  useLocalSearchParams: () => ({}),
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(() => effect(), [effect]);
  },
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));

// Yesterday's lunch, the one "Same as yesterday" offers at lunch time (13:00 below).
const YESTERDAY_LUNCH = {
  id: 'm-lunch',
  clientId: 'c-lunch',
  eatenAt: '2026-10-14T10:10:00Z',
  slot: 'LUNCH',
  items: [{ foodId: 'f1', name: 'Chicken rice bowl', amount: { quantity: 1, unit: 'bowl' }, kcal: { low: 610, high: 720 }, proteinG: { low: 40, high: 50 } }],
  kcal: { low: 610, high: 720 },
  proteinG: { low: 40, high: 50 },
};
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
  mealStart: jest.fn(async (_day: string) => ({ offers: [YESTERDAY_LUNCH] as never[] })),
  recentFoods: jest.fn(async (_slot: string) => [] as never[]),
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
      <WithSaved>
        {top === '/plus' ? (
          <PlusScreen />
        ) : top === '/weigh-in' ? (
          <WeighInScreen />
        ) : top === '/meal' ? (
          <MealScreen />
        ) : top === '/cardio' ? (
          <CardioScreen />
        ) : (
          <PlusEntry />
        )}
      </WithSaved>
    </ThemeProvider>
  );
}

beforeAll(() => {
  // Thursday 15 Oct 2026, 13:00 on the phone: lunch.
  jest.useFakeTimers({
    now: new Date(2026, 9, 15, 13, 0),
    doNotFake: [
      'hrtime',
      'nextTick',
      'performance',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
    ],
  });
});
afterAll(() => jest.useRealTimers());

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

test('A2: "+" → Weigh-in → Apple Health, asked on the way → Save → back on the page it began from with "Saved · Undo", in four taps', async () => {
  await show();

  await tap(t('plus.entry')); // 1 · the "+"
  await tap(new RegExp(`^${t('plus.weighIn')}`)); // 2 · the weigh-in
  expect(mockStack).toEqual(['/', '/weigh-in']); // the sheet gave way to it
  await tap(t('health.jit.continue')); // 3 · Apple's sheet, just in time (under the entry now: no Saved page to put it under)
  expect(requestRead).toHaveBeenCalled();
  await tap(t('weighIn.save')); // 4 · the last weight was filled in
  expect(mockServices.queue.record).toHaveBeenCalledWith(expect.objectContaining({ kind: 'weighIn', body: expect.objectContaining({ kg: 80.4 }) }));

  expect(taps).toBeLessThanOrEqual(4);
  // The sheet closed by itself: the page it began from, and the banner on it. No Done to tap.
  expect(mockStack).toEqual(['/']);
  expect(screen.getByText(t('undoBanner.saved'))).toBeOnTheScreen();
  expect(screen.getByText(t('units.kg', { value: '80.4' }))).toBeOnTheScreen();

  // ... and then a meal, from the same page (A2's last step).
  taps = 0;
  await tap(t('plus.entry'));
  await tap(new RegExp(`^${t('plus.meal')}`));
  await tap(t('food.repeat.spoken', { slot: t('food.slot.LUNCH'), items: 'Chicken rice bowl' }));
  expect(mockServices.queue.record).toHaveBeenLastCalledWith({
    kind: 'meal',
    body: expect.objectContaining({ slot: 'LUNCH', repeatOf: 'm-lunch' }),
  });
  expect(taps).toBe(3);
  // The meal closes the sheet too, and its banner replaces the weigh-in's: one confirmation at a time.
  expect(mockStack).toEqual(['/']);
  expect(screen.getAllByTestId('undo-banner')).toHaveLength(1);
  expect(screen.getByText(t('meal.saved.one', { slot: t('food.slot.LUNCH') }))).toBeOnTheScreen();
  expect(screen.queryByText(t('units.kg', { value: '80.4' }))).toBeNull();
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
  expect(banner()).toBeOnTheScreen();
});

test('the sheet names every way to log, each one tap from the "+"', async () => {
  await show();
  await tap(t('plus.entry'));
  for (const key of ['plus.weighIn', 'plus.meal', 'plus.workout', 'plus.life']) {
    expect(screen.getByRole('button', { name: new RegExp(t(key)) })).toBeOnTheScreen();
  }
});

test('a meal: "+", Meal, "Same as yesterday" Add — three taps, the sheet closes on its own and the banner offers Undo', async () => {
  await show();
  await tap(t('plus.entry'));
  await tap(new RegExp(`^${t('plus.meal')}`));
  expect(mockStack).toEqual(['/', '/meal']);
  await tap(t('food.repeat.spoken', { slot: t('food.slot.LUNCH'), items: 'Chicken rice bowl' }));

  expect(mockServices.queue.record).toHaveBeenCalledWith({ kind: 'meal', body: expect.objectContaining({ repeatOf: 'm-lunch', slot: 'LUNCH' }) });
  expect(taps).toBeLessThanOrEqual(3);
  // Saved, with Undo (K-1029, K-1044): the page it began from, and the banner on it.
  expect(mockStack).toEqual(['/']);
  expect(screen.getByText(t('meal.saved.one', { slot: t('food.slot.LUNCH') }))).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: t('undoBanner.undo') })).toBeOnTheScreen();
});

test('cardio: "+", Cardio, Log — three taps, the sheet closes with the banner; opened again the same day it shows the record instead of asking', async () => {
  const records: unknown[] = [];
  mockServices.queue.record.mockImplementation(async (record: unknown) => {
    records.push(record);
    return true;
  });
  mockServices.workoutRecords = async () =>
    records.map((r, i) => ({ seq: i, clientId: (r as { body: { clientId: string } }).body.clientId, kind: 'cardio', parentClientId: null, body: (r as { body: unknown }).body, state: 'PENDING', serverId: null, serverBody: null, errorCode: null })) as never;
  await show();

  await tap(t('plus.entry'));
  await tap(t('plus.cardio'));
  expect(mockStack).toEqual(['/', '/cardio']);
  await tap(t('cardioLog.log'));
  expect(taps).toBe(3);
  expect(records).toHaveLength(1);
  expect(mockStack).toEqual(['/']);
  expect(screen.getByText(t('cardioLog.savedDetail', { minutes: 30 }))).toBeOnTheScreen();

  await tap(t('plus.entry'));
  await tap(t('plus.cardio'));
  expect(screen.getByText(t('workout.cardio.loggedSaid', { minutes: 30 }))).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: t('cardioLog.log') })).toBeNull();
});
