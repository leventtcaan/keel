/**
 * The four button roles (ADR-070 Ek 2 #1, K-1041): primary, secondary, text, destructive. The look comes from the role, in
 * the colours of the palette (never repeated here). `ghost` and `warn` are the old names and draw as secondary and
 * destructive, so the 160-odd call sites that use them change look without an edit.
 */
import { render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { StyleSheet } from 'react-native';

import { Button, type ButtonVariant } from '@/components/Button';
import { DecisionBlock } from '@/components/DecisionBlock';
import { FocusMode, ThemeProvider } from '@/theme/theme';
import { type ColorScheme, focusPalette, palettes, tokens } from '@/theme/tokens';

const schemes: ColorScheme[] = ['light', 'dark'];

const renderIn = (scheme: ColorScheme, ui: ReactElement) => render(<ThemeProvider scheme={scheme}>{ui}</ThemeProvider>);
const drawn = (name: string) => StyleSheet.flatten(screen.getByRole('button', { name }).props.style) ?? {};
const inkOf = (label: string) => StyleSheet.flatten(screen.getByText(label).props.style) ?? {};

describe.each(schemes)('roles in the %s theme', (scheme) => {
  const p = palettes[scheme];

  test('primary is the cta fill with the onCta label, 54 pt tall at the medium size', async () => {
    await renderIn(scheme, <Button label="Go" onPress={() => {}} />);
    expect(drawn('Go')).toMatchObject({ backgroundColor: p.cta, borderRadius: tokens.radius.button, minHeight: tokens.size.primaryButton });
    expect(inkOf('Go').color).toBe(p.onCta);
    // On light the cta is black, not the turquoise accent (ADR-070 #2); on dark they are the same turquoise.
    if (scheme === 'light') expect(drawn('Go').backgroundColor).not.toBe(p.accent);
  });

  test('secondary is a surface fill with the ink label and no outline', async () => {
    await renderIn(scheme, <Button label="Later" variant="secondary" onPress={() => {}} />);
    expect(drawn('Later')).toMatchObject({ backgroundColor: p.surface, minHeight: tokens.size.primaryButton });
    expect(drawn('Later').borderWidth ?? 0).toBe(0);
    expect(drawn('Later').borderColor).toBeUndefined();
    expect(inkOf('Later').color).toBe(p.text);
  });

  test('text is the accent as words only: no fill, no outline, at least size.touch tall', async () => {
    await renderIn(scheme, <Button label="Edit" variant="text" onPress={() => {}} />);
    expect(drawn('Edit').backgroundColor).toBeUndefined();
    expect(drawn('Edit').borderWidth ?? 0).toBe(0);
    expect(drawn('Edit').minHeight).toBeGreaterThanOrEqual(tokens.size.touch);
    expect(inkOf('Edit').color).toBe(p.accent);
  });

  test('destructive is the warning colour as words only: no fill, at least size.touch tall', async () => {
    await renderIn(scheme, <Button label="Delete" variant="destructive" onPress={() => {}} />);
    expect(drawn('Delete').backgroundColor).toBeUndefined();
    expect(drawn('Delete').borderWidth ?? 0).toBe(0);
    expect(drawn('Delete').minHeight).toBeGreaterThanOrEqual(tokens.size.touch);
    expect(inkOf('Delete').color).toBe(p.warn);
  });

  test.each([
    ['ghost', 'secondary'],
    ['warn', 'destructive'],
  ] as [ButtonVariant, ButtonVariant][])('the old name %s is drawn exactly as %s', async (old, role) => {
    const first = await renderIn(scheme, <Button label="Old" variant={old} onPress={() => {}} />);
    const before = { box: drawn('Old'), ink: inkOf('Old') };
    await first.unmount();
    await renderIn(scheme, <Button label="Old" variant={role} onPress={() => {}} />);
    expect(drawn('Old')).toEqual(before.box);
    expect(inkOf('Old')).toEqual(before.ink);
  });

  test('the old ghost has no outline any more and the old warn no fill', async () => {
    await renderIn(
      scheme,
      <>
        <Button label="Ghost" variant="ghost" onPress={() => {}} />
        <Button label="Warn" variant="warn" onPress={() => {}} />
      </>,
    );
    expect(drawn('Ghost').borderWidth ?? 0).toBe(0);
    expect(drawn('Warn').backgroundColor).toBeUndefined();
  });
});

describe('sizes keep their meaning', () => {
  test('a small primary stays compact (its reach is widened by hitSlop), a touch one is size.touch tall', async () => {
    await renderIn(
      'light',
      <>
        <Button label="Small" size="sm" onPress={() => {}} />
        <Button label="Touch" size="touch" variant="secondary" onPress={() => {}} />
      </>,
    );
    expect(drawn('Small').minHeight).toBeUndefined();
    expect(drawn('Small').alignSelf).toBe('flex-start');
    expect(drawn('Touch').minHeight).toBe(tokens.size.touch);
  });
});

describe('where the colours come from', () => {
  test('in the focus mode (the workout) the primary button is turquoise even on a light page', async () => {
    await renderIn(
      'light',
      <FocusMode>
        <Button label="Log set" onPress={() => {}} />
      </FocusMode>,
    );
    expect(drawn('Log set').backgroundColor).toBe(focusPalette.cta);
    expect(drawn('Log set').backgroundColor).toBe(palettes.dark.accent);
    expect(inkOf('Log set').color).toBe(focusPalette.onCta);
  });

  test.each(schemes)('inside the decision block (%s) a primary takes the block accent and a secondary the block line', async (scheme) => {
    const p = palettes[scheme];
    await renderIn(
      scheme,
      <DecisionBlock title="t">
        <Button label="Apply" onPress={() => {}} />
        <Button label="Why" variant="secondary" onPress={() => {}} />
      </DecisionBlock>,
    );
    expect(drawn('Apply').backgroundColor).toBe(p.accentInk);
    expect(inkOf('Apply').color).toBe(p.onAccentInk);
    // The block has no surface of its own (inverse()), so a secondary button there is filled with the block's line.
    expect(drawn('Why').backgroundColor).toBe(p.decisionLine);
    expect(inkOf('Why').color).toBe(p.decisionText);
  });
});
