import { useRouter } from 'expo-router';
import type { Ref } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

const GLYPH = 22;

/** How much room a tab's scrolling content leaves at its foot, so its last row is never under the "+" (K-1050). */
export const PLUS_CLEARANCE = tokens.size.primaryButton + tokens.space.md + tokens.space.lg;

/**
 * The one "+" (ADR-069 #4, prototype #plus): on every tab, at the bottom right above the tab bar, it opens the log sheet
 * (weigh-in, meal, workout, life got in the way). Turquoise, the only accent besides the selected tab (ADR-070 #9).
 * It floats over the content (K-1050): placed in the tab's frame, not a strip of its own, so nothing beside it hides the
 * rows scrolling under it; only the button takes touches.
 */
export function PlusEntry({ buttonRef }: { buttonRef?: Ref<View> } = {}) {
  const { color } = useTheme();
  const router = useRouter();
  return (
    <View testID="plus" style={styles.float} pointerEvents="box-none">
      <Pressable
        ref={buttonRef}
        accessibilityRole="button"
        accessibilityLabel={t('plus.entry')}
        onPress={() => router.push('/plus')}
        style={({ pressed }) => [styles.button, { backgroundColor: color.accent, shadowColor: color.shadow }, pressed && styles.pressed]}>
        <Svg width={GLYPH} height={GLYPH} viewBox="0 0 22 22" accessible={false}>
          <Path d="M11 3v16M3 11h16" stroke={color.onAccent} strokeWidth={2.6} strokeLinecap="round" />
        </Svg>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  float: { position: 'absolute', right: tokens.space.lg, bottom: tokens.space.md },
  button: {
    width: tokens.size.primaryButton,
    height: tokens.size.primaryButton,
    borderRadius: tokens.size.primaryButton / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: tokens.float.opacity,
    shadowRadius: tokens.float.blur,
    shadowOffset: { width: 0, height: tokens.float.offsetY },
  },
  pressed: { opacity: tokens.opacity.dim },
});
