import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/** A move of the session as its dot shows it: its name and status already in words. */
export type Dot = { id: string; name: string; status: string; done: boolean };

/**
 * How many dots a row holds when the moves do not fit one line: the rows are as even as they can be, so nine moves are
 * five and four, never eight and one stretched across a line of its own (the strip then looked like eight moves under
 * "0 of 9", B29). A dot keeps its full touch target (`size.touch`). Null when they fit one line (or the width is not known yet).
 */
export function dotsPerRow(width: number | null, count: number): number | null {
  if (width === null) return null;
  const fits = Math.max(1, Math.floor(width / (tokens.size.touch + tokens.space.xs)));
  if (count <= fits) return null;
  return Math.ceil(count / Math.ceil(count / fits));
}

/**
 * The session's moves as dots (ADR-075 #1, prototype `.mdots`): the one under way in the accent, the moves done filled,
 * the rest faint; each a full-height touch target, said by VoiceOver with its name and where it stands.
 */
export function MoveDots({ dots, selected, onPick }: { dots: Dot[]; selected: number; onPick: (id: string) => void }) {
  const { color } = useTheme();
  const [width, setWidth] = useState<number | null>(null);
  const perRow = dotsPerRow(width, dots.length);
  // Even rows: each dot a share of the line, none stretched to fill the last.
  const even = perRow === null ? null : { flexGrow: 0, flexBasis: `${100 / perRow}%` as const, maxWidth: `${100 / perRow}%` as const };
  return (
    <View testID="move-dots" style={styles.row} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {dots.map((dot, index) => (
        <Pressable
          key={`${dot.id}-${index}`}
          accessibilityRole="button"
          accessibilityLabel={t('workout.dot', { name: dot.name, status: dot.status })}
          accessibilityState={{ selected: index === selected }}
          onPress={() => onPick(dot.id)}
          style={[styles.touch, even]}>
          <View style={[styles.dot, { backgroundColor: index === selected ? color.accent : dot.done ? color.text : color.line }]} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Each dot keeps a full touch target; past what one line holds (eight moves and more), they wrap.
  row: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -tokens.space.xs / 2 },
  touch: {
    flexGrow: 1,
    flexBasis: tokens.size.touch,
    minWidth: tokens.size.touch,
    minHeight: tokens.size.touch,
    justifyContent: 'center',
    paddingHorizontal: tokens.space.xs / 2,
  },
  dot: { height: tokens.size.track, borderRadius: tokens.radius.track },
});
