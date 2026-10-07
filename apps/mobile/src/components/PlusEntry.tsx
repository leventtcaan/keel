import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

const GLYPH = 22;

/**
 * The one "+" (ADR-069 #4, prototype #plus): on every tab, at the bottom right above the tab bar, it opens the log sheet
 * (weigh-in, meal, workout, life got in the way). Turquoise, the only accent besides the selected tab (ADR-070 #9).
 */
export function PlusEntry() {
  const { color } = useTheme();
  const router = useRouter();
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('plus.entry')}
        onPress={() => router.push('/plus')}
        style={({ pressed }) => [styles.button, { backgroundColor: color.accent }, pressed && styles.pressed]}>
        <Svg width={GLYPH} height={GLYPH} viewBox="0 0 22 22" accessible={false}>
          <Path d="M11 3v16M3 11h16" stroke={color.onAccent} strokeWidth={2.6} strokeLinecap="round" />
        </Svg>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'flex-end' },
  button: {
    width: tokens.size.primaryButton,
    height: tokens.size.primaryButton,
    borderRadius: tokens.size.primaryButton / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: tokens.opacity.dim },
});
