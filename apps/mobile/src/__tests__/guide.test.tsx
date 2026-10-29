/**
 * The first-use guide (K-1065): shown once, right after the plan, on This week; a short walk (the call, today's workout, the "+",
 * the tabs), each step a line, tapped through, with Skip on every step; shown again only when Settings' "How it works" asks.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Text } from 'react-native';

import { t } from '@/copy';
import { GuideOverlay, type Measurable } from '@/guide/GuideOverlay';
import { GuideProvider, useGuide } from '@/guide/GuideProvider';
import { createGuideMark } from '@/guide/guide';
import { cardPlacement, clipped, holePath, tabBarRect } from '@/guide/steps';
import { ThemeProvider } from '@/theme/theme';

/** A kv store in memory. */
function store(start: Record<string, string> = {}) {
  const items = new Map(Object.entries(start));
  return {
    items,
    kv: {
      getItemAsync: async (key: string) => items.get(key) ?? null,
      setItemAsync: async (key: string, value: string) => void items.set(key, value),
      removeItemAsync: async (key: string) => void items.delete(key),
    },
  };
}

describe('the mark on the phone', () => {
  test('not shown yet; kept as it opens; forgotten at sign-out', async () => {
    const { items, kv } = store();
    const mark = createGuideMark({ kv });
    expect(await mark.seen()).toBe(false);
    await mark.markSeen();
    expect(items.get('guide.seen')).toBe('yes');
    expect(await mark.seen()).toBe(true);
    await mark.forget();
    expect(await mark.seen()).toBe(false);
  });

  test('a store that cannot be read counts as shown: the guide does not come back on every start', async () => {
    const kv = { getItemAsync: async () => Promise.reject(new Error('disk')), setItemAsync: async () => {}, removeItemAsync: async () => {} };
    expect(await createGuideMark({ kv }).seen()).toBe(true);
  });
});

const at = (x: number, y: number, width: number, height: number): { current: Measurable | null } => ({
  current: { measureInWindow: (done) => done(x, y, width, height) },
});
const absent = { current: null };

// The guide waits for a part to stop moving before it points at it (two reads that agree): time is the test's to give.
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
const flush = () =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(2000);
  });

// The test window is 750 × 1334 (React Native's default under Jest).
const TARGETS = {
  call: at(16, 120, 700, 200),
  workout: at(16, 340, 700, 300),
  plus: at(660, 1180, 54, 54),
};

/** Draws the overlay under a provider and lets a button open it the way This week does on arriving. */
function Arrive() {
  const guide = useGuide();
  useEffect(() => guide.arrive(), [guide.arrive]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Text testID="arrive" onPress={guide.arrive}>
      {guide.open ? 'open' : 'closed'}
    </Text>
  );
}
const settings = { askAgain: () => {} };
function Settings() {
  const { request } = useGuide();
  useEffect(() => {
    settings.askAgain = request;
  }, [request]);
  return null;
}

async function show(start: Record<string, string> = {}, targets: Parameters<typeof GuideOverlay>[0]['targets'] = TARGETS, lines?: Parameters<typeof GuideOverlay>[0]['lines']) {
  const kept = store(start);
  const mark = createGuideMark({ kv: kept.kv });
  const view = await render(
    <ThemeProvider>
      <GuideProvider mark={mark}>
        <Settings />
        <Arrive />
        <GuideOverlay targets={targets} {...(lines === undefined ? {} : { lines })} />
      </GuideProvider>
    </ThemeProvider>,
  );
  await flush();
  return { ...kept, view };
}

const step = (id: string) => screen.queryByTestId(`guide-step-${id}`);
const tap = async (name: string) => {
  await fireEvent.press(screen.getByRole('button', { name }));
  await flush();
};

test('the first time: opens on the call, and is kept as shown', async () => {
  const { items } = await show();
  expect(step('call')).toBeOnTheScreen();
  expect(screen.getByText(t('guide.call.title'))).toBeOnTheScreen();
  expect(screen.getByText(t('guide.call.body'))).toBeOnTheScreen();
  expect(screen.getByText(t('guide.step', { step: 1, total: 4 }))).toBeOnTheScreen();
  expect(items.get('guide.seen')).toBe('yes');
});

test('walks through the call, the workout, the "+" and the tabs; each a line; the last step ends it', async () => {
  await show();
  await tap(t('guide.next'));
  expect(step('workout')).toBeOnTheScreen();
  expect(screen.getByText(t('guide.workout.body'))).toBeOnTheScreen();
  await tap(t('guide.next'));
  expect(step('plus')).toBeOnTheScreen();
  await tap(t('guide.next'));
  expect(step('tabs')).toBeOnTheScreen();
  expect(screen.getByText(t('guide.step', { step: 4, total: 4 }))).toBeOnTheScreen();
  await tap(t('guide.done'));
  expect(step('tabs')).toBeNull();
  expect(screen.getByText('closed')).toBeOnTheScreen();
});

