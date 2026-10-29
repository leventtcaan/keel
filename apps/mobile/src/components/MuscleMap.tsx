/**
 * The one muscle map (ADR-078 #4, ADR-075 #7): the workout's end (K-974) and Progress (K-979) draw the same thing from the
 * same data, the server's MuscleSets (each primary muscle's sets this week as a share of its weekly target). Front and
 * back (react-native-body-highlighter, MIT, as the move's screen, K-418); each area filled by its muscle's share: full at
 * the target (accent), partly below it (accentMid), planned but not trained yet (accentSoft, ADR-078 #1), every other area
 * the theme's track (an area left out keeps the drawing's own grey, which ignores the theme). Several muscles on one area
 * (the three delts) fill it by the most done. VoiceOver hears each muscle's sets this week. Nothing is counted here.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Body, { type Slug } from 'react-native-body-highlighter';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from '@/motion/reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { useReduceMotion } from '@/theme/useReduceMotion';
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

type Drawn = { slug: Slug; color: string }[];

/** One drawing of the figure, front and back, each area in the colour it is given. */
function Figures({ data, figure }: { data: Drawn; figure: Figure }) {
  return (
    <>
      {SIDES.map((side) => (
        <Body key={side} data={data} side={side} gender={figure} scale={MAP_SCALE} border="none" />
      ))}
    </>
  );
}

export function MuscleMap({ muscles, figure }: { muscles: readonly MuscleSets[]; figure: Figure }) {
  const { color } = useTheme();
  const reduce = useReduceMotion();
  const fills = areaFills(muscles);
  const colours: Record<Fill, string> = { full: color.accent, part: color.accentMid, planned: color.accentSoft };
  const data: Drawn = drawingAreas(figure).map((slug) => {
    const fill = fills.get(slug);
    // The areas named in muscle_map_areas are checked against the drawing (exercise-screen.test).
    return { slug: slug as Slug, color: fill === undefined ? color.track : colours[fill] };
  });
  // When the data changes the old drawing stays over the new one and fades out (K-1065): every area eases from its colour to
  // the next together. Nothing is drawn twice at rest; Reduce Motion changes it at once.
  const key = data.map((d) => d.color).join();
  const [drawn, setDrawn] = useState<{ key: string; data: Drawn; before: Drawn | null }>({ key, data, before: null });
  if (drawn.key !== key) setDrawn({ key, data, before: reduce ? null : drawn.data });
  const fade = useSharedValue(1);
  const fading = drawn.before !== null;
  useEffect(() => {
    if (!fading) return;
    const finish = () => setDrawn((now) => (now.key === key ? { ...now, before: null } : now));
    fade.set(1);
    fade.set(
      withTiming(0, { duration: tokens.motion.mapMs, easing: Easing.inOut(Easing.ease) }, (finished) => {
        'worklet';
        if (finished) scheduleOnRN(finish);
      }),
    );
  }, [fading, key, fade]);
  const over = useAnimatedStyle(() => ({ opacity: fade.value }));
  const said = muscles
    .map((m) => t('muscleMap.item', { muscle: t(`demo.muscle.${m.muscle}`), done: m.doneSets, target: m.targetSets }))
    .join(t('demo.separator'));
  const old =
    drawn.before === null ? null : (
      <Animated.View pointerEvents="none" style={[styles.over, over]}>
        <Figures data={drawn.before} figure={figure} />
      </Animated.View>
    );
  return (
    <View style={styles.map} accessible accessibilityLabel={t('muscleMap.label', { muscles: said })}>
      {old}
      <Figures data={data} figure={figure} />
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flexDirection: 'row', justifyContent: 'center', gap: tokens.space.md },
  // The old drawing over the new, the same size and place; rendered first in the tree, so the new is what is read last.
  over: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'center', gap: tokens.space.md, zIndex: 1 },
});
