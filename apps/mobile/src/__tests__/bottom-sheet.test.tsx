/** The sheet over the workout (Evre 7 C4): its rows, and a way out that is not a second "Close". */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { ThemeProvider } from '@/theme/theme';

const show = (onClose: () => void) =>
  render(
    <ThemeProvider>
      <BottomSheet testID="sheet" onClose={onClose}>
        <Text>Row</Text>
      </BottomSheet>
    </ThemeProvider>,
  );

test('it shows its rows', async () => {
  await show(() => undefined);
  expect(screen.getByTestId('sheet')).toBeOnTheScreen();
  expect(screen.getByText('Row')).toBeOnTheScreen();
});

test('a tap on the dim behind it closes it, named "Dismiss" so it is no second "Close"', async () => {
  const onClose = jest.fn();
  await show(onClose);
  await fireEvent.press(screen.getByRole('button', { name: 'Dismiss' }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
});
