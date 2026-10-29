/**
 * Stepper (ADR-070 Ek 2 #5, K-1041): − value + with the value a field one can type into (a comma or a dot), clamped to
 * its range, stepped by the caller's step, and one adjustable control for VoiceOver (swipe up or down to step).
 */
import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { type ComponentProps, type ReactElement, useState } from 'react';
import { StyleSheet } from 'react-native';

import { Stepper } from '@/components/Stepper';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';
import { palettes, tokens } from '@/theme/tokens';

jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  return { SymbolView: (props: object) => createElement('SymbolView', props) };
});

const renderIt = (ui: ReactElement) => render(<ThemeProvider scheme="light">{ui}</ThemeProvider>);
const field = () => screen.getByLabelText('Weight');

/** The stepper as a screen holds it: the value in state, the changes the screen heard kept. */
function Held({ start = 72.5, ...rest }: { start?: number } & Partial<ComponentProps<typeof Stepper>>) {
  const [value, setValue] = useState(start);
  return <Stepper label="Weight" unit="kg" step={2.5} min={20} max={300} {...rest} value={value} onChange={(next) => { heard.push(next); setValue(next); }} />;
}
let heard: number[] = [];
beforeEach(() => {
  heard = [];
});

describe('the value', () => {
  test('is shown with the unit beside it, a whole number without a trailing zero', async () => {
    await renderIt(<Held start={72} />);
    expect(field().props.value).toBe('72');
    expect(screen.getByText('kg')).toBeOnTheScreen();
  });

  test('is shown with its decimal when it has one', async () => {
    await renderIt(<Held />);
    expect(field().props.value).toBe('72.5');
  });

  test('a decimal keyboard when the step has decimals, a number pad when it has none', async () => {
    await renderIt(<Held />);
    expect(field().props.keyboardType).toBe('decimal-pad');
  });

  test('a whole step brings the number pad', async () => {
    await renderIt(<Held start={30} step={5} label="Minutes" />);
    expect(screen.getByLabelText('Minutes').props.keyboardType).toBe('number-pad');
  });

  test('is drawn in the display face, ink, with a dotted line under it in the control edge (it can be typed in)', async () => {
    await renderIt(<Held />);
    expect(StyleSheet.flatten(field().props.style)).toMatchObject({ fontFamily: tokens.font.display, fontSize: tokens.type.stepperValue, color: palettes.light.text });
    expect(StyleSheet.flatten(field().props.style)).toMatchObject({ borderBottomColor: palettes.light.edge, borderStyle: 'dotted' });
  });
});

describe('typing', () => {
  test.each([
    ['72,5', 72.5],
    ['72.5', 72.5],
    ['80', 80],
    ['61,25', 61.3],
  ])('"%s" gives %p', async (typed, number) => {
    await renderIt(<Held />);
    await fireEvent.changeText(field(), typed);
    expect(heard.at(-1)).toBe(number);
  });

  test('keeps what is typed on the screen while it is being typed, the clamped number once the field is left', async () => {
    await renderIt(<Held />);
    await fireEvent(field(), 'focus');
    await fireEvent.changeText(field(), '5');
    expect(field().props.value).toBe('5'); // 5 is under the minimum, but "55" is on its way
    await fireEvent.changeText(field(), '55');
    expect(heard.at(-1)).toBe(55);
    await fireEvent.changeText(field(), '5');
    await fireEvent(field(), 'blur');
    expect(heard.at(-1)).toBe(20);
    expect(field().props.value).toBe('20');
  });

  test('clamps to the maximum', async () => {
    await renderIt(<Held />);
    await fireEvent.changeText(field(), '999');
    expect(heard.at(-1)).toBe(300);
  });

  test.each(['', '-', 'abc', '1,2,3', '.'])('"%s" is no number: nothing is heard, the old value stays', async (typed) => {
    await renderIt(<Held />);
    await fireEvent(field(), 'focus');
    await fireEvent.changeText(field(), typed);
    expect(heard).toEqual([]);
    await fireEvent(field(), 'blur');
    expect(field().props.value).toBe('72.5');
  });
});

describe('the buttons', () => {
  test('+ and − move by the step', async () => {
    await renderIt(<Held />);
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: t('stepper.increase', { label: 'Weight' }) }));
    await user.press(screen.getByRole('button', { name: t('stepper.increase', { label: 'Weight' }) }));
    await user.press(screen.getByRole('button', { name: t('stepper.decrease', { label: 'Weight' }) }));
    expect(heard).toEqual([75, 77.5, 75]);
    expect(field().props.value).toBe('75');
  });

  test('0.1 steps do not pick up floating point dust', async () => {
    await renderIt(<Held start={0.1} step={0.1} min={0} max={1} />);
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: t('stepper.increase', { label: 'Weight' }) }));
    await user.press(screen.getByRole('button', { name: t('stepper.increase', { label: 'Weight' }) }));
    expect(heard).toEqual([0.2, 0.3]);
  });

  test('stop at the ends, where they say they are disabled', async () => {
    await renderIt(<Held start={20} />);
    expect(screen.getByRole('button', { name: t('stepper.decrease', { label: 'Weight' }) })).toBeDisabled();
    expect(screen.getByRole('button', { name: t('stepper.increase', { label: 'Weight' }) })).toBeEnabled();
  });

  test('a step past an end lands on it', async () => {
    await renderIt(<Held start={299} />);
    await userEvent.setup().press(screen.getByRole('button', { name: t('stepper.increase', { label: 'Weight' }) }));
    expect(heard).toEqual([300]);
  });

  test('each is size.stepperButton across, and the buttons sit on the raised colour', async () => {
    await renderIt(<Held />);
    const style = StyleSheet.flatten(screen.getByRole('button', { name: t('stepper.increase', { label: 'Weight' }) }).props.style);
    expect(style).toMatchObject({ width: tokens.size.stepperButton, height: tokens.size.stepperButton, backgroundColor: palettes.light.raise });
    expect(tokens.size.stepperButton).toBeGreaterThanOrEqual(tokens.size.touch);
  });
});

describe('VoiceOver', () => {
  test('the field is an adjustable control: named, its value said with the unit, increment and decrement actions', async () => {
    await renderIt(<Held />);
    expect(field().props).toMatchObject({
      accessibilityRole: 'adjustable',
      accessibilityValue: { text: '72.5 kg' },
    });
    expect(field().props.accessibilityActions).toEqual([{ name: 'increment' }, { name: 'decrement' }]);
  });

  test('the actions step the value like the buttons', async () => {
    await renderIt(<Held />);
    await fireEvent(field(), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    await fireEvent(field(), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    await fireEvent(field(), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(heard).toEqual([75, 72.5, 70]);
  });

  test('an action the stepper does not know does nothing', async () => {
    await renderIt(<Held />);
    await fireEvent(field(), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(heard).toEqual([]);
  });
});
