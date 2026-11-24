/**
 * The rest timer counts DOWN from the low end of the band (K-405, G1 K-49: 2 minutes; Evre 7 C2), every second; it is the one big thing
 * on the rest screen (K-1207), felt in its last seconds and changed by a press and hold.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { FocusMode, ThemeProvider } from '@/theme/theme';
import { focusPalette } from '@/theme/tokens';
import { haptics } from '@/train/haptics';
import { workoutParams } from '@/train/params';
import { RestTimer } from '@/train/RestTimer';

beforeAll(() => jest.useFakeTimers({ now: new Date(2026, 9, 1, 18, 0, 0) }));
afterAll(() => jest.useRealTimers());

const show = (since: number, onAdjust?: (seconds: number) => void) =>
  render(
    <ThemeProvider>
      <FocusMode>
        <RestTimer since={since} onAdjust={onAdjust} />
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

// K1 (K-1207): was "15 seconds a tap either way" with a minus and a plus beside the clock; they are a press and hold on the clock now.
test('15 seconds either way is a press and hold on the clock, told to the background timer', async () => {
  const adjusted: number[] = [];
  await show(Date.now(), (s) => adjusted.push(s));
  expect(screen.getByText('2:00')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Rest 15 seconds longer' })).toBeNull();
  await fireEvent(screen.getByTestId('rest-clock'), 'longPress');
  await fireEvent.press(screen.getByRole('button', { name: 'Rest 15 seconds longer' }));
  expect(screen.getByText('2:15')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Rest 15 seconds shorter' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Rest 15 seconds shorter' }));
  expect(screen.getByText('1:45')).toBeTruthy();
  expect(adjusted).toEqual([15, 0, -15]);
});

test('a screen reader swipes the clock up or down by the same 15 seconds', async () => {
  const adjusted: number[] = [];
  await show(Date.now(), (s) => adjusted.push(s));
  await fireEvent(screen.getByTestId('rest-clock'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
  expect(screen.getByText('2:15')).toBeTruthy();
  await fireEvent(screen.getByTestId('rest-clock'), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
  expect(adjusted).toEqual([15, 0]);
});

test('past its end it stops at 0:00 and says so calmly, in the accent, never a negative time', async () => {
  await show(Date.now() - 200_000);
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
