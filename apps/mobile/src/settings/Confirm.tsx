import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Props = {
  /** Already translated. */
  title?: string;
  body: string;
  confirmLabel: string;
  keepLabel: string;
  onConfirm: () => void;
  onKeep: () => void;
  busy: boolean;
  /** A step to take before deciding (K-231: export the data first), drawn quiet, above the two choices. */
  aside?: ReactNode;
};

/**
 * The confirming step of a destructive action: the one place the warn colour is used (ADR-016). Keeping is as easy as
 * going on, and is the second button, so a tap in a hurry lands on neither by accident.
 */
export function Confirm({ title, body, confirmLabel, keepLabel, onConfirm, onKeep, busy, aside }: Props) {
  const { color } = useTheme();
  const heading = title === undefined ? null : <Text style={[styles.title, { color: color.text }]}>{title}</Text>;
  return (
    <View style={[styles.box, { borderColor: color.line }]}>
      {heading}
      <Text style={[styles.body, { color: color.textSecondary }]}>{body}</Text>
      {aside}
      <Button label={confirmLabel} variant="warn" onPress={onConfirm} disabled={busy} />
      <Button label={keepLabel} variant="ghost" onPress={onKeep} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderTopWidth: tokens.border.hairline, paddingTop: tokens.space.md, gap: tokens.space.sm },
  title: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  body: { fontSize: tokens.type.body },
});
