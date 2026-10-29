/**
 * Stepper (ADR-070 Ek 2 #5, K-1041): − value + with the value a field one can type into (a comma or a dot), clamped to
 * its range, stepped by the caller's step, and one adjustable control for VoiceOver (swipe up or down to step).
 */
import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { type ComponentProps, type ReactElement, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

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

describe('no value yet (a first weigh-in has no last one to start from, K-1044)', () => {
  function Empty({ onEmpty }: { onEmpty?: () => void }) {
    const [value, setValue] = useState<number | null>(null);
    return (
      <Stepper
        label="Weight"
        unit="kg"
        step={0.1}
        value={value}
        onChange={(next) => {
          heard.push(next);
          setValue(next);
        }}
        onEmpty={() => {
          onEmpty?.();
          setValue(null);
        }}
      />
    );
  }

  test('the field is empty, nothing is made up, and the buttons wait for a number', async () => {
    await renderIt(<Empty />);
    expect(field().props.value).toBe('');
    expect(screen.getByRole('button', { name: t('stepper.increase', { label: 'Weight' }) })).toBeDisabled();
    expect(screen.getByRole('button', { name: t('stepper.decrease', { label: 'Weight' }) })).toBeDisabled();
  });

  test('a number typed is the value, and the buttons work from it', async () => {
    await renderIt(<Empty />);
    await fireEvent.changeText(field(), '82,4');
    expect(heard).toEqual([82.4]);
    await userEvent.setup().press(screen.getByRole('button', { name: t('stepper.increase', { label: 'Weight' }) }));
    expect(heard).toEqual([82.4, 82.5]);
  });

  test('clearing the field is said, so the screen does not keep the old number under an empty field', async () => {
    const onEmpty = jest.fn();
    await renderIt(<Empty onEmpty={onEmpty} />);
    await fireEvent.changeText(field(), '82');
    await fireEvent.changeText(field(), '');
    expect(onEmpty).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: t('stepper.increase', { label: 'Weight' }) })).toBeDisabled();
  });

  test('a stepper that is not told of empty fields ignores them, as before', async () => {
    await renderIt(<Held />);
    await fireEvent.changeText(field(), '');
    expect(heard).toEqual([]);
  });
});

// K-1047 (the workout's set card): a screen that moves the number itself, an empty start, and a keyboard that is still up.
describe('a screen that steps the number itself (steps)', () => {
  function Own({ stops }: { stops: number[] }) {
    const [value, setValue] = useState<number | null>(null);
    const to = (direction: 1 | -1) => {
      const at = value === null ? -1 : stops.indexOf(value);
      const next = stops[at + direction];
      return next === undefined || (value === null && direction < 0) ? null : () => setValue(next);
    };
    return <Stepper label="Weight" unit="kg" step={2.5} value={value} onChange={setValue} onEmpty={() => setValue(null)} steps={to} placeholder="Pick" />;
  }
  const more = () => screen.getByRole('button', { name: t('stepper.increase', { label: 'Weight' }) });
  const less = () => screen.getByRole('button', { name: t('stepper.decrease', { label: 'Weight' }) });

  test('an empty value can be stepped from: the buttons ask the screen, which jumps to its own first stop', async () => {
    await renderIt(<Own stops={[20, 22.5, 25]} />);
    expect(field().props.value).toBe('');
    expect(field().props.placeholder).toBe('Pick');
    expect(more()).toBeEnabled();
    expect(less()).toBeDisabled(); // the screen says nothing is under the start
    await userEvent.setup().press(more());
    expect(field().props.value).toBe('20');
    await userEvent.setup().press(more());
    expect(field().props.value).toBe('22.5');
  });

  test('a button is off where the screen has no step; VoiceOver\'s actions go through it too', async () => {
    await renderIt(<Own stops={[20, 22.5]} />);
    await fireEvent(field(), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    await fireEvent(field(), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(field().props.value).toBe('22.5');
    expect(more()).toBeDisabled();
  });

  test('typing still works beside it, a comma too', async () => {
    await renderIt(<Own stops={[20, 22.5]} />);
    await fireEvent(field(), 'focus');
    await fireEvent.changeText(field(), '62,5');
    await fireEvent(field(), 'blur');
    expect(field().props.value).toBe('62.5');
  });
});

describe('what is typed is old once the value is another one (K-1047)', () => {
  test('a tap on + with the field still focused shows the stepped value, not the typed text', async () => {
    await renderIt(<Held />);
    await fireEvent(field(), 'focus');
    await fireEvent.changeText(field(), '80');
    expect(field().props.value).toBe('80');
    await userEvent.setup().press(screen.getByRole('button', { name: t('stepper.increase', { label: 'Weight' }) }));
    expect(field().props.value).toBe('82.5');
  });

  test('a value the screen sets itself while the field is focused replaces the typed text', async () => {
    function Suggest() {
      const [value, setValue] = useState(60);
      return (
        <>
          <Stepper label="Weight" step={2.5} value={value} onChange={setValue} />
          <Pressable accessibilityRole="button" accessibilityLabel="Use 55" onPress={() => setValue(55)} />
        </>
      );
    }
    await renderIt(<Suggest />);
    await fireEvent(field(), 'focus');
    await fireEvent.changeText(field(), '62');
    await fireEvent.press(screen.getByRole('button', { name: 'Use 55' }));
    expect(field().props.value).toBe('55');
  });

  test('a number with a trailing dot stays as typed while the number is the value ("62." on its way to "62.5")', async () => {
    await renderIt(<Held />);
    await fireEvent(field(), 'focus');
    await fireEvent.changeText(field(), '62.');
    expect(field().props.value).toBe('62.');
  });
});
