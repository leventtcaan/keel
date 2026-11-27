import { StyleSheet, Text, View } from 'react-native';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Macro = 'protein' | 'carbs' | 'fat';
const MACROS: Macro[] = ['protein', 'carbs', 'fat'];

/**
 * A food's macros in the portion step (Evre 7 A, ADR-094 Ek 4 #5): the three figures side by side, each its name over its grams, as the
 * server gave them (U1). No coloured bar and no coloured dots: colour belongs to the roles of ADR-094 §1.
 */
export function MacroBar({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const { color } = useTheme();
  const grams = { protein, carbs, fat };
  return (
    <View style={styles.part} testID="macro-bar">
      <View style={styles.figures} accessible accessibilityLabel={t('food.macro.spoken', { protein, carbs, fat })}>
        {MACROS.map((macro) => (
          <View key={macro} style={styles.figure} testID={`macro-figure-${macro}`}>
            <Text style={[styles.label, { color: color.muted }]}>{t(`food.totals.${macro}`)}</Text>
            <Text style={[styles.value, { color: color.text }]}>{t('food.single.gramsOf', { value: grams[macro] })}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  part: { gap: tokens.space.sm },
  figures: { flexDirection: 'row', gap: tokens.space.md },
  figure: { flex: 1, gap: 2 },
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
  value: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold, fontVariant: ['tabular-nums'] },
});
