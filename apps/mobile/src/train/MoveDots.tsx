import { Pressable, StyleSheet, View } from 'react-native';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/** A move of the session as its dot shows it: its name and status already in words. */
export type Dot = { id: string; name: string; status: string; done: boolean };

/**
 * The session's moves as dots (ADR-075 #1, prototype `.mdots`): the one under way in the accent, the moves done filled,
 * the rest faint; each a full-height touch target, said by VoiceOver with its name and where it stands.
 */
export function MoveDots({ dots, selected, onPick }: { dots: Dot[]; selected: number; onPick: (id: string) => void }) {
  const { color } = useTheme();
  return (
    <View style={styles.row}>
      {dots.map((dot, index) => (
        <Pressable
          key={`${dot.id}-${index}`}
          accessibilityRole="button"
          accessibilityLabel={t('workout.dot', { name: dot.name, status: dot.status })}
          accessibilityState={{ selected: index === selected }}
          onPress={() => onPick(dot.id)}
          style={styles.touch}>
          <View style={[styles.dot, { backgroundColor: index === selected ? color.accent : dot.done ? color.text : color.line }]} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: tokens.space.xs },
  touch: { flex: 1, minHeight: tokens.size.touch, justifyContent: 'center' },
  dot: { height: tokens.size.track, borderRadius: tokens.radius.track },
});
