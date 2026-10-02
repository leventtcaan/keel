import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Schemas = components['schemas'];

type Props = {
  set: Schemas['LoggedSet'];
  /** Already in words. */
  line: string;
  asking: boolean;
  busy: boolean;
  problem: string | null;
  onAsk: (id: string) => void;
  onKeep: () => void;
  onDelete: (set: Schemas['LoggedSet']) => void;
};

/**
 * A set of a past session with its delete, asked once more (ADR-016: warn only to confirm). Asked, the spot the delete
 * was in keeps the set: a second tap there — a double tap — keeps it, never deletes it (review).
 */
export function SetLine({ set, line, asking, busy, problem, onAsk, onKeep, onDelete }: Props) {
  const { color } = useTheme();
  const action = asking ? (
    <View style={styles.row}>
      <Button label={t('sessionEdit.confirmDelete')} variant="warn" size="sm" onPress={() => onDelete(set)} disabled={busy} />
      <Button label={t('sessionEdit.keep')} variant="ghost" size="sm" onPress={onKeep} disabled={busy} />
    </View>
  ) : (
    <Button
      label={t('sessionEdit.delete')}
      accessibilityLabel={t('sessionEdit.deleteSpoken', { set: line })}
      variant="ghost"
      size="sm"
      onPress={() => onAsk(set.id)}
      disabled={busy}
    />
  );
  const said = problem === null ? null : <Text style={[styles.text, { color: color.text }]}>{problem}</Text>;
  return (
    <View style={styles.set}>
      <View style={styles.row}>
        <Text style={[styles.text, styles.grow, { color: color.textSecondary }]}>{line}</Text>
        {action}
      </View>
      {said}
    </View>
  );
}

const styles = StyleSheet.create({
  set: { gap: tokens.space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  grow: { flex: 1 },
  text: { fontSize: tokens.type.body },
});
