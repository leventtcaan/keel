/**
 * The keyboard the way an iPhone's is (K-1065): a number pad has its Done bar above it, a note its Done too (its Return starts a
 * line), a one-line text field its Done key; a form scrolls with the keyboard's height as room and closes it on a drag.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Keyboard } from 'react-native';

import { FormScroll } from '@/components/FormScroll';
import { Stepper } from '@/components/Stepper';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';

const inTheme = (node: React.ReactElement) => <ThemeProvider>{node}</ThemeProvider>;

// The bar is the keyboard's, left out of a screen under Jest (jest.setup.ts); here it is wanted.
beforeAll(() => {
  (globalThis as { __showKeyboardAccessory?: boolean }).__showKeyboardAccessory = true;
});
afterAll(() => {
  (globalThis as { __showKeyboardAccessory?: boolean }).__showKeyboardAccessory = false;
});

test('a number pad: the input names a Done bar, and the bar closes the keyboard', async () => {
  const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
  await render(inTheme(<TextField label="Height" value="" onChangeText={() => {}} keyboardType="number-pad" />));
  const id = screen.getByLabelText('Height').props.inputAccessoryViewID as string;
  expect(id).toEqual(expect.stringContaining('keel-done'));
  await fireEvent.press(screen.getByRole('button', { name: t('keyboard.hide') }));
  expect(dismiss).toHaveBeenCalledTimes(1);
  dismiss.mockRestore();
});

test('a decimal pad too', async () => {
  await render(inTheme(<TextField label="Weight" value="" onChangeText={() => {}} keyboardType="decimal-pad" />));
  expect(screen.getByLabelText('Weight').props.inputAccessoryViewID).toBeDefined();
});

test('the stepper is a number field: its pad has the Done bar', async () => {
  await render(inTheme(<Stepper label="Reps" value={8} onChange={() => {}} step={1} />));
  expect(screen.getByLabelText('Reps').props.inputAccessoryViewID).toEqual(expect.stringContaining('keel-done'));
  expect(screen.getByRole('button', { name: t('keyboard.hide') })).toBeOnTheScreen();
});

test('a note: Return starts a line, so Done closes it', async () => {
  await render(inTheme(<TextField label="Note" value="" onChangeText={() => {}} multiline />));
  expect(screen.getByLabelText('Note').props.inputAccessoryViewID).toBeDefined();
});

test('a one-line text field: the Return key says Done and closes the keyboard; it has no bar', async () => {
  await render(inTheme(<TextField label="Name" value="" onChangeText={() => {}} />));
  const input = screen.getByLabelText('Name');
  expect(input.props.returnKeyType).toBe('done');
  expect(input.props.inputAccessoryViewID).toBeUndefined();
  expect(screen.queryByRole('button', { name: t('keyboard.hide') })).toBeNull();
});

test('a search keeps its Search key', async () => {
  await render(inTheme(<TextField label="Find" value="" onChangeText={() => {}} onSearch={() => {}} />));
  expect(screen.getByLabelText('Find').props.returnKeyType).toBe('search');
});

test('a form scrolls with the keyboard as room, closes it on a drag, and still lets a button take its tap', async () => {
  await render(<FormScroll testID="form" />);
  const form = screen.getByTestId('form');
  expect(form.props.automaticallyAdjustKeyboardInsets).toBe(true);
  expect(form.props.keyboardDismissMode).toBe('interactive');
  expect(form.props.keyboardShouldPersistTaps).toBe('handled');
});
