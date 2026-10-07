/**
 * The theme is the person's choice, Light until they pick (ADR-070 #3); System follows the phone. The decision block
 * flips it (inverse surface) and the workout's focus mode is always dark (ADR-070 #4).
 */
import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { FocusMode, InverseSurface, inverse, ThemeProvider, useTheme } from '@/theme/theme';
import { palettes } from '@/theme/tokens';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));
const mockScheme = useColorScheme as jest.Mock;

function inProvider() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <ThemeProvider>{children}</ThemeProvider>;
  };
}

test('nothing chosen: light, even on a phone set to dark', async () => {
  mockScheme.mockReturnValue('dark');
  const { result } = await renderHook(() => useTheme(), { wrapper: inProvider() });
  expect(result.current.scheme).toBe('light');
  expect(result.current.color).toEqual(palettes.light);
});

test.each([
  ['light', 'dark'],
  ['dark', 'light'],
] as const)('choosing %s overrides a phone set to %s', async (choice, phone) => {
  mockScheme.mockReturnValue(phone);
  const { result } = await renderHook(() => useTheme(), {
    wrapper: ({ children }: { children: ReactNode }) => <ThemeProvider appearance={choice}>{children}</ThemeProvider>,
  });
  expect(result.current.scheme).toBe(choice);
  expect(result.current.color).toEqual(palettes[choice]);
});

test.each([
  ['light', palettes.light],
  ['dark', palettes.dark],
] as const)('System follows the phone: %s', async (scheme, palette) => {
  mockScheme.mockReturnValue(scheme);
  const { result } = await renderHook(() => useTheme(), {
    wrapper: ({ children }: { children: ReactNode }) => <ThemeProvider appearance="system">{children}</ThemeProvider>,
  });
  expect(result.current.scheme).toBe(scheme);
  expect(result.current.color).toEqual(palette);
});

test('System with an unspecified phone setting falls back to light', async () => {
  mockScheme.mockReturnValue('unspecified');
  const { result } = await renderHook(() => useTheme(), {
    wrapper: ({ children }: { children: ReactNode }) => <ThemeProvider appearance="system">{children}</ThemeProvider>,
  });
  expect(result.current.scheme).toBe('light');
});

test.each(['light', 'dark', 'system'] as const)('focus mode is dark whatever the choice (%s)', async (choice) => {
  mockScheme.mockReturnValue('light');
  const { result } = await renderHook(() => useTheme(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <ThemeProvider appearance={choice}>
        <FocusMode>{children}</FocusMode>
      </ThemeProvider>
    ),
  });
  expect(result.current.scheme).toBe('dark');
  expect(result.current.color).toEqual(palettes.dark);
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
      // A primary button inside the block takes the block's accent: the page's black button would vanish on a black block.
      cta: p.accentInk,
      onCta: p.onAccentInk,
      accentSoft: p.decisionLine,
    });
  });

  test('warnings keep their colour inside the block', () => {
    expect(inv.warn).toBe(p.warn);
  });
});

test('InverseSurface gives its children the inverse palette', async () => {
  const { result } = await renderHook(() => useTheme(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <ThemeProvider appearance="dark">
        <InverseSurface>{children}</InverseSurface>
      </ThemeProvider>
    ),
  });
  expect(result.current.color).toEqual(inverse(palettes.dark));
  expect(result.current.scheme).toBe('dark');
});