test("the workout step says the line the screen gives it (the card's state), the other steps their own (K-1066)", async () => {
  await show({}, TARGETS, { workout: t('guide.workout.first') });
  expect(screen.getByText(t('guide.call.body'))).toBeOnTheScreen();
  await tap(t('guide.next'));
  expect(screen.getByText(t('guide.workout.first'))).toBeOnTheScreen();
  expect(screen.queryByText(t('guide.workout.body'))).toBeNull();
});

test('a tap anywhere on the dim goes on', async () => {
  await show();
  // VoiceOver is held to the card (a modal view); the dim is for a finger.
  await fireEvent.press(screen.getByTestId('guide-backdrop', { includeHiddenElements: true }));
  await flush();
  expect(step('workout')).toBeOnTheScreen();
});

test('Skip is on every step and ends the guide at once', async () => {
  await show();
  for (const id of ['call', 'workout', 'plus']) {
    expect(step(id)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: t('guide.skipLabel') })).toBeOnTheScreen();
    await tap(t('guide.next'));
  }
  expect(screen.getByRole('button', { name: t('guide.skipLabel') })).toBeOnTheScreen();
  await tap(t('guide.skipLabel'));
  expect(screen.queryByTestId('guide-backdrop', { includeHiddenElements: true })).toBeNull();
  expect(screen.getByText('closed')).toBeOnTheScreen();
});

test('shown once: seen already, it does not open', async () => {
  await show({ 'guide.seen': 'yes' });
  expect(screen.queryByTestId('guide-backdrop', { includeHiddenElements: true })).toBeNull();
  expect(screen.getByText('closed')).toBeOnTheScreen();
});

test('asked for in Settings: it opens when This week comes into view again, though seen', async () => {
  await show({ 'guide.seen': 'yes' });
  // This week comes into view with nothing asked: nothing opens.
  await fireEvent.press(screen.getByTestId('arrive'));
  await flush();
  expect(screen.getByText('closed')).toBeOnTheScreen();
  // Settings asks, the screen is left, This week arrives again.
  await act(async () => settings.askAgain());
  await fireEvent.press(screen.getByTestId('arrive'));
  await flush();
  expect(step('call')).toBeOnTheScreen();
  // Asked once, shown once.
  await tap(t('guide.skipLabel'));
  await fireEvent.press(screen.getByTestId('arrive'));
  await flush();
  expect(screen.getByText('closed')).toBeOnTheScreen();
});

test('a part that is not on the screen is left out: no workout today, three steps', async () => {
  await show({}, { call: TARGETS.call, workout: absent, plus: TARGETS.plus });
  expect(screen.getByText(t('guide.step', { step: 1, total: 3 }))).toBeOnTheScreen();
  await tap(t('guide.next'));
  expect(step('plus')).toBeOnTheScreen();
  await tap(t('guide.next'));
  expect(step('tabs')).toBeOnTheScreen();
});

test('a part with no size to point at (not drawn) is skipped over', async () => {
  await show({}, { call: TARGETS.call, workout: at(0, 0, 0, 0), plus: TARGETS.plus });
  await tap(t('guide.next'));
  expect(step('plus')).toBeOnTheScreen();
});

describe('where the parts are', () => {
  const window = { width: 400, height: 800 };

  test('a block only partly in view is pointed at where it is seen; one out of view is none', () => {
    expect(clipped({ x: 10, y: 700, width: 380, height: 300 }, window, 100)).toBeNull();
    expect(clipped({ x: 10, y: 500, width: 380, height: 400 }, window, 100)).toEqual({ x: 10, y: 500, width: 380, height: 200 });
    expect(clipped({ x: -20, y: 100, width: 200, height: 50 }, window)).toEqual({ x: 0, y: 100, width: 180, height: 50 });
    expect(clipped({ x: 10, y: 900, width: 100, height: 50 }, window)).toBeNull();
  });

  test('the tab bar: the foot of the window, as high as its inset', () => {
    expect(tabBarRect(window, 83, 49)).toEqual({ x: 0, y: 717, width: 400, height: 83 });
    expect(tabBarRect(window, 0, 49)).toEqual({ x: 0, y: 751, width: 400, height: 49 });
  });

  test('the card goes under a part in the upper half and over one in the lower', () => {
    expect(cardPlacement({ x: 0, y: 100, width: 100, height: 100 }, window)).toBe('below');
    expect(cardPlacement({ x: 0, y: 600, width: 100, height: 100 }, window)).toBe('above');
  });

  test('the dim is the window with a rounded hole in it (even-odd)', () => {
    const d = holePath(20, 40, 100, 60, window, 16);
    expect(d.startsWith('M0 0H400V800H0Z')).toBe(true);
    expect(d).toContain('M36 40H104'); // the top edge, past the corner
    expect(d.endsWith('Z')).toBe(true);
    // A small part (the "+") is a circle: the radius is half its side.
    expect(holePath(0, 0, 20, 20, window, 16)).toContain('A10 10 0 0 1');
  });
});
