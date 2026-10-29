import type { ComponentProps, ReactNode } from 'react';
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/** The name of an SF Symbol, as Icon takes it. */
export type IconName = ComponentProps<typeof Icon>['name'];

/**
 * The few pieces drawn over the live picture (K-1055): a dark translucent ground so a word or an icon reads on any scene,
 * the camera being whatever the room is. The ground is a layer of its own: a parent's `opacity` would fade the words too.
 * The caller's `style` gives the shape (radius, padding) and clips the ground to it.
 */
export function Scrim({ children, style }: { children?: ReactNode; style: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <Ground />
      {children}
    </View>
  );
}

function Ground() {
  const { color } = useTheme();
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.ground, { backgroundColor: color.background }]} />;
}

/** A round icon button on the scrim: size.touch across, named for VoiceOver (the icon itself is decorative). */
export function RoundButton({ icon, label, onPress, disabled = false }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.round, disabled && styles.dim]}>
      <Ground />
      <Icon name={icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ground: { opacity: tokens.opacity.scrim },
  dim: { opacity: tokens.opacity.dim },
  round: { width: tokens.size.touch, height: tokens.size.touch, borderRadius: tokens.size.touch / 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
