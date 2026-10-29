/**
 * OptionCard's icon (ADR-070 Ek 2 #3, prototype `.opt .oi`, K-1049): an answer may carry an SF Symbol in a tile before its
 * words. The icon is decoration: the radio's name is its words, as without it.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { OptionCard } from '@/components/OptionCard';
import { ThemeProvider } from '@/theme/theme';
import { palettes, tokens } from '@/theme/tokens';

jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  return { SymbolView: (props: { name: string }) => createElement('SymbolView', { ...props, testID: `symbol-${props.name}` }) };
});

const renderCard = (ui: ReactElement) => render(<ThemeProvider scheme="light">{ui}</ThemeProvider>);

test('with an icon: the symbol is drawn before the words, in the ink, and the radio is still named by its words', async () => {
  await renderCard(<OptionCard title="Just starting" icon="leaf" selected={false} onPress={() => {}} />);
  expect(screen.getByTestId('symbol-leaf')).toBeOnTheScreen();
  expect(screen.getByTestId('symbol-leaf').props).toMatchObject({ name: 'leaf', tintColor: palettes.light.text, accessible: false });
  expect(screen.getByRole('radio', { name: 'Just starting' })).toBeOnTheScreen();
});

test('the icon sits in a tile of its own size', async () => {
  await renderCard(<OptionCard title="Just starting" icon="leaf" selected={false} onPress={() => {}} />);
  expect(screen.getByTestId('option-icon')).toHaveStyle({ width: tokens.size.optionIcon, height: tokens.size.optionIcon });
});

test('without an icon: no tile, as before', async () => {
  await renderCard(<OptionCard title="Lose fat" selected={false} onPress={() => {}} />);
  expect(screen.queryByTestId('option-icon')).toBeNull();
});

test('pressing a card with an icon chooses it', async () => {
  const onPress = jest.fn();
  await renderCard(<OptionCard title="Just starting" icon="leaf" selected={false} onPress={onPress} />);
  await fireEvent.press(screen.getByRole('radio', { name: 'Just starting' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});
