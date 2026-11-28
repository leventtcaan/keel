/**
 * CompareTests, the screen (K-602, 01 §15, prototype 4.2): the latest photo beside the past point the user picks — Day 1
 * by default, or the photo day before — in one pose, side by side or as a slide with a divide to drag (a VoiceOver swipe
 * moves it too). Two photo days, never "before" and "after". Both photos are read from the phone; nothing goes anywhere.
 */
import * as fs from 'fs';
import * as path from 'path';

import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

import CompareScreen from '@/app/compare';
import { t } from '@/copy';
import type { PhotoCheck } from '@/photos/library';
import { photoParams } from '@/photos/params';
import { ThemeProvider } from '@/theme/theme';

const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { back: () => mockBack(), push: (to: unknown) => mockPush(to) } }));

let mockChecks: PhotoCheck[] = [];
const mockServices = {
  photos: { checks: jest.fn(async () => mockChecks) },
  report: jest.fn(),
  api: { GET: jest.fn(), POST: jest.fn(), PUT: jest.fn(), PATCH: jest.fn(), DELETE: jest.fn() },
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));

const fetchSpy = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = fetchSpy;
  mockChecks = [day('2026-07-06'), day('2026-08-03', ['front']), day('2026-09-02'), day('2026-10-05')];
});
afterEach(() => {
  expect(fetchSpy).not.toHaveBeenCalled();
  for (const method of Object.values(mockServices.api)) expect(method).not.toHaveBeenCalled();
});

function day(takenOn: string, poses: ('front' | 'side')[] = ['front', 'side']): PhotoCheck {
  return { takenOn, photos: Object.fromEntries(poses.map((pose) => [pose, `file:///docs/${takenOn}-${pose}.jpg`])) };
}

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <CompareScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const press = async (name: string) => {
  await fireEvent.press(screen.getByRole('button', { name }));
  await act(async () => {});
};
const uri = (testID: string) => (screen.getByTestId(testID).props.source as { uri: string }).uri;

test('Day 1 beside the latest, front, side by side: each with its day, and the time between', async () => {
  await show();
  expect(uri('compare-past')).toBe('file:///docs/2026-07-06-front.jpg');
  expect(uri('compare-latest')).toBe('file:///docs/2026-10-05-front.jpg');
  expect(screen.getByText(t('compare.caption', { label: t('compare.day1'), date: 'Jul 6' }))).toBeOnTheScreen();
  expect(screen.getByText(t('compare.caption', { label: t('compare.latest'), date: 'Oct 5' }))).toBeOnTheScreen();
  expect(screen.getByText(t('compare.between.other', { count: 13 }))).toBeOnTheScreen();
  expect(screen.getByText(t('compare.onPhone'))).toBeOnTheScreen();
});

test('side by side, VoiceOver reads each photo by its caption: which one and its day (K-807)', async () => {
  await show();
  expect(screen.getByTestId('compare-past').props).toMatchObject({
    accessible: true,
    accessibilityRole: 'image',
    accessibilityLabel: t('compare.caption', { label: t('compare.day1'), date: 'Jul 6' }),
  });
  expect(screen.getByTestId('compare-latest').props).toMatchObject({
    accessible: true,
    accessibilityRole: 'image',
    accessibilityLabel: t('compare.caption', { label: t('compare.latest'), date: 'Oct 5' }),
  });
});

test('the past point is the user pick: the photo day before the latest', async () => {
  await show();
  await press(t('compare.earlier.other', { count: 5 }));
  expect(uri('compare-past')).toBe('file:///docs/2026-09-02-front.jpg');
  expect(screen.getByText(t('compare.caption', { label: t('compare.earlier.other', { count: 5 }), date: 'Sep 2' }))).toBeOnTheScreen();
  expect(screen.getByText(t('compare.between.other', { count: 5 }))).toBeOnTheScreen();
});

