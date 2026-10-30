import { StyleSheet, Text, View } from 'react-native';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { type Palette, tokens } from '@/theme/tokens';

type Macro = 'protein' | 'carbs' | 'fat';
const TONE: Record<Macro, keyof Palette> = { protein: 'macroProtein', carbs: 'macroCarbs', fat: 'macroFat' };
const MACROS: Macro[] = ['protein', 'carbs', 'fat'];

/**
 * A food's macros in the portion step (Evre 7 A): one bar split by the grams of protein, carbs and fat, and under it the three figures, each
 * with its dot and name. The bar is the picture; the figures say it (the colours are never alone). The split is of grams, which are what
 * the server gave: no calories are worked out from them here (U1).
 */
export function MacroBar({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const { color } = useTheme();
  const grams = { protein, carbs, fat };
  const total = protein + carbs + fat;
  return (
    <View style={styles.part} testID="macro-bar">
      <View style={[styles.track, { backgroundColor: color.track }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {total === 0
          ? null
          : MACROS.filter((macro) => grams[macro] > 0).map((macro) => <View key={macro} style={{ flex: grams[macro], backgroundColor: color[TONE[macro]] }} />)}
      </View>
      <View style={styles.figures} accessible accessibilityLabel={t('food.macro.spoken', { protein, carbs, fat })}>
        {MACROS.map((macro) => (
          <View key={macro} style={styles.figure} testID={`macro-figure-${macro}`}>
            <View style={styles.name}>
              <View style={[styles.dot, { backgroundColor: color[TONE[macro]] }]} />
              <Text style={[styles.label, { color: color.muted }]}>{t(`food.totals.${macro}`)}</Text>
            </View>
            <Text style={[styles.value, { color: color.text }]}>{t('food.single.gramsOf', { value: grams[macro] })}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  part: { gap: tokens.space.sm },
  track: { flexDirection: 'row', height: tokens.size.swatch - 2, borderRadius: tokens.radius.track, overflow: 'hidden', gap: 2 },
  figures: { flexDirection: 'row', gap: tokens.space.md },
  figure: { flex: 1, gap: 2 },
  name: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs },
  dot: { width: tokens.size.swatch - 2, height: tokens.size.swatch - 2, borderRadius: (tokens.size.swatch - 2) / 2 },
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
  value: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold, fontVariant: ['tabular-nums'] },
});
