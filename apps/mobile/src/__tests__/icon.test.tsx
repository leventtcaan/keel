/**
 * Icon (ADR-070 Ek 2 #3, K-1041): one SF Symbols weight (medium), two sizes (20, 24), the colour from the theme. Decorative
 * (hidden from VoiceOver) unless it has a label, because an icon beside a text label would say the same thing twice.
 */
import { render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { Icon } from '@/components/Icon';
import { ThemeProvider } from '@/theme/theme';
import { type ColorScheme, palettes, tokens } from '@/theme/tokens';

jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  return { SymbolView: (props: object) => createElement('SymbolView', { ...props, testID: 'symbol' }) };
});

const renderIn = (scheme: ColorScheme, ui: ReactElement) => render(<ThemeProvider scheme={scheme}>{ui}</ThemeProvider>);

describe.each(['light', 'dark'] as ColorScheme[])('in the %s theme', (scheme) => {
  const p = palettes[scheme];

  test('passes the name, the medium weight, the regular size and the ink colour by default', async () => {
    await renderIn(scheme, <Icon name="scalemass" />);
    expect(screen.getByTestId('symbol').props).toMatchObject({
      name: 'scalemass',
      weight: tokens.icon.weight,
      size: tokens.icon.regular,
      tintColor: p.text,
    });
  });

  test.each([
    ['small', 'muted'],
    ['regular', 'accent'],
    ['regular', 'warn'],
  ] as const)('a %s icon in %s takes that colour from the palette', async (size, colour) => {
    await renderIn(scheme, <Icon name="trash" size={size} tone={colour} />);
    expect(screen.getByTestId('symbol').props).toMatchObject({ size: tokens.icon[size], tintColor: p[colour] });
  });
});

test('the weight is medium and the two sizes are 20 and 24 (ADR-070 Ek 2 #3)', () => {
  expect(tokens.icon).toEqual({ small: 20, regular: 24, weight: 'medium' });
});

describe('accessibility', () => {
  test('without a label the icon is hidden from VoiceOver', async () => {
    await renderIn('light', <Icon name="plus" />);
    expect(screen.getByTestId('symbol').props).toMatchObject({ accessible: false });
    expect(screen.getByTestId('symbol').props.accessibilityLabel).toBeUndefined();
  });

  test('with a label it is an image VoiceOver reads', async () => {
    await renderIn('light', <Icon name="checkmark.circle.fill" label="Saved" />);
    expect(screen.getByTestId('symbol').props).toMatchObject({ accessible: true, accessibilityRole: 'image', accessibilityLabel: 'Saved' });
  });
});