test('the other pose: the same two days, side; Day 1 picked again if the pick has no such pose', async () => {
  mockChecks = [day('2026-07-06'), day('2026-09-02', ['front']), day('2026-10-05')];
  await show();
  await press(t('compare.earlier.other', { count: 5 }));
  await press(t('compare.side'));
  expect(uri('compare-past')).toBe('file:///docs/2026-07-06-side.jpg');
  expect(uri('compare-latest')).toBe('file:///docs/2026-10-05-side.jpg');
  expect(screen.queryByRole('button', { name: t('compare.earlier.other', { count: 5 }) })).toBeNull();
});

const swipe = async (slider: ReturnType<typeof screen.getByRole>, actionName: 'increment' | 'decrement', times = 1) => {
  for (let i = 0; i < times; i += 1) await act(async () => fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName } }));
};
const touch = (slider: ReturnType<typeof screen.getByRole>, kind: 'responderGrant' | 'responderMove', x: number) =>
  act(async () => fireEvent(slider, kind, { nativeEvent: { locationX: x, touches: [] }, touchHistory: { touchBank: [] } }));
const layOut = (slider: ReturnType<typeof screen.getByRole>) =>
  act(async () => fireEvent(slider, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 400 } } }));

test('slide: the past photo on the left up to the divide, the latest on the right — the captions in the same order', async () => {
  await show();
  await press(t('compare.slide'));
  const divide = screen.getByTestId('compare-divide');
  expect(within(divide).getByTestId('compare-past').props.source).toEqual({ uri: 'file:///docs/2026-07-06-front.jpg' });
  expect(within(divide).queryByTestId('compare-latest')).toBeNull();
  expect(uri('compare-latest')).toBe('file:///docs/2026-10-05-front.jpg');
  const captions = screen.getAllByText(/ · /).map((caption) => caption.props.children);
  expect(captions).toEqual([
    t('compare.caption', { label: t('compare.day1'), date: 'Jul 6' }),
    t('compare.caption', { label: t('compare.latest'), date: 'Oct 5' }),
  ]);
});

test('slide: a swipe moves the divide by compare_slide_step, both ways, held within the frame', async () => {
  await show();
  await press(t('compare.slide'));
  const slider = screen.getByRole('adjustable', { name: t('compare.slider') });
  expect(slider.props.accessibilityActions).toEqual([{ name: 'increment' }, { name: 'decrement' }]);
  expect(slider).toHaveAccessibilityValue({ min: 0, max: 100, now: 50 });
  expect(screen.getByTestId('compare-divide')).toHaveStyle({ width: '50%' });
  await swipe(slider, 'increment');
  const step = Math.round(photoParams.compareSlideStep * 100);
  expect(slider).toHaveAccessibilityValue({ now: 50 + step });
  await swipe(slider, 'increment', 20);
  expect(slider).toHaveAccessibilityValue({ now: 100 });
  expect(screen.getByTestId('compare-divide')).toHaveStyle({ width: '100%' });
  await swipe(slider, 'decrement', 20);
  expect(slider).toHaveAccessibilityValue({ now: 0 });
  expect(screen.getByTestId('compare-divide')).toHaveStyle({ width: '0%' });
});

test('slide by dragging: the divide follows the finger from the first touch, to the nearest percent', async () => {
  await show();
  await press(t('compare.slide'));
  const slider = screen.getByRole('adjustable', { name: t('compare.slider') });
  await touch(slider, 'responderMove', 75); // before the frame is measured: nothing moves
  expect(slider).toHaveAccessibilityValue({ now: 50 });
  await layOut(slider);
  // The clipped photo keeps the frame's full width: cut, not squeezed.
  expect(screen.getByTestId('compare-past')).toHaveStyle({ width: 300 });
  await touch(slider, 'responderGrant', 240);
  expect(slider).toHaveAccessibilityValue({ now: 80 });
  await touch(slider, 'responderMove', 100);
  expect(slider).toHaveAccessibilityValue({ now: 33 });
  await touch(slider, 'responderMove', 200);
  expect(slider).toHaveAccessibilityValue({ now: 67 });
  // A drag that wanders diagonally keeps the divide; the page does not take the touch away.
  expect(slider.props.onResponderTerminationRequest()).toBe(false);
});

