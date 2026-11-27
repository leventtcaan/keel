import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/** A place's part in the walk drawn: where it starts, where it ends, not in it, or a new place being named. */
export type MarkRole = 'from' | 'to' | 'idle' | 'draft';

const DOT = 18;
const SMALL = 12;
const TAG = 26;
const GAP = 4;
/**
 * Apple Maps centres a marker's view on its point; lifted by this the dot, not the tag above it, sits on the place. The view is the tag,
 * the gap and the dot: its centre is half of all three from the top, the dot's centre the tag, the gap and half the dot, so the view is
 * lifted by half the tag and the gap, whatever the dot's size.
 */
export const MARK_OFFSET = { x: 0, y: -(TAG + GAP) / 2 };
export const DRAFT_OFFSET = { x: 0, y: 0 };

/**
 * The walk map's own mark (K-1252, ADR-094 Ek 7 #2): a petrol ring where the walk starts, a filled petrol dot where it ends, a small grey
 * dot for a place not in it, the place's name above on a small paper tag. A new place being named is an ink dot alone. Drawn on the map,
 * so it is decorative there: the places are named in the list under the map.
 */
export function MapMark({ role, name }: { role: MarkRole; name?: string }) {
  const { color } = useTheme();
  const dot =
    role === 'from'
      ? [styles.dot, styles.ring, { borderColor: color.accent, backgroundColor: color.background }]
      : role === 'to'
        ? [styles.dot, styles.halo, { borderColor: color.background, backgroundColor: color.accent }]
        : [styles.small, { borderColor: color.background, backgroundColor: role === 'draft' ? color.text : color.textSecondary }];
  const quiet = role === 'idle';
  const tag =
    name === undefined ? null : (
      <View style={[styles.tag, { backgroundColor: color.background, borderColor: quiet ? color.line : color.edge }]}>
        <Text style={[styles.name, { color: quiet ? color.textSecondary : color.text }]}>{name}</Text>
      </View>
    );
  return (
    <View testID={`mark-${role}`} style={styles.mark}>
      {tag}
      <View style={dot} />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { alignItems: 'center', gap: GAP },
  tag: { height: TAG, paddingHorizontal: tokens.space.sm, borderRadius: TAG / 2, borderWidth: tokens.border.hairline, justifyContent: 'center' },
  name: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
  ring: { borderWidth: 4 },
  halo: { borderWidth: 3 },
  small: { width: SMALL, height: SMALL, borderRadius: SMALL / 2, borderWidth: 2 },
});
