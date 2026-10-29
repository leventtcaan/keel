import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { MoveThumb } from './MoveThumb';

/**
 * The move after this one (ADR-075 #1, prototype `.upnext`): what is coming, so the next rest can be spent setting up. With
 * `onTaken`, "Taken?" on its row: the next move's equipment is busy, said before walking there (ADR-090 Ek 2, K-1064).
 */
export function UpNext({ name, equipment, onTaken }: { name: string; equipment: components['schemas']['Equipment'] | undefined; onTaken?: () => void }) {
  const { color } = useTheme();
  // Built outside the JSX (the raw-text guard reads what is inside it).
  const taken =
    onTaken === undefined ? null : (
      <Pressable testID="up-next-taken" accessibilityRole="button" accessibilityLabel={t('taken.nextLabel', { move: name })} onPress={onTaken} style={styles.link}>
        <Text style={[styles.linkText, { color: color.accent }]}>{t('taken.next')}</Text>
      </Pressable>
    );
  return (
    <View testID="up-next" style={[styles.row, { backgroundColor: color.surface }]}>
      <MoveThumb equipment={equipment} />
      <View style={styles.grow}>
        <Text style={[styles.kicker, { color: color.muted }]}>{t('workout.upNext')}</Text>
        <Text style={[styles.name, { color: color.text }]}>{name}</Text>
      </View>
      {taken}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md, padding: tokens.space.sm, borderRadius: tokens.radius.card },
  grow: { flex: 1 },
  kicker: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  name: { fontSize: tokens.type.body, fontWeight: tokens.weight.bold },
  link: { minHeight: tokens.size.touch, justifyContent: 'center', paddingHorizontal: tokens.space.sm },
  linkText: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
});
