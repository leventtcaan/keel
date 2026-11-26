/**
 * The rest timer counts DOWN from the low end of the band (K-405, G1 K-49: 2 minutes; Evre 7 C2), every second; it is the one big thing
 * on the rest screen (K-1207), felt in its last seconds and changed by a press and hold.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

import { t } from '@/copy';
import { FocusMode, ThemeProvider } from '@/theme/theme';
import { focusPalette } from '@/theme/tokens';
import { haptics } from '@/train/haptics';
import { workoutParams } from '@/train/params';
import { type RestBand, recommendedBand } from '@/train/restBand';
import { RestTimer } from '@/train/RestTimer';

beforeAll(() => jest.useFakeTimers({ now: new Date(2026, 9, 1, 18, 0, 0) }));
afterAll(() => jest.useRealTimers());

const show = (since: number, onAdjust?: (seconds: number) => void, band: RestBand = recommendedBand()) =>
  render(
    <ThemeProvider>
      <FocusMode>
        <RestTimer since={since} band={band} onAdjust={onAdjust} />
      </FocusMode>
    </ThemeProvider>,
  );

// K1: "counts up" became "counts down" (plan/evre-7-inceleme.md §17; ADR-090 Ek 7): the old expectation (1:24 rising to 1:25, "Rest · 2:00-3:00") is the opposite design.
// K1 (K-1207): the "Rest" label under the clock is gone (the clock says it); the clock is spoken as "Rest" with its time as the value.
test('it counts down from the band, second by second', async () => {
  await show(Date.now() - 84_000);
  expect(screen.getByText('0:36')).toBeTruthy();
  expect(screen.queryByText('Rest')).toBeNull();
  expect(screen.getByTestId('rest-clock').props.accessibilityLabel).toBe('Rest');
  expect(screen.getByTestId('rest-clock').props.accessibilityValue).toEqual({ text: '0:36' });
  await act(async () => jest.advanceTimersByTime(1000));
  expect(screen.getByText('0:35')).toBeTruthy();
});

// K1 (K-1207): the minus and plus beside the clock stay (a tap), and a press and hold on the clock opens the same two rows.
test('15 seconds either way is a tap beside the clock, told to the background timer', async () => {
  const adjusted: number[] = [];
  await show(Date.now(), (s) => adjusted.push(s));
  expect(screen.getByText('2:00')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Rest 15 seconds longer' }));
  expect(screen.getByText('2:15')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Rest 15 seconds shorter' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Rest 15 seconds shorter' }));
  expect(screen.getByText('1:45')).toBeTruthy();
  expect(adjusted).toEqual([15, 0, -15]);
});

test('a press and hold on the clock opens the same two rows', async () => {
  const adjusted: number[] = [];
  await show(Date.now(), (s) => adjusted.push(s));
  await fireEvent(screen.getByTestId('rest-clock'), 'longPress');
  const sheet = within(screen.getByTestId('rest-adjust'));
  await fireEvent.press(sheet.getByRole('button', { name: 'Rest 15 seconds longer' }));
  expect(adjusted).toEqual([15]);
  expect(screen.getByText('2:15')).toBeTruthy();
});

test('a screen reader swipes the clock up or down by the same 15 seconds', async () => {
  const adjusted: number[] = [];
  await show(Date.now(), (s) => adjusted.push(s));
  await fireEvent(screen.getByTestId('rest-clock'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
  expect(screen.getByText('2:15')).toBeTruthy();
  await fireEvent(screen.getByTestId('rest-clock'), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
  expect(adjusted).toEqual([15, 0]);
});

// K1 (K-1214): 200 s is past the band's upper end now (3:00), which has its own line; the same check at 150 s, between the band's ends.
test('past its end it stops at 0:00 and says so calmly, in the accent, never a negative time', async () => {
  await show(Date.now() - 150_000);
  expect(screen.getByText('0:00')).toBeTruthy();
  expect(screen.getByText('0:00')).toHaveStyle({ color: focusPalette.accent });
  expect(screen.getByText('Go when you are ready')).toBeTruthy();
});

describe('felt in its last seconds (K-1207)', () => {
  test('a light tick on each of the last seconds, a stronger one at zero, each once', async () => {
    const tick = jest.spyOn(haptics, 'restTick').mockImplementation(() => undefined);
    const end = jest.spyOn(haptics, 'restEnd').mockImplementation(() => undefined);
    try {
      const last = workoutParams.restTickLastSeconds;
      await show(Date.now() - (workoutParams.restSecondsMin - last - 1) * 1000);
      expect(tick).not.toHaveBeenCalled();
      await act(async () => jest.advanceTimersByTime(1000));
      expect(tick).toHaveBeenCalledTimes(1); // `last` seconds left
      // A second at a time, as the clock arrives: each of the last seconds is felt on its own.
      for (let second = 2; second <= last; second++) {
        await act(async () => jest.advanceTimersByTime(1000));
        expect(tick).toHaveBeenCalledTimes(second);
      }
      expect(end).not.toHaveBeenCalled();
      await act(async () => jest.advanceTimersByTime(1000));
      expect(end).toHaveBeenCalledTimes(1);
      await act(async () => jest.advanceTimersByTime(10_000));
      expect(end).toHaveBeenCalledTimes(1);
      expect(tick).toHaveBeenCalledTimes(last);
    } finally {
      tick.mockRestore();
      end.mockRestore();
    }
  });

  test('a rest that is long over when it is shown (the app was away) is not felt at all', async () => {
    const tick = jest.spyOn(haptics, 'restTick').mockImplementation(() => undefined);
    const end = jest.spyOn(haptics, 'restEnd').mockImplementation(() => undefined);
    try {
      await show(Date.now() - 400_000);
      await act(async () => jest.advanceTimersByTime(3000));
      expect(tick).not.toHaveBeenCalled();
      expect(end).not.toHaveBeenCalled();
    } finally {
      tick.mockRestore();
      end.mockRestore();
    }
  });
});

// K-1214: the band is said quietly under the clock while it counts; past its upper end the clock says so, with no word of blame.
test('the band 2-3 min is under the clock while it counts; at the low end the line is "go when you are ready"; past the high end it names it', async () => {
  await show(Date.now() - 30_000);
  // K1 (K-1238, ADR-094 Ek 2): "Suggested 2-3 min".
  expect(screen.getByTestId('rest-band')).toHaveTextContent(t('workout.rest.suggested', { band: '2-3 min' }));
  await act(async () => jest.advanceTimersByTime(95_000)); // 2:05 in
  expect(screen.queryByTestId('rest-band')).toBeNull();
  expect(screen.getByText('Go when you are ready')).toBeTruthy();
  await act(async () => jest.advanceTimersByTime(60_000)); // 3:05 in
  expect(screen.getByText('Past 3:00. Go when you are ready')).toBeTruthy();
  expect(screen.getByText('0:00')).toBeTruthy();
});

test("the user's own value counts down from it and shows no band, so there is no past", async () => {
  await show(Date.now() - 30_000, undefined, { low: 90, high: null });
  expect(screen.getByText('1:00')).toBeTruthy();
  expect(screen.queryByTestId('rest-band')).toBeNull();
  await act(async () => jest.advanceTimersByTime(400_000));
  expect(screen.getByText('Go when you are ready')).toBeTruthy();
  expect(screen.queryByText(/^Past/)).toBeNull();
});

test('the 15 s change moves the band with the clock', async () => {
  await show(Date.now(), undefined);
  await fireEvent.press(screen.getByRole('button', { name: 'Rest 15 seconds longer' }));
  expect(screen.getByText('2:15')).toBeTruthy();
  expect(screen.getByTestId('rest-band')).toHaveTextContent(t('workout.rest.suggested', { band: '2:15-3:15' }));
});
