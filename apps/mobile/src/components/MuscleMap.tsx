/**
 * The one muscle map (ADR-078 #4, ADR-075 #7): the workout's end (K-974) and Progress (K-979) draw the same thing from the
 * same data, the server's MuscleSets (each primary muscle's sets this week as a share of its weekly target). Front and
 * back (react-native-body-highlighter, MIT, as the move's screen, K-418); each area filled by its muscle's share: full at
 * the target (accent), partly below it (accentMid), planned but not trained yet (accentSoft, ADR-078 #1), every other area
 * the theme's track (an area left out keeps the drawing's own grey, which ignores the theme). Several muscles on one area
 * (the three delts) fill it by the most done. VoiceOver hears each muscle's sets this week. Nothing is counted here.
 */
import { StyleSheet, View } from 'react-native';
import Body, { type Slug } from 'react-native-body-highlighter';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { type Figure, drawingAreas } from '@/train/demo';
import { workoutParams as P } from '@/train/params';

type MuscleSets = components['schemas']['MuscleSets'];

const SIDES = ['front', 'back'] as const;
/** The drawing's size: the move screen's (exercise.tsx), two figures side by side. */
const MAP_SCALE = 0.75;

type Fill = 'full' | 'part' | 'planned';
const RANK: Record<Fill, number> = { planned: 0, part: 1, full: 2 };

function fillOf(m: MuscleSets): Fill | null {
  if (m.doneShare >= 1) return 'full';
  if (m.doneShare > 0) return 'part';
  return m.plannedShare > 0 ? 'planned' : null;
}

/** Each area of the drawing with the fullest fill of the muscles on it. */
export function areaFills(muscles: readonly MuscleSets[]): Map<string, Fill> {
  const fills = new Map<string, Fill>();
  for (const m of muscles) {
    const fill = fillOf(m);
    if (fill === null) continue;
    for (const area of P.muscleMapAreas[m.muscle] ?? []) {
      const was = fills.get(area);
      if (was === undefined || RANK[fill] > RANK[was]) fills.set(area, fill);
    }
  }
  return fills;
}

export function MuscleMap({ muscles, figure }: { muscles: readonly MuscleSets[]; figure: Figure }) {
  const { color } = useTheme();
  const fills = areaFills(muscles);
  const colours: Record<Fill, string> = { full: color.accent, part: color.accentMid, planned: color.accentSoft };
  const data = drawingAreas(figure).map((slug) => {
    const fill = fills.get(slug);
    // The areas named in muscle_map_areas are checked against the drawing (exercise-screen.test).
    return { slug: slug as Slug, color: fill === undefined ? color.track : colours[fill] };
  });
  const said = muscles
    .map((m) => t('muscleMap.item', { muscle: t(`demo.muscle.${m.muscle}`), done: m.doneSets, target: m.targetSets }))
    .join(t('demo.separator'));
  return (
    <View style={styles.map} accessible accessibilityLabel={t('muscleMap.label', { muscles: said })}>
      {SIDES.map((side) => (
        <Body key={side} data={data} side={side} gender={figure} scale={MAP_SCALE} border="none" />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flexDirection: 'row', justifyContent: 'center', gap: tokens.space.md },
});
