/**
 * The onboarding's day tiles (ADR-094 §1): the chosen count is a selection, petrol on its soft ground with a petrol ring,
 * told apart from the others by more than its spoken state.
 */
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { t } from '@/copy';
import { DayTiles } from '@/onboarding/DayTiles';
import { offeredDayCounts } from '@/onboarding/params';
import { ThemeProvider } from '@/theme/theme';
import { type ColorScheme, palettes } from '@/theme/tokens';

describe.each(['light', 'dark'] as ColorScheme[])('%s theme', (scheme) => {
  const p = palettes[scheme];
  const [chosen, other] = offeredDayCounts;

  test('the chosen tile is petrol on its soft ground; the others are the page with the control edge', async () => {
    await render(
      <ThemeProvider scheme={scheme}>
        <DayTiles chosen={chosen} onChoose={() => {}} />
      </ThemeProvider>,
    );
    const tile = (count: number) => StyleSheet.flatten(screen.getByRole('radio', { name: t('onboarding.days.label', { count }) }).props.style);
    expect(tile(chosen)).toMatchObject({ backgroundColor: p.accentSoft, borderColor: p.accent });
    expect(tile(other)).toMatchObject({ backgroundColor: p.background, borderColor: p.edge });
    expect(tile(chosen).backgroundColor).not.toBe(tile(other).backgroundColor);
    expect(StyleSheet.flatten(screen.getByText(String(chosen)).props.style).color).toBe(p.accent);
  });
});