test('a gap under a week in days, one week as one', async () => {
  mockChecks = [day('2026-10-04'), day('2026-10-05')];
  await show();
  expect(screen.getByText(t('compare.between.days.one', { count: 1 }))).toBeOnTheScreen();
  mockChecks = [day('2026-09-28'), day('2026-10-05')];
  await show();
  expect(screen.getByText(t('compare.between.one', { count: 1 }))).toBeOnTheScreen();
});

test('the chips show what is picked: the anchor, the mode, the pose', async () => {
  mockChecks = [day('2026-07-06'), day('2026-09-02', ['front']), day('2026-10-05')];
  await show();
  const selected = (name: string) => screen.getByRole('button', { name }).props.accessibilityState?.selected;
  expect(selected(t('compare.day1'))).toBe(true);
  expect(selected(t('compare.front'))).toBe(true);
  expect(selected(t('compare.sideBySide'))).toBe(true);
  await press(t('compare.earlier.other', { count: 5 }));
  await press(t('compare.side'));
  // The pick has no side photo: Day 1 is shown, and shown as picked.
  expect(selected(t('compare.day1'))).toBe(true);
  expect(selected(t('compare.side'))).toBe(true);
  await press(t('compare.slide'));
  expect(selected(t('compare.slide'))).toBe(true);
  expect(selected(t('compare.sideBySide'))).toBe(false);
});

test('Close goes back', async () => {
  await show();
  await press(t('compare.close'));
  expect(mockBack).toHaveBeenCalledTimes(1);
});

test('while the photos are read: no "empty" sentence yet', async () => {
  mockServices.photos.checks.mockImplementationOnce(() => new Promise(() => {}));
  await show();
  expect(screen.queryByText(t('compare.empty'))).toBeNull();
});

test('one photo day of a pose: a sentence, no photos', async () => {
  mockChecks = [day('2026-07-06')];
  await show();
  expect(screen.getByText(t('compare.empty'))).toBeOnTheScreen();
  expect(screen.queryByTestId('compare-latest')).toBeNull();
});

test('a folder that cannot be read: reported by name, the empty sentence', async () => {
  mockServices.photos.checks.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'FileSystemError' }));
  await show();
  expect(mockServices.report).toHaveBeenCalledWith({ name: 'FileSystemError' });
  expect(screen.getByText(t('compare.empty'))).toBeOnTheScreen();
});

test('no "before" or "after" anywhere in its words, nor in the way to it', () => {
  const copy = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../../data/copy/en.json'), 'utf8')) as {
    compare: object;
    photos: { compare: string };
  };
  expect(JSON.stringify(copy.compare)).not.toMatch(/\b(before|after)\b/i);
  expect(copy.photos.compare).not.toMatch(/\b(before|after)\b/i);
});

