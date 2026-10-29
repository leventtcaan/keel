/**
 * The grouped list (ADR-070 Ek 2 #2, K-1041): a section title, one surface card, rows split by a hairline inset past the
 * icon. A row has an icon, a label, a value; a chevron only when it goes somewhere; a destructive row in the warning
 * colour; a switch row. Colours are read from the palette, never repeated here.
 */
import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { StyleSheet } from 'react-native';

import { ListGroup, ListRow } from '@/components/ListGroup';
import { ThemeProvider } from '@/theme/theme';
import { type ColorScheme, palettes, tokens } from '@/theme/tokens';

jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  return { SymbolView: (props: { testID?: string }) => createElement('SymbolView', { ...props, testID: props.testID ?? 'symbol' }) };
});

const schemes: ColorScheme[] = ['light', 'dark'];
const renderIn = (scheme: ColorScheme, ui: ReactElement) => render(<ThemeProvider scheme={scheme}>{ui}</ThemeProvider>);
const flat = (node: { props: { style?: unknown } }) => (StyleSheet.flatten(node.props.style as never) ?? {}) as Record<string, unknown>;
const symbols = () => screen.getAllByTestId('symbol');

describe.each(schemes)('ListGroup in the %s theme', (scheme) => {
  const p = palettes[scheme];

  test('one surface card with the card radius, under a section title in ink (not grey), semibold, label size', async () => {
    await renderIn(
      scheme,
      <ListGroup title="Account" testID="group">
        <ListRow label="Email" value="a@b.c" />
      </ListGroup>,
    );
    expect(flat(screen.getByTestId('group-card'))).toMatchObject({ backgroundColor: p.surface, borderRadius: tokens.radius.card });
    expect(flat(screen.getByText('Account'))).toMatchObject({ color: p.text, fontSize: tokens.type.label, fontWeight: tokens.weight.semibold });
    expect(screen.getByRole('header', { name: 'Account' })).toBeOnTheScreen();
  });

  test('rows after the first are split by a hairline in the line colour, inset past the icon; the first has none', async () => {
    await renderIn(
      scheme,
      <ListGroup testID="group">
        <ListRow icon="person" label="Name" testID="r1" />
        <ListRow icon="envelope" label="Email" testID="r2" />
        <ListRow label="Plain" testID="r3" />
      </ListGroup>,
    );
    expect(screen.queryByTestId('r1-separator')).toBeNull();
    const withIcon = flat(screen.getByTestId('r2-separator'));
    expect(withIcon).toMatchObject({ backgroundColor: p.line, height: tokens.border.hairline });
    expect(withIcon.left).toBe(tokens.space.md + tokens.icon.regular + tokens.space.md);
    // No icon: the line starts at the row's own padding.
    expect(flat(screen.getByTestId('r3-separator')).left).toBe(tokens.space.md);
  });

  test('a destructive row is in the warning colour, icon and label', async () => {
    await renderIn(
      scheme,
      <ListGroup>
        <ListRow icon="trash" label="Delete account" destructive onPress={() => {}} />
      </ListGroup>,
    );
    expect(flat(screen.getByText('Delete account')).color).toBe(p.warn);
    expect(symbols()[0].props.tintColor).toBe(p.warn);
  });

  test('a plain row is in ink, its value muted', async () => {
    await renderIn(
      scheme,
      <ListGroup>
        <ListRow label="Units" value="kg" />
      </ListGroup>,
    );
    expect(flat(screen.getByText('Units')).color).toBe(p.text);
    expect(flat(screen.getByText('kg')).color).toBe(p.muted);
  });

  test('a switch row has the accent track when on, the control edge when off', async () => {
    await renderIn(
      scheme,
      <ListGroup>
        <ListRow label="Reminders" switch={{ value: true, onValueChange: () => {} }} />
      </ListGroup>,
    );
    // The host switch gets the track as onTintColor (on) and tintColor (off), and the off ground as its own background.
    expect(screen.getByLabelText('Reminders').props).toMatchObject({ onTintColor: p.accent, tintColor: p.edge });
  });
});

