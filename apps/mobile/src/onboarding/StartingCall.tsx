/**
 * #ob-plan's lead (K-1058, prototype section 11 frame 6): the starting call in one dark card, drawn as the app draws a call —
 * where the food starts, the protein, the day of the first call. The news of the plan, ahead of the workout. Every figure is
 * the server's (the starting target, the first call's day): shown and counted, never worked out here (U1). A row with nothing
 * to say is not drawn, and the card is not drawn when no row is (no consent: no food, no calls).
 */
import { StyleSheet, Text, View } from 'react-native';

import { DecisionBlock } from '@/components/DecisionBlock';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

export type StartingCallRow = {
  label: string;
  value: string;
  note?: string;
};

/** One row; its own component, so its colours are the block's (the inverse surface DecisionBlock lays its children on). */
export function CallRow({ label, value, note }: StartingCallRow) {
  const { color } = useTheme();
  return (
    <View style={[styles.row, { borderTopColor: color.line }]}>
      <Text style={[styles.key, { color: color.muted }]}>{label}</Text>
      <View style={styles.value}>
        <Text style={[styles.strong, { color: color.text }]}>{value}</Text>
        {note !== undefined && <Text style={[styles.small, { color: color.muted }]}>{note}</Text>}
      </View>
    </View>
  );
}

export function StartingCall({ rows }: { rows: StartingCallRow[] }) {
  if (rows.length === 0) return null;
  return (
    <DecisionBlock title={t('onboarding.plan.callTitle')}>
      {rows.map((row) => (
        <CallRow key={row.label} {...row} />
      ))}
    </DecisionBlock>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: tokens.space.md, paddingTop: tokens.space.sm, borderTopWidth: tokens.border.hairline },
  key: { width: tokens.size.row * 2, fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.bold },
  value: { flex: 1 },
  strong: { fontSize: tokens.type.body, fontWeight: tokens.weight.bold },
  small: { fontSize: tokens.type.bodySmall },
});
