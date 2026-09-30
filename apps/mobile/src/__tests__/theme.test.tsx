/**
 * The theme follows the phone's appearance (ADR-016) and the decision block flips it (inverse surface).
 */
import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { InverseSurface, inverse, ThemeProvider, useTheme } from '@/theme/theme';
import { palettes } from '@/theme/tokens';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));
const mockScheme = useColorScheme as jest.Mock;

function inProvider(extra?: (children: ReactNode) => ReactNode) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <ThemeProvider>{extra ? extra(children) : children}</ThemeProvider>;
  };
}

test.each([
  ['light', palettes.light],
  ['dark', palettes.dark],
] as const)('the %s phone setting selects the %s palette', async (scheme, palette) => {
  mockScheme.mockReturnValue(scheme);
  const { result } = await renderHook(() => useTheme(), { wrapper: inProvider() });
  expect(result.current.scheme).toBe(scheme);
  expect(result.current.color).toEqual(palette);
});

test('an unspecified phone setting falls back to light', async () => {
  mockScheme.mockReturnValue('unspecified');
  const { result } = await renderHook(() => useTheme(), { wrapper: inProvider() });
  expect(result.current.scheme).toBe('light');
});

test('an explicit scheme overrides the phone setting', async () => {
  mockScheme.mockReturnValue('light');
  const { result } = await renderHook(() => useTheme(), {
    wrapper: ({ children }: { children: ReactNode }) => <ThemeProvider scheme="dark">{children}</ThemeProvider>,
  });
  expect(result.current.color).toEqual(palettes.dark);
});

test('useTheme outside a provider fails loudly instead of guessing a palette', async () => {
  const quiet = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    await expect(renderHook(() => useTheme())).rejects.toThrow(/ThemeProvider/);
  } finally {
    quiet.mockRestore();
  }
});

describe.each(Object.entries(palettes))('inverse of the %s palette', (_, p) => {
  const inv = inverse(p);

  test('text, surfaces, lines and accent take the decision-block values; nothing else changes', () => {
    expect(inv).toEqual({
      ...p,
      background: p.decisionBackground,
      // The block has no separate surface: a card or chip inside it sits on the block itself.
      surface: p.decisionBackground,
      raise: p.decisionLine,
      text: p.decisionText,
      textSecondary: p.decisionTextSecondary,
      muted: p.decisionMuted,
      line: p.decisionLine,
      track: p.decisionLine,
      accent: p.accentInk,
      onAccent: p.onAccentInk,
    });
  });

  test('warnings keep their colour inside the block', () => {
    expect(inv.warn).toBe(p.warn);
  });
});

test('InverseSurface gives its children the inverse palette', async () => {
  mockScheme.mockReturnValue('dark');
  const { result } = await renderHook(() => useTheme(), {
    wrapper: inProvider((children) => <InverseSurface>{children}</InverseSurface>),
  });
  expect(result.current.color).toEqual(inverse(palettes.dark));
  expect(result.current.scheme).toBe('dark');
});
