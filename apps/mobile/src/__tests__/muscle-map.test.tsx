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
type BodyData = readonly { slug?: string; color?: string }[];
type BodyProps = { side?: string; data: BodyData; gender?: string; scale?: number; onBodyPartPress?: (part: { slug?: string }) => void };
const mockBody = jest.fn((_props: BodyProps) => null);
jest.mock('react-native-body-highlighter', () => ({ __esModule: true, default: (props: BodyProps) => mockBody(props) }));

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

test('several muscles on one area: the most done fills it, whichever comes first', async () => {
  await render(
    <ThemeProvider>
      <MuscleMap muscles={[sets('side_delts', 10), sets('front_delts', 2), sets('rear_delts', 0, 4)]} figure="male" />
    </ThemeProvider>,
  );
  expect(colourOf('deltoids')).toBe(palettes.light.accent);
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

// K-1246 (ADR-094 Ek 3 #5): on Progress a muscle is touched on the map; the map says which of the muscles sent are on that area.
test('an area pressed names the muscles on it, in the order they were sent; an area without one says nothing', async () => {
  const onPress = jest.fn();
  await render(
    <ThemeProvider>
      <MuscleMap muscles={[sets('side_delts', 3), sets('chest', 4), sets('front_delts', 2)]} figure="male" onPress={onPress} />
    </ThemeProvider>,
  );
  const press = mockBody.mock.calls.at(-1)?.[0].onBodyPartPress;
  press?.({ slug: 'deltoids' });
  expect(onPress).toHaveBeenLastCalledWith(['side_delts', 'front_delts']);
  press?.({ slug: 'chest' });
  expect(onPress).toHaveBeenLastCalledWith(['chest']);
  onPress.mockClear();
  press?.({ slug: 'head' });
  press?.({ slug: 'quadriceps' });
  expect(onPress).not.toHaveBeenCalled();
});

test('without a press to answer (the workout end) the drawing takes no touch', async () => {
  await render(
    <ThemeProvider>
      <MuscleMap muscles={[sets('chest', 4)]} figure="male" />
    </ThemeProvider>,
  );
  expect(mockBody.mock.calls.every(([p]) => p.onBodyPartPress === undefined)).toBe(true);
});

test('drawn smaller where it is asked to be (Progress), the workout end keeps its size', async () => {
  await render(
    <ThemeProvider>
      <MuscleMap muscles={[sets('chest', 4)]} figure="male" />
      <MuscleMap muscles={[sets('chest', 4)]} figure="male" small />
    </ThemeProvider>,
  );
  const scales = mockBody.mock.calls.map(([p]) => p.scale);
  expect(scales[0]).toBeGreaterThan(scales[2] as number);
});
