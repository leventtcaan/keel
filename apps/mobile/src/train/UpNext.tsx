import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { MoveThumb } from './MoveThumb';

/** The move after this one (ADR-075 #1, prototype `.upnext`): what is coming, so the next rest can be spent setting up. */
export function UpNext({ name, equipment }: { name: string; equipment: components['schemas']['Equipment'] | undefined }) {
  const { color } = useTheme();
  return (
    <View testID="up-next" style={[styles.row, { backgroundColor: color.surface }]}>
      <MoveThumb equipment={equipment} />
      <View style={styles.grow}>
        <Text style={[styles.kicker, { color: color.muted }]}>{t('workout.upNext')}</Text>
        <Text style={[styles.name, { color: color.text }]}>{name}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md, padding: tokens.space.sm, borderRadius: tokens.radius.card },
  grow: { flex: 1 },
  kicker: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  name: { fontSize: tokens.type.body, fontWeight: tokens.weight.bold },
});
