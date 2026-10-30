/**
 * A muscle group as a small body: the group's areas in the accent, the rest of the figure in the theme's track colour (Evre 7 B2).
 * The same drawing as the move screen's muscle map (react-native-body-highlighter), at chip size. Decorative: the chip's label says
 * the group, so a screen reader passes over it.
 */
import { StyleSheet, View } from 'react-native';
import Body, { type Slug } from 'react-native-body-highlighter';

import { useTheme } from '@/theme/theme';

import { drawingAreas } from './demo';
import { workoutParams as P } from './params';

/** The drawing is 200 by 400 at scale 1; the glyph is a tenth of that and a half again. */
const SCALE = 0.075;

export function MuscleGlyph({ group, tone }: { group: string; tone?: string }) {
  const { color } = useTheme();
  const muscles = P.movePickerGroups[group] ?? [];
  const marked = new Set(muscles.flatMap((muscle) => P.muscleMapAreas[muscle] ?? []));
  // The back is seen from behind; the others from the front.
  const side = group === 'back' ? 'back' : 'front';
  const data = drawingAreas('male').map((slug) => ({ slug: slug as Slug, color: marked.has(slug) ? color.accent : (tone ?? color.track) }));
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.glyph}>
      <Body data={data} side={side} gender="male" scale={SCALE} border="none" />
    </View>
  );
}

const styles = StyleSheet.create({ glyph: { alignItems: 'center', justifyContent: 'center' } });
