/**
 * The scroll wheel #ob-about uses for height, weight and year (prototype `.wheel`): a column that snaps to a row, the row
 * in the middle the value. VoiceOver reaches it as one adjustable control: swipe up and down to step.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { FlatList } from 'react-native';

import { t } from '@/copy';
import { Wheel } from '@/onboarding/Wheel';
import { ThemeProvider } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

const YEARS = [1990, 1991, 1992, 1993, 1994, 1995];
const changes: number[] = [];

function Harness({ start = 1992, unset = false }: { start?: number; unset?: boolean }) {
  const [value, setValue] = useState(start);
  return (
    <Wheel
      label="Born"
      unit="year"
      values={YEARS}
      value={value}
      unset={unset}
      format={String}
      onChange={(next) => {
        changes.push(next);
        setValue(next);
      }}
    />
  );
}

async function show(props: { start?: number; unset?: boolean } = {}) {
  await render(
    <ThemeProvider scheme="light">
      <Harness {...props} />
    </ThemeProvider>,
  );
}

const wheel = () => screen.getByRole('adjustable', { name: 'Born' });
const act = async (actionName: 'increment' | 'decrement') =>
  fireEvent(wheel(), 'accessibilityAction', { nativeEvent: { actionName } });

beforeEach(() => {
  changes.length = 0;
});

test('one adjustable control: its name, and its value with the unit', async () => {
  await show();
  expect(wheel().props.accessibilityValue).toEqual({ text: '1992 year' });
  expect(wheel().props.accessibilityActions).toEqual([{ name: 'increment' }, { name: 'decrement' }]);
});

test('swiping up and down steps one row each way, never past the last row', async () => {
  await show({ start: 1994 });
  await act('increment');
  expect(changes).toEqual([1995]);
  await act('increment');
  expect(changes).toEqual([1995]); // the last row: nothing further
  await act('decrement');
  expect(wheel().props.accessibilityValue).toEqual({ text: '1994 year' });
});

test('nor before the first row', async () => {
  await show({ start: 1990 });
  await act('decrement');
  expect(changes).toEqual([]);
});

test('a scroll that comes to rest picks the row in the middle, the nearest one if it stops between two', async () => {
  await show();
  const column = screen.getByTestId('wheel-Born');
  await fireEvent(column, 'momentumScrollEnd', { nativeEvent: { contentOffset: { y: tokens.size.touch * 4 } } });
  expect(changes).toEqual([1994]);
  await fireEvent(column, 'scrollEndDrag', { nativeEvent: { contentOffset: { y: tokens.size.touch * 0.4 } } });
  expect(changes).toEqual([1994, 1990]);
  await fireEvent(column, 'momentumScrollEnd', { nativeEvent: { contentOffset: { y: tokens.size.touch * 40 } } });
  expect(changes).toEqual([1994, 1990, 1995]); // past the end: the last row
});

test('coming to rest on the row it shows changes nothing', async () => {
  await show();
  await fireEvent(screen.getByTestId('wheel-Born'), 'momentumScrollEnd', { nativeEvent: { contentOffset: { y: tokens.size.touch * 2 } } });
  expect(changes).toEqual([]);
});

test('not set yet, the middle row is a suggestion: one step sets it', async () => {
  await show({ unset: true });
  await act('increment');
  expect(changes).toEqual([1993]);
});

test('not set yet, coming to rest on the suggested row sets it: the person looked and kept it', async () => {
  await show({ unset: true });
  await fireEvent(screen.getByTestId('wheel-Born'), 'momentumScrollEnd', { nativeEvent: { contentOffset: { y: tokens.size.touch * 2 } } });
  expect(changes).toEqual([1992]);
});

describe('a fling coasts to its own row (review #463)', () => {
  const column = () => screen.getByTestId('wheel-Born');
  const offset = (rows: number) => ({ contentOffset: { y: tokens.size.touch * rows } });

  test('lifted with speed, nothing is picked at the lift: the row it comes to rest on is', async () => {
    await show();
    await fireEvent(column(), 'scrollEndDrag', { nativeEvent: { ...offset(3), velocity: { x: 0, y: 1.8 } } });
    expect(changes).toEqual([]);
    await fireEvent(column(), 'momentumScrollEnd', { nativeEvent: offset(5) });
    expect(changes).toEqual([1995]);
  });

  test('lifted still, with nothing to coast, the row under the finger is picked', async () => {
    await show();
    await fireEvent(column(), 'scrollEndDrag', { nativeEvent: { ...offset(3), velocity: { x: 0, y: 0 } } });
    expect(changes).toEqual([1993]);
  });

  test('a row picked by the column itself is not scrolled to again; a step from VoiceOver moves the column', async () => {
    const scrolls = jest.spyOn(FlatList.prototype, 'scrollToOffset');
    try {
      await show();
      scrolls.mockClear();
      await fireEvent(column(), 'momentumScrollEnd', { nativeEvent: offset(4) });
      expect(changes).toEqual([1994]);
      expect(scrolls).not.toHaveBeenCalled();
      await act('decrement');
      expect(scrolls).toHaveBeenCalledWith({ offset: tokens.size.touch * 3, animated: false });
    } finally {
      scrolls.mockRestore();
    }
  });
});

describe('not set yet, VoiceOver says so (review #463)', () => {
  test('the value says it is not set, and the hint how to set it', async () => {
    await show({ unset: true });
    expect(wheel().props.accessibilityValue).toEqual({ text: t('onboarding.wheel.unset', { value: '1992 year' }) });
    expect(wheel().props.accessibilityHint).toBe(t('onboarding.wheel.unsetHint'));
  });

  test('once set, neither', async () => {
    await show();
    expect(wheel().props.accessibilityValue).toEqual({ text: '1992 year' });
    expect(wheel().props.accessibilityHint).toBeUndefined();
  });
});
