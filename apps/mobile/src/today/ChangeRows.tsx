import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import type { ChangeRow } from './callChanges';

/**
 * The targets the call changes, old to new, one line each (prototype `.changes`): the old value struck through, the new
 * one in the accent. A target with none before it is a new target, with no old value; a call kept off the plan shows the
 * target in force, said so. Each row is one sentence to VoiceOver ("was … now …"), since a strike-through is not heard.
 */
export function ChangeRows({ rows }: { rows: ChangeRow[] }) {
  const { color } = useTheme();
  if (rows.length === 0) return null;
  return (
    <View>
      {rows.map((row) => {
        // Built outside the JSX children (the raw-text guard reads them).
        const before =
          row.from === null ? null : (
            <>
              <Text style={[styles.value, styles.old, { color: color.muted }]}>{row.from}</Text>
              <SymbolView name="chevron.right" size={tokens.type.bodySmall} tintColor={color.muted} weight="bold" />
            </>
          );
        return (
          <View key={row.id} accessible accessibilityLabel={row.spoken} style={[styles.row, { borderTopColor: color.line }]}>
            <Text style={[styles.name, { color: color.textSecondary }]}>{row.label}</Text>
            <View style={styles.values}>
              {before}
              <Text style={[styles.value, { color: row.kind === 'inForce' ? color.text : color.accent }]}>{row.to}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
    borderTopWidth: tokens.border.hairline,
    paddingVertical: tokens.space.sm,
  },
  name: { fontSize: tokens.type.body },
  values: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  value: { fontSize: tokens.type.body, fontWeight: tokens.weight.bold },
  old: { textDecorationLine: 'line-through', fontWeight: tokens.weight.regular },
});
