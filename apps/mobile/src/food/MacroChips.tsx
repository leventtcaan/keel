import { StyleSheet, Text, View } from 'react-native';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Macro = 'protein' | 'carbs' | 'fat';

type Props = {
  protein: number;
  /** A suggestion read from an older server carries only protein: the others are then not drawn, never drawn as 0. */
  carbs?: number;
  fat?: number;
  testID?: string;
};

/**
 * A food's macros as three quiet figures (Evre 7 A, ADR-094 Ek 4 #5): the macro's letter and its grams ("P 7 · K 20 · Y 4"), in the muted
 * text colour. No coloured mark: colour belongs to the roles of ADR-094 §1. A screen reader hears the whole line in words.
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
        <Text key={macro} style={[styles.text, { color: color.muted }]}>
          {t(`food.macro.${macro}`, { value })}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md },
  text: { fontSize: tokens.type.label, fontVariant: ['tabular-nums'] },
});
