/**
 * The consent step every gate shares (Evre 7 final pass, #684): a title if the screen wants one, ONE line of what saying yes
 * unlocks, "Read the full text" for the legal words (one tap away, U/V rules), and the two choices in a dock under the scroll
 * that never clips. The text a person says yes to is still ConsentText, whole.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { ConsentStep } from '@/consent/ConsentStep';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';

async function show(props: Partial<React.ComponentProps<typeof ConsentStep>> = {}) {
  const onAllow = jest.fn();
  const onNotNow = jest.fn();
  await render(
    <ThemeProvider>
      <ConsentStep why="Why line" allow="Yes" notNow="No" onAllow={onAllow} onNotNow={onNotNow} busy={false} problem={null} {...props} />
    </ThemeProvider>,
  );
  await act(async () => {});
  return { onAllow, onNotNow };
}

test('the line, the link and the two buttons; the four legal points are not on the first view', async () => {
  await show();
  expect(screen.getByText('Why line')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: t('consent.step.fullText') })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Yes' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'No' })).toBeOnTheScreen();
  expect(screen.queryByText(t('consent.health_data.points.collected'))).toBeNull();
  expect(screen.queryByTestId('consent-list')).toBeNull();
});

test('the full text is one tap away, whole, and the same ConsentText', async () => {
  await show();
  await fireEvent.press(screen.getByRole('button', { name: t('consent.step.fullText') }));
  for (const point of ['collected', 'purpose', 'withdraw', 'scope']) {
    expect(screen.getByText(t(`consent.health_data.points.${point}`))).toBeOnTheScreen();
  }
  expect(screen.getByRole('button', { name: t('consent.step.fullText') }).props.accessibilityState).toMatchObject({ expanded: true });
});

test('the buttons sit in the dock outside the scroll, so they never clip', async () => {
  await show();
  const dock = screen.getByTestId('consent-dock');
  expect(screen.getByTestId('consent-scroll')).not.toContainElement(dock);
  expect(dock).toContainElement(screen.getByRole('button', { name: 'Yes' }));
  expect(dock).toContainElement(screen.getByRole('button', { name: 'No' }));
});

test('Yes and Not now call back', async () => {
  const { onAllow, onNotNow } = await show();
  await fireEvent.press(screen.getByRole('button', { name: 'Yes' }));
  await fireEvent.press(screen.getByRole('button', { name: 'No' }));
  expect(onAllow).toHaveBeenCalledTimes(1);
  expect(onNotNow).toHaveBeenCalledTimes(1);
});

test('busy: both buttons disabled; a problem is said', async () => {
  await show({ busy: true, problem: 'It failed' });
  expect(screen.getByRole('button', { name: 'Yes' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'No' })).toBeDisabled();
  expect(screen.getByText('It failed')).toBeOnTheScreen();
});

test('a title, when the screen gives one, is a header', async () => {
  await show({ title: 'A title' });
  expect(screen.getByRole('header', { name: 'A title' })).toBeOnTheScreen();
});
