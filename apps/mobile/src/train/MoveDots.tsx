import { Pressable, StyleSheet, View } from 'react-native';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/** A move of the session as its dot shows it: its name and status already in words. */
export type Dot = { id: string; name: string; status: string; done: boolean };

/**
 * The session's moves as a strip (ADR-075 #1, prototype `.mdots`), the screen's whole progress picture (K-1207): the one under way
 * in coral, "you are here" (ADR-094 Ek 2, §1), the moves done in ink, the rest in the faint edge (never petrol: that is for what to
 * do now); each a full-height touch target, said by VoiceOver with its name and where it stands. All on one line, whatever
 * their number (ADR-087 #3): each takes an equal share of the width, so ten moves never wrap under the rest card.
 */
export function MoveDots({ dots, selected, onPick }: { dots: Dot[]; selected: number; onPick: (id: string) => void }) {
  const { color } = useTheme();
  return (
    <View testID="move-dots" style={styles.row}>
      {dots.map((dot, index) => (
        <Pressable
          key={`${dot.id}-${index}`}
          accessibilityRole="button"
          accessibilityLabel={t('workout.dot', { name: dot.name, status: dot.status })}
          accessibilityState={{ selected: index === selected }}
          onPress={() => onPick(dot.id)}
          style={styles.touch}>
          <View style={[styles.dot, { backgroundColor: index === selected ? color.progress : dot.done ? color.text : color.edge }]} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', columnGap: tokens.space.xs },
  touch: { flex: 1, minHeight: tokens.size.touch, justifyContent: 'center' },
  dot: { height: tokens.size.track, borderRadius: tokens.radius.track },
});
