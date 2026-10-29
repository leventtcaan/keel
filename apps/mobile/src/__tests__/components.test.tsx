/**
 * Base components render from tokens in both themes (K-301, ADR-016).
 * Colours are read from the palette, never repeated here, so a palette change cannot make these tests lie.
 */
import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { DecisionBlock } from '@/components/DecisionBlock';
import { ProgressBar } from '@/components/ProgressBar';
import { RangeText } from '@/components/RangeText';
import { ScreenTitle } from '@/components/ScreenTitle';
import { TextField } from '@/components/TextField';
import { ThemeProvider } from '@/theme/theme';
import { type ColorScheme, palettes, tokens } from '@/theme/tokens';

const schemes: ColorScheme[] = ['light', 'dark'];

function renderIn(scheme: ColorScheme, ui: ReactElement) {
  return render(<ThemeProvider scheme={scheme}>{ui}</ThemeProvider>);
}

describe.each(schemes)('%s theme', (scheme) => {
  const p = palettes[scheme];

  test('Card sits on the surface colour with the card radius', async () => {
    await renderIn(scheme, <Card testID="c" />);
    expect(screen.getByTestId('c')).toHaveStyle({ backgroundColor: p.surface, borderRadius: tokens.radius.card });
  });

  test('an outlined Card sits on the background with a text-coloured outline', async () => {
    await renderIn(scheme, <Card testID="c" outline />);
    expect(screen.getByTestId('c')).toHaveStyle({
      backgroundColor: p.background,
      borderColor: p.text,
      borderWidth: tokens.border.outline,
    });
  });

  test('the DecisionBlock is the inverse surface, its title is uppercase display type', async () => {
    await renderIn(scheme, <DecisionBlock testID="d" eyebrow="This week" title="Eat a little more" />);
    expect(screen.getByTestId('d')).toHaveStyle({ backgroundColor: p.decisionBackground });
    expect(screen.getByText('Eat a little more')).toHaveStyle({
      color: p.decisionText,
      fontFamily: tokens.font.display,
      textTransform: 'uppercase',
    });
    expect(screen.getByText('This week')).toHaveStyle({ color: p.accentInk });
    expect(screen.getByRole('header', { name: 'Eat a little more' })).toBeOnTheScreen();
  });

  test('a Button inside the DecisionBlock uses the block accent', async () => {
    await renderIn(
      scheme,
      <DecisionBlock title="t">
        <Button label="Apply" onPress={() => {}} />
      </DecisionBlock>,
    );
    expect(screen.getByRole('button', { name: 'Apply' })).toHaveStyle({ backgroundColor: p.accentInk });
    expect(screen.getByText('Apply')).toHaveStyle({ color: p.onAccentInk });
  });

  // ADR-070 Ek 2 #1 (K-1041): the primary button is the cta (black on light), not the accent. The warn fill is gone: the old
  // `warn` is the destructive role now, words in the warning colour (button-roles.test.tsx holds every role).
  test('a primary Button fills with cta and labels with onCta', async () => {
    await renderIn(scheme, <Button label="Go" variant="primary" onPress={() => {}} />);
    expect(screen.getByRole('button', { name: 'Go' })).toHaveStyle({
      backgroundColor: p.cta,
      borderRadius: tokens.radius.button,
    });
    expect(screen.getByText('Go')).toHaveStyle({ color: p.onCta, fontSize: tokens.type.button });
  });

  // ADR-070 Ek 2 #1: the outlined pill is gone; the old ghost is the secondary role, a surface with ink words.
  test('a ghost Button is the secondary look: a surface fill, ink words, no outline', async () => {
    await renderIn(scheme, <Button label="Later" variant="ghost" onPress={() => {}} />);
    const later = screen.getByRole('button', { name: 'Later' });
    expect(later).toHaveStyle({ backgroundColor: p.surface });
    expect(later).not.toHaveStyle({ borderWidth: tokens.border.outline });
    expect(screen.getByText('Later')).toHaveStyle({ color: p.text });
  });

  test('an unselected Chip is a surface with the control edge (3:1, K-816); a selected one is inverse', async () => {
    await renderIn(
      scheme,
      <>
        <Chip label="Off" onPress={() => {}} />
        <Chip label="On" selected onPress={() => {}} />
      </>,
    );
    expect(screen.getByRole('button', { name: 'Off' })).toHaveStyle({
      backgroundColor: p.surface,
      borderColor: p.edge,
      borderRadius: tokens.radius.chip,
    });
    expect(screen.getByRole('button', { name: 'On' })).toHaveStyle({ backgroundColor: p.decisionBackground });
    expect(screen.getByText('On')).toHaveStyle({ color: p.decisionText });
    expect(screen.getByRole('button', { name: 'On' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Off' })).not.toBeSelected();
  });

  test('a selected Chip inside the DecisionBlock stands out from the block', async () => {
    await renderIn(
      scheme,
      <DecisionBlock title="t">
        <Chip label="Hard" selected onPress={() => {}} />
      </DecisionBlock>,
    );
    expect(screen.getByRole('button', { name: 'Hard' })).toHaveStyle({ backgroundColor: p.decisionText });
    expect(screen.getByText('Hard')).toHaveStyle({ color: p.decisionBackground });
  });

  test('ProgressBar fills with the accent on the track colour', async () => {
    await renderIn(scheme, <ProgressBar value={0.4} label="Protein" />);
    const bar = screen.getByRole('progressbar', { name: 'Protein' });
    // The track's outline is the control edge: the bar's extent is told at 3:1, not by a 1.2:1 fill (K-816).
    expect(bar).toHaveStyle({ backgroundColor: p.track, height: tokens.size.track, borderColor: p.edge, borderWidth: tokens.border.hairline });
    expect(screen.getByTestId('progress-fill')).toHaveStyle({ backgroundColor: p.accent, width: '40%' });
  });

  test('ScreenTitle is an uppercase display header in the text colour', async () => {
    await renderIn(scheme, <ScreenTitle>Today</ScreenTitle>);
    expect(screen.getByRole('header', { name: 'Today' })).toHaveStyle({
      color: p.text,
      fontFamily: tokens.font.display,
      fontSize: tokens.type.screenTitle,
      textTransform: 'uppercase',
    });
  });
});

describe('Button behaviour', () => {
  test('pressing calls onPress', async () => {
    const onPress = jest.fn();
    await renderIn('light', <Button label="Apply" onPress={onPress} />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Apply' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('a disabled Button says so and does not call onPress', async () => {
    const onPress = jest.fn();
    await renderIn('light', <Button label="Apply" disabled onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Apply' });
    expect(button).toBeDisabled();
    expect(button).toHaveStyle({ opacity: tokens.opacity.dim });
    await userEvent.setup().press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  test('an enabled Button at rest is not dimmed', async () => {
    await renderIn('light', <Button label="Apply" onPress={() => {}} />);
    expect(screen.getByRole('button', { name: 'Apply' })).not.toHaveStyle({ opacity: tokens.opacity.dim });
  });
});

describe('Button touch area (K-1027)', () => {
  // The visible height is whatever the text and padding make; the layout event is the only place it is known.
  const laidOut = (height: number, width = 120) => ({ nativeEvent: { layout: { x: 0, y: 0, width, height } } });
  const reach = (button: ReturnType<typeof screen.getByRole>) => {
    const slop = button.props.hitSlop ?? {};
    return { tall: button.props.hitSlop === undefined ? 0 : (slop.top ?? 0) + (slop.bottom ?? 0), wide: (slop.left ?? 0) + (slop.right ?? 0) };
  };

  test.each([35, 38])('a %s pt small Button reaches at least size.touch tall, its look unchanged', async (height) => {
    await renderIn('light', <Button label="Save" size="sm" onPress={() => {}} />);
    const button = screen.getByRole('button', { name: 'Save' });
    const before = JSON.stringify(button.props.style);
    await fireEvent(button, 'layout', laidOut(height));
    const after = screen.getByRole('button', { name: 'Save' });
    expect(height + reach(after).tall).toBeGreaterThanOrEqual(tokens.size.touch);
    expect(after).not.toHaveStyle({ minHeight: tokens.size.touch });
    expect(JSON.stringify(after.props.style)).toBe(before);
  });

  test('a short, narrow Button also reaches size.touch across', async () => {
    await renderIn('light', <Button label="Go" size="sm" onPress={() => {}} />);
    await fireEvent(screen.getByRole('button', { name: 'Go' }), 'layout', laidOut(36, 30));
    const { wide } = reach(screen.getByRole('button', { name: 'Go' }));
    expect(30 + wide).toBeGreaterThanOrEqual(tokens.size.touch);
  });

  test('a Button already tall enough gets no extra reach', async () => {
    await renderIn('light', <Button label="Apply" onPress={() => {}} />);
    await fireEvent(screen.getByRole('button', { name: 'Apply' }), 'layout', laidOut(tokens.size.touch + 10, 300));
    expect(reach(screen.getByRole('button', { name: 'Apply' }))).toEqual({ tall: 0, wide: 0 });
  });
});

describe('Button busy (K-1027)', () => {
  test('busy is told to a screen reader; at rest it is not', async () => {
    await renderIn('light', <Button label="Share" busy onPress={() => {}} />);
    expect(screen.getByRole('button', { name: 'Share' }).props.accessibilityState).toMatchObject({ busy: true });
  });

  test('a Button at rest is not busy', async () => {
    await renderIn('light', <Button label="Share" onPress={() => {}} />);
    expect(screen.getByRole('button', { name: 'Share' }).props.accessibilityState?.busy ?? false).toBe(false);
  });
});

describe('Chip behaviour', () => {
  test('pressing calls onPress', async () => {
    const onPress = jest.fn();
    await renderIn('light', <Chip label="Easy" onPress={onPress} />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Easy' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('RangeText — an estimate is always a range (U5)', () => {
  test('shows low–high with the unit', async () => {
    await renderIn('light', <RangeText low={1800} high={2100} unit="kcal" />);
    expect(screen.getByText('1800-2100 kcal')).toBeOnTheScreen();
  });

  test('reads the range as words for VoiceOver', async () => {
    await renderIn('light', <RangeText low={1800} high={2100} unit="kcal" />);
    expect(screen.getByLabelText('between 1800 and 2100 kcal')).toBeOnTheScreen();
  });

  test('a reversed pair is the same range', async () => {
    await renderIn('light', <RangeText low={2100} high={1800} unit="kcal" />);
    expect(screen.getByText('1800-2100 kcal')).toBeOnTheScreen();
  });

  test('without a unit shows only the numbers', async () => {
    await renderIn('light', <RangeText low={3} high={5} />);
    expect(screen.getByText('3-5')).toBeOnTheScreen();
  });

  test('numbers use the display face', async () => {
    await renderIn('light', <RangeText low={3} high={5} />);
    expect(screen.getByText('3-5')).toHaveStyle({ fontFamily: tokens.font.displayBold });
  });
});

describe('ProgressBar value', () => {
  test.each([
    [0.4, 40],
    [0, 0],
    [1, 100],
    [1.4, 100],
    [-0.2, 0],
    [Number.NaN, 0],
  ])('value %p is announced as %p percent', async (value, now) => {
    await renderIn('light', <ProgressBar value={value} label="Protein" />);
    expect(screen.getByRole('progressbar', { name: 'Protein' })).toHaveAccessibilityValue({ min: 0, max: 100, now });
    expect(screen.getByTestId('progress-fill')).toHaveStyle({ width: `${now}%` });
  });
});

describe.each(schemes)('TextField box in the %s theme (K-816)', (scheme) => {
  const p = palettes[scheme];

  test('its box is drawn in the control edge, empty and not focused; a problem takes the text colour', async () => {
    await renderIn(
      scheme,
      <>
        <TextField label="Reps" value="" onChangeText={() => {}} />
        <TextField label="Sets" value="" onChangeText={() => {}} problem="Too many" />
      </>,
    );
    expect(screen.getByLabelText('Reps').parent).toHaveStyle({ backgroundColor: p.surface, borderColor: p.edge, borderWidth: tokens.border.outline });
    expect(screen.getByLabelText('Sets').parent).toHaveStyle({ borderColor: p.text });
  });
});

describe('TextField (K-416)', () => {
  test('an empty number field shows a faint dash, as an empty table cell does: on a card it would not show at all (simulator)', async () => {
    await render(
      <ThemeProvider scheme="light">
        <TextField label="Reps" value="" onChangeText={() => {}} keyboardType="number-pad" />
      </ThemeProvider>,
    );
    expect(screen.getByLabelText('Reps').props).toMatchObject({ placeholder: '-', placeholderTextColor: palettes.light.muted });
  });

  test('a field for words has no dash', async () => {
    await render(
      <ThemeProvider scheme="light">
        <TextField label="Note" value="" onChangeText={() => {}} multiline />
      </ThemeProvider>,
    );
    expect(screen.getByLabelText('Note').props.placeholder).toBeUndefined();
  });
});
