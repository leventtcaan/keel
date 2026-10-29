/**
 * Settings › How it works (K-1065): one row that shows the first-use guide again. It leaves Settings for This week and asks for
 * the guide, which opens as This week comes into view, though it was seen.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { t } from '@/copy';
import { GuideGroup } from '@/guide/GuideGroup';
import { GuideProvider, useGuide } from '@/guide/GuideProvider';
import { createGuideMark } from '@/guide/guide';
import { ThemeProvider } from '@/theme/theme';

const mockDismissTo = jest.fn();
jest.mock('expo-router', () => ({ router: { dismissTo: (...args: unknown[]) => mockDismissTo(...args) } }));

function ThisWeek() {
  const guide = useGuide();
  return (
    <Text testID="this-week" onPress={guide.arrive}>
      {guide.open ? 'open' : 'closed'}
    </Text>
  );
}

test('one row: it goes back to This week and asks; This week then opens the guide, though it was seen', async () => {
  const items = new Map([['guide.seen', 'yes']]);
  const mark = createGuideMark({
    kv: {
      getItemAsync: async (key) => items.get(key) ?? null,
      setItemAsync: async (key, value) => void items.set(key, value),
      removeItemAsync: async (key) => void items.delete(key),
    },
  });
  await render(
    <ThemeProvider>
      <GuideProvider mark={mark}>
        <GuideGroup />
        <ThisWeek />
      </GuideProvider>
    </ThemeProvider>,
  );
  await fireEvent.press(screen.getByTestId('this-week'));
  await act(async () => {});
  expect(screen.getByText('closed')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: t('settings.guide.row') }));
  expect(mockDismissTo).toHaveBeenCalledWith('/');
  await fireEvent.press(screen.getByTestId('this-week'));
  await act(async () => {});
  expect(screen.getByText('open')).toBeOnTheScreen();
});
