import { StyleSheet, Text, View } from 'react-native';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { type Palette, tokens } from '@/theme/tokens';

type Macro = 'protein' | 'carbs' | 'fat';
const TONE: Record<Macro, keyof Palette> = { protein: 'macroProtein', carbs: 'macroCarbs', fat: 'macroFat' };

type Props = {
  protein: number;
  /** A suggestion read from an older server carries only protein: the others are then not drawn, never drawn as 0. */
  carbs?: number;
  fat?: number;
  testID?: string;
};

/**
 * A food's macros as three small marks (Evre 7 A): a dot in the macro's own colour (the same three everywhere in the app) and its letter
 * and grams ("P 7"). The colour is never alone: the letter says which, and a screen reader hears the whole line in words.
 */
export function MacroChips({ protein, carbs, fat, testID }: Props) {
  const { color } = useTheme();
  const parts: { macro: Macro; value: number }[] = [
    { macro: 'protein', value: protein },
    ...(carbs === undefined ? [] : [{ macro: 'carbs' as const, value: carbs }]),
    ...(fat === undefined ? [] : [{ macro: 'fat' as const, value: fat }]),
  ];
  const spoken =
    carbs === undefined || fat === undefined
      ? t('food.macro.spokenProtein', { protein })
      : t('food.macro.spoken', { protein, carbs, fat });
  return (
    <View testID={testID} accessible accessibilityLabel={spoken} style={styles.row}>
      {parts.map(({ macro, value }) => (
        <View key={macro} style={styles.part}>
          <View style={[styles.dot, { backgroundColor: color[TONE[macro]] }]} />
          <Text style={[styles.text, { color: color.muted }]}>{t(`food.macro.${macro}`, { value })}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md },
  part: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs },
  dot: { width: tokens.size.swatch - 2, height: tokens.size.swatch - 2, borderRadius: (tokens.size.swatch - 2) / 2 },
  text: { fontSize: tokens.type.label, fontVariant: ['tabular-nums'] },
});
