/** The rest timer counts up from the last set, every second (K-405; the band is G1 K-49's 2-3 minutes). */
import { act, render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme/theme';
import { RestTimer } from '@/train/RestTimer';

beforeAll(() => jest.useFakeTimers({ now: new Date(2026, 9, 1, 18, 0, 0) }));
afterAll(() => jest.useRealTimers());

test('it counts up from the last set, second by second', async () => {
  await render(
    <ThemeProvider>
      <RestTimer since={Date.now() - 84_000} />
    </ThemeProvider>,
  );
  expect(screen.getByText('1:24')).toBeTruthy();
  expect(screen.getByText('Rest · 2:00-3:00')).toBeTruthy();
  await act(async () => jest.advanceTimersByTime(1000));
  expect(screen.getByText('1:25')).toBeTruthy();
});
