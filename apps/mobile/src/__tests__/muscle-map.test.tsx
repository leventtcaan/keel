/**
 * The one muscle map (ADR-078 #4, ADR-075 #7; the workout's end and Progress, K-974, K-979): front and back, each area
 * filled by the server's share of its muscle's weekly target (MuscleSets): full at the target, partly below it, the
 * planned-only muscles marked lightly, every other area the theme's track (the drawing's own grey ignores the theme).
 * Several muscles on one area (the three delts) fill it by the most done. Said to VoiceOver as each muscle's sets.
 */
import { render, screen } from '@testing-library/react-native';

import type { components } from '@/api/schema';
import { MuscleMap } from '@/components/MuscleMap';
import { t } from '@/copy';
import { FocusMode, ThemeProvider } from '@/theme/theme';
import { focusPalette, palettes } from '@/theme/tokens';

type Schemas = components['schemas'];
type BodyData = ReadonlyArray<{ slug?: string; color?: string }>;
const mockBody = jest.fn((_props: { side?: string; data: BodyData; gender?: string }) => null);
jest.mock('react-native-body-highlighter', () => ({ __esModule: true, default: (props: { side?: string; data: BodyData; gender?: string }) => mockBody(props) }));

const sets = (muscle: string, doneSets: number, plannedSets = 10, targetSets = 10): Schemas['MuscleSets'] => ({
  muscle,
  plannedSets,
  doneSets,
  targetSets,
  plannedShare: Math.min(1, plannedSets / targetSets),
  doneShare: Math.min(1, doneSets / targetSets),
});

beforeEach(() => mockBody.mockClear());

const colourOf = (slug: string) => mockBody.mock.calls.at(-1)?.[0].data.find((d) => d.slug === slug)?.color;

test('front and back, in the figure asked for', async () => {
  await render(
    <ThemeProvider>
      <MuscleMap muscles={[sets('chest', 4)]} figure="female" />
    </ThemeProvider>,
  );
  expect(mockBody.mock.calls.map(([p]) => p.side)).toEqual(['front', 'back']);
  expect(mockBody.mock.calls.every(([p]) => p.gender === 'female')).toBe(true);
});

test('an area fills by its share: full at the target, partly below, lightly when only planned; the rest is track', async () => {
  const p = palettes.light;
  await render(
    <ThemeProvider>
      <MuscleMap muscles={[sets('chest', 10), sets('quads', 4), sets('hamstrings', 0, 6)]} figure="male" />
    </ThemeProvider>,
  );
  expect(colourOf('chest')).toBe(p.accent);
  expect(colourOf('quadriceps')).toBe(p.accentMid);
  expect(colourOf('hamstring')).toBe(p.accentSoft);
  expect(colourOf('calves')).toBe(p.track);
  expect(colourOf('head')).toBe(p.track);
});

test('several muscles on one area: the most done fills it', async () => {
  await render(
    <ThemeProvider>
      <MuscleMap muscles={[sets('front_delts', 2), sets('side_delts', 10)]} figure="male" />
    </ThemeProvider>,
  );
  expect(colourOf('deltoids')).toBe(palettes.light.accent);
});

test('in focus mode, the focus palette', async () => {
  await render(
    <ThemeProvider>
      <FocusMode>
        <MuscleMap muscles={[sets('chest', 3)]} figure="male" />
      </FocusMode>
    </ThemeProvider>,
  );
  expect(colourOf('chest')).toBe(focusPalette.accentMid);
});

test("said to VoiceOver as each muscle's sets this week", async () => {
  await render(
    <ThemeProvider>
      <MuscleMap muscles={[sets('chest', 6), sets('quads', 4, 8, 10)]} figure="male" />
    </ThemeProvider>,
  );
  const said = [t('muscleMap.item', { muscle: 'Chest', done: 6, target: 10 }), t('muscleMap.item', { muscle: 'Quads', done: 4, target: 10 })].join(t('demo.separator'));
  expect(screen.getByLabelText(t('muscleMap.label', { muscles: said }))).toBeTruthy();
});