describe('every day, any two days and the timeline (K-1261, ADR-096: seeing free, picking and playing with a subscription)', () => {
  const subscription = (active: boolean | 'unread') =>
    mockServices.api.GET.mockImplementation(async () =>
      active === 'unread' ? { error: { code: 'X' }, response: { status: 500 } } : { data: { active }, response: { status: 200 } },
    );
  /** The only request the screen may make: the subscription, with nothing of the photos (V1). Cleared so the check after each test holds. */
  const askedOnlyTheSubscription = () => {
    expect(mockServices.api.GET.mock.calls).toEqual([['/v1/subscription']]);
    mockServices.api.GET.mockClear();
  };
  const dayButton = (date: string) => screen.getByRole('button', { name: t('compare.dayPhoto', { date }) });

  test('every photo day of the pose is there to see, one tap shows it large: free, the server not asked', async () => {
    await show();
    for (const date of ['Jul 6', 'Aug 3', 'Sep 2', 'Oct 5']) expect(dayButton(date)).toBeOnTheScreen();
    await fireEvent.press(dayButton('Aug 3'));
    await act(async () => {});
    expect(uri('compare-one')).toBe('file:///docs/2026-08-03-front.jpg');
    // Day 1 beside the latest stays as it was (free, aynen).
    expect(uri('compare-past')).toBe('file:///docs/2026-07-06-front.jpg');
    expect(screen.queryByText(t('compare.locked'))).toBeNull();
  });

  test('without a subscription, any two days shows the sand lock and "See plans"; the comparison stays', async () => {
    subscription(false);
    await show();
    await press(t('compare.pickTwo'));
    expect(screen.getByText(t('compare.locked'))).toBeOnTheScreen();
    await press(t('subscription.seePlans'));
    expect(mockPush).toHaveBeenCalledWith('/paywall');
    expect(uri('compare-past')).toBe('file:///docs/2026-07-06-front.jpg');
    askedOnlyTheSubscription();
  });

  test('without a subscription, the timeline shows the same lock', async () => {
    subscription(false);
    await show();
    await press(t('compare.play'));
    expect(screen.getByText(t('compare.locked'))).toBeOnTheScreen();
    expect(screen.queryByTestId('compare-one')).toBeNull();
    askedOnlyTheSubscription();
  });

  test('with a subscription, the two days tapped are side by side, the earlier on the left, in either order', async () => {
    subscription(true);
    await show();
    await press(t('compare.pickTwo'));
    expect(screen.getByText(t('compare.pickHint'))).toBeOnTheScreen();
    await press(t('compare.dayPhoto', { date: 'Sep 2' }));
    await press(t('compare.dayPhoto', { date: 'Aug 3' }));
    expect(uri('compare-past')).toBe('file:///docs/2026-08-03-front.jpg');
    expect(uri('compare-latest')).toBe('file:///docs/2026-09-02-front.jpg');
    expect(screen.getByText(t('compare.caption', { label: t('compare.later'), date: 'Sep 2' }))).toBeOnTheScreen();
    expect(screen.getByText(t('compare.between.other', { count: 4 }))).toBeOnTheScreen();
    expect(screen.queryByText(t('compare.locked'))).toBeNull();
    // Day 1 again: back to the free comparison.
    await press(t('compare.day1'));
    expect(uri('compare-latest')).toBe('file:///docs/2026-10-05-front.jpg');
    askedOnlyTheSubscription();
  });

  test('with a subscription, the timeline plays every day of the pose in order, compare_timeline_frame_ms each, and stops', async () => {
    subscription(true);
    await show();
    // The subscription read first, on real timers (a pick); the timeline then opens at once.
    await press(t('compare.pickTwo'));
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    try {
      await press(t('compare.play'));
      expect(uri('compare-one')).toBe('file:///docs/2026-07-06-front.jpg');
      await act(async () => jest.advanceTimersByTime(photoParams.timelineFrameMs));
      expect(uri('compare-one')).toBe('file:///docs/2026-08-03-front.jpg');
      await act(async () => jest.advanceTimersByTime(photoParams.timelineFrameMs));
      expect(uri('compare-one')).toBe('file:///docs/2026-09-02-front.jpg');
      await press(t('compare.stop'));
      await act(async () => jest.advanceTimersByTime(photoParams.timelineFrameMs * 3));
      expect(uri('compare-one')).toBe('file:///docs/2026-09-02-front.jpg');
      askedOnlyTheSubscription();
    } finally {
      jest.useRealTimers();
    }
  });

  test('locked, then back from the paywall with a subscription: the next tap reads it again and the part opens', async () => {
    subscription(false);
    await show();
    await press(t('compare.pickTwo'));
    expect(screen.getByText(t('compare.locked'))).toBeOnTheScreen();
    subscription(true);
    await press(t('compare.pickTwo'));
    expect(screen.queryByText(t('compare.locked'))).toBeNull();
    expect(screen.getByText(t('compare.pickHint'))).toBeOnTheScreen();
    expect(mockServices.api.GET.mock.calls).toEqual([['/v1/subscription'], ['/v1/subscription']]);
    mockServices.api.GET.mockClear();
  });

  test('a subscription that cannot be read is no lock: it says so, and the free comparison stays', async () => {
    subscription('unread');
    await show();
    await press(t('compare.pickTwo'));
    expect(screen.getByText(t('compare.unread'))).toBeOnTheScreen();
    expect(screen.queryByText(t('compare.locked'))).toBeNull();
    expect(uri('compare-past')).toBe('file:///docs/2026-07-06-front.jpg');
    askedOnlyTheSubscription();
  });
});
