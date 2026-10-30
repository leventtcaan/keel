/** The rest timer counts DOWN from the low end of the band (K-405, G1 K-49: 2 minutes; Evre 7 C2), every second. */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme/theme';
import { RestTimer } from '@/train/RestTimer';

beforeAll(() => jest.useFakeTimers({ now: new Date(2026, 9, 1, 18, 0, 0) }));
afterAll(() => jest.useRealTimers());

const show = (since: number, onAdjust?: (seconds: number) => void) =>
  render(
    <ThemeProvider>
      <RestTimer since={since} onEnd={() => undefined} onAdjust={onAdjust} />
    </ThemeProvider>,
  );

// K1: "counts up" became "counts down" (plan/evre-7-inceleme.md §17; ADR-090 Ek 7): the old expectation (1:24 rising to 1:25, "Rest · 2:00-3:00") is the opposite design.
test('it counts down from the band, second by second', async () => {
  await show(Date.now() - 84_000);
  expect(screen.getByText('0:36')).toBeTruthy();
  expect(screen.getByText('Rest')).toBeTruthy();
  await act(async () => jest.advanceTimersByTime(1000));
  expect(screen.getByText('0:35')).toBeTruthy();
});

test('15 seconds a tap either way, told to the background timer', async () => {
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

test('past its end it stops at 0:00 and says so calmly, never a negative time', async () => {
  await show(Date.now() - 200_000);
  expect(screen.getByText('0:00')).toBeTruthy();
  expect(screen.getByText('Go when you are ready')).toBeTruthy();
});
