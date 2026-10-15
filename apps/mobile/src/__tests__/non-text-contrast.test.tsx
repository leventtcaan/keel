/**
 * K-816 (WCAG 1.4.11): the marks that show a control or its state are drawn in the colours contrast.test.ts holds to 3:1.
 * The ratios live there; this file holds that the screens use them, so a later edit cannot go back to the quiet `line`.
 */
import { render, screen } from '@testing-library/react-native';
import { readFileSync } from 'fs';
import { join } from 'path';

import { MuscleBars, WeighInDots } from '@/progress/Parts';
import { ThemeProvider } from '@/theme/theme';
import { type ColorScheme, palettes } from '@/theme/tokens';
import { MoveDots } from '@/train/MoveDots';

const schemes: ColorScheme[] = ['light', 'dark'];

describe.each(schemes)('%s theme', (scheme) => {
  const p = palettes[scheme];

  test('a move not yet done is a dot in the control edge, not the 1.3:1 line', async () => {
    await render(
      <ThemeProvider scheme={scheme}>
        <MoveDots
          selected={0}
          onPick={() => {}}
          dots={[
            { id: 'a', name: 'Bench', status: 'now', done: false },
            { id: 'b', name: 'Row', status: 'next', done: false },
            { id: 'c', name: 'Squat', status: 'done', done: true },
          ]}
        />
      </ThemeProvider>,
    );
    const dot = (name: string) => screen.getByRole('button', { name: new RegExp(name) }).children[0];
    expect(dot('Bench')).toHaveStyle({ backgroundColor: p.accent });
    expect(dot('Row')).toHaveStyle({ backgroundColor: p.edge });
    expect(dot('Squat')).toHaveStyle({ backgroundColor: p.text });
  });

  test('a weigh-in not yet made is an outlined dot in the control edge', async () => {
    await render(
      <ThemeProvider scheme={scheme}>
        <WeighInDots count={1} min={3} note={null} />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('weight-dot-filled')).toHaveStyle({ backgroundColor: p.accent });
    for (const dot of screen.getAllByTestId('weight-dot-empty')) expect(dot).toHaveStyle({ borderColor: p.edge });
  });

  test('the track of a muscle\'s sets bar is outlined in the control edge', async () => {
    await render(
      <ThemeProvider scheme={scheme}>
        <MuscleBars muscles={[{ muscle: 'quads', plannedSets: 10, doneSets: 6, targetSets: 10, plannedShare: 1, doneShare: 0.6 }]} />
      </ThemeProvider>,
    );
    // The bar row is name, track, count: the track is the middle child.
    expect(screen.getByTestId('muscle-bar-quads').children[1]).toHaveStyle({ backgroundColor: p.track, borderColor: p.edge });
  });
});

// Controls drawn by an outline have no fill to tell them apart: their outline is the control edge (3:1), never the divider.
const OUTLINED = [
  'components/CoachEntry.tsx',
  'components/Chip.tsx',
  'components/TextField.tsx',
  'components/ProgressBar.tsx',
  'onboarding/StepFrame.tsx',
  'app/onboarding/days.tsx',
  'app/onboarding/preparing.tsx',
  'app/workout-end.tsx',
  'progress/Parts.tsx',
  'train/MoveDots.tsx',
];

test.each(OUTLINED)('%s draws its control outline in the control edge', (file) => {
  const source = readFileSync(join(__dirname, '..', file), 'utf8');
  expect(source).toContain('color.edge');
  expect(source).not.toMatch(/borderColor: color\.line|: color\.line\b/);
});

test('a tappable row filled with the soft accent has the accent ring around it (1.1:1 fill alone)', () => {
  const source = readFileSync(join(__dirname, '..', 'app/(tabs)/train.tsx'), 'utf8');
  expect(source).toMatch(/backgroundColor: color\.accentSoft, borderColor: color\.accent/);
});