describe('ListRow', () => {
  test('a chevron shows only on a row that navigates', async () => {
    await renderIn(
      'light',
      <ListGroup>
        <ListRow label="Goal" onPress={() => {}} navigates testID="goes" />
        <ListRow label="Weigh in" onPress={() => {}} testID="acts" />
        <ListRow label="Version" value="1.0" testID="still" />
      </ListGroup>,
    );
    expect(screen.queryByTestId('goes-chevron')).toBeOnTheScreen();
    expect(screen.queryByTestId('acts-chevron')).toBeNull();
    expect(screen.queryByTestId('still-chevron')).toBeNull();
  });

  test('navigates without an onPress is no chevron: there is nowhere to go', async () => {
    await renderIn(
      'light',
      <ListGroup>
        <ListRow label="Goal" navigates testID="r" />
      </ListGroup>,
    );
    expect(screen.queryByTestId('r-chevron')).toBeNull();
  });

  test('a row with onPress is a button that calls it; a row without is not a button', async () => {
    const onPress = jest.fn();
    await renderIn(
      'light',
      <ListGroup>
        <ListRow label="Goal" value="Lose" onPress={onPress} accessibilityHint="Opens the goal" />
        <ListRow label="Version" value="1.0" />
      </ListGroup>,
    );
    await userEvent.setup().press(screen.getByRole('button', { name: /Goal/ }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /Goal/ }).props.accessibilityHint).toBe('Opens the goal');
    expect(screen.queryByRole('button', { name: /Version/ })).toBeNull();
  });

  test('every row is at least size.touch tall', async () => {
    await renderIn(
      'light',
      <ListGroup>
        <ListRow label="Goal" onPress={() => {}} testID="a" />
        <ListRow label="Version" value="1.0" testID="b" />
        <ListRow label="Remind" switch={{ value: false, onValueChange: () => {} }} testID="c" />
      </ListGroup>,
    );
    for (const id of ['a', 'b', 'c']) expect(flat(screen.getByTestId(id)).minHeight).toBeGreaterThanOrEqual(tokens.size.touch);
  });

  test('the switch toggles through onValueChange and is named by the label or by accessibilityLabel', async () => {
    const onValueChange = jest.fn();
    await renderIn(
      'light',
      <ListGroup>
        <ListRow label="Reminders" switch={{ value: false, onValueChange }} />
        <ListRow label="Sounds" accessibilityLabel="Rest timer sounds" switch={{ value: true, onValueChange }} />
      </ListGroup>,
    );
    expect(screen.getByLabelText('Reminders').props.value).toBe(false);
    expect(screen.getByLabelText('Rest timer sounds').props.value).toBe(true);
    await fireEvent(screen.getByLabelText('Reminders'), 'valueChange', true);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  test('the icon is decorative: the label alone is read', async () => {
    await renderIn(
      'light',
      <ListGroup>
        <ListRow icon="person" label="Name" onPress={() => {}} />
      </ListGroup>,
    );
    expect(symbols()[0].props).toMatchObject({ name: 'person', accessible: false });
  });

  test('a footer is one muted line under the card', async () => {
    await renderIn(
      'light',
      <ListGroup footer="Only you see this.">
        <ListRow label="Notes" />
      </ListGroup>,
    );
    expect(flat(screen.getByText('Only you see this.')).color).toBe(palettes.light.muted);
  });
});

describe('ListRow detail and trailing icon (K-1046)', () => {
  test('a detail is a second line under the label, muted and smaller; the row is read with it', async () => {
    await renderIn(
      'light',
      <ListGroup>
        <ListRow label="Greek yogurt" detail="150-170 kcal" onPress={() => {}} />
        <ListRow label="Plain" onPress={() => {}} />
      </ListGroup>,
    );
    expect(flat(screen.getByText('150-170 kcal'))).toMatchObject({ color: palettes.light.muted, fontSize: tokens.type.bodySmall });
    expect(flat(screen.getByText('Greek yogurt')).color).toBe(palettes.light.text);
    expect(screen.getByRole('button', { name: 'Greek yogurt, 150-170 kcal' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Plain' })).toBeOnTheScreen();
  });

  test('a trailing icon is the accent and decorative; a navigating row keeps its chevron instead', async () => {
    await renderIn(
      'light',
      <ListGroup>
        <ListRow label="Add" trailing="plus.circle.fill" onPress={() => {}} testID="adds" />
        <ListRow label="Goal" trailing="plus.circle.fill" onPress={() => {}} navigates testID="goes" />
      </ListGroup>,
    );
    expect(screen.getByTestId('adds-trailing').props).toMatchObject({ name: 'plus.circle.fill', tintColor: palettes.light.accent, accessible: false });
    expect(screen.queryByTestId('goes-trailing')).toBeNull();
    expect(screen.getByTestId('goes-chevron')).toBeOnTheScreen();
  });
});
