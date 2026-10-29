/**
 * A tab reads again when something is saved (K-1051): the "+" is on every tab and its sheets close over the tab without
 * taking its focus, so a read on focus alone left Progress at 0 kcal after a meal logged from it. A save the banner shows
 * (and one taken back with its Undo) makes every screen reading for today read again.
 */
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { useCallback, useRef } from 'react';
import { Text } from 'react-native';

import { ThemeProvider } from '@/theme/theme';
import { useReadOnFocus } from '@/today/useReadOnFocus';

import { Saver, WithSaved, publishSave, undoButton } from './support/saved';

function Reader() {
  const reads = useRef(0);
  const { data } = useReadOnFocus(useCallback(async () => ++reads.current, []), { afterSaves: true });
  return <Text testID="reads">{String(data ?? 0)}</Text>;
}

const renderIt = () =>
  renderRouter({
    index: () => (
      <ThemeProvider scheme="light">
        <WithSaved>
          <Saver />
          <Reader />
        </WithSaved>
      </ThemeProvider>
    ),
  });
const reads = () => Number(screen.getByTestId('reads').props.children);
const settle = () => act(async () => {});

test('a save makes the screen in view read again', async () => {
  await renderIt();
  await settle();
  const before = reads();
  await publishSave({ detail: 'Lunch, 1 item', undo: async () => ({ done: true }) });
  await settle();
  expect(reads()).toBe(before + 1);
});

test('a save taken back reads again too', async () => {
  await renderIt();
  await settle();
  await publishSave({ detail: 'Lunch, 1 item', undo: async () => ({ done: true }) });
  await settle();
  const afterSave = reads();
  await fireEvent.press(undoButton());
  await settle();
  expect(reads()).toBe(afterSave + 1);
});

test('an Undo that did not take it back reads nothing more', async () => {
  await renderIt();
  await settle();
  await publishSave({ detail: 'Lunch, 1 item', undo: async () => ({ done: false, message: 'No connection.', again: false }) });
  await settle();
  const afterSave = reads();
  await fireEvent.press(undoButton());
  await settle();
  expect(reads()).toBe(afterSave);
});
