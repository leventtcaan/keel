import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { MoveThumb } from './MoveThumb';

export type TakenOption = { id: string; name: string; equipment: components['schemas']['Equipment'] | undefined; done: boolean };

type Props = {
  /** The move that is taken, by its name. */
  move: string;
  /** Whether another move is left to do first: "Do it later" needs something to put it behind. */
  canLater: boolean;
  options: TakenOption[];
  /** More swaps than the few shown (the swap sheet has them all). */
  hasMore: boolean;
  onLater: () => void;
  onPick: (id: string) => void;
  onMore: () => void;
  onClose: () => void;
};

/**
 * Taken, in the workout (ADR-090 Ek 2, K-1064): the move's equipment is busy. Two ways on, each one tap: do it later (the end
 * of today's order), or a few moves of the same muscles on other equipment, the ones done before first. For this workout only,
 * as a swap in the session is. It takes the page's place, as the swap sheet does.
 */
export function TakenSheet({ move, canLater, options, hasMore, onLater, onPick, onMore, onClose }: Props) {
  const { color } = useTheme();
  // Built outside the JSX (the raw-text guard reads what is inside it).
  const later = !canLater ? null : (
    <Pressable
      testID="taken-later"
      accessibilityRole="button"
      accessibilityLabel={t('taken.laterLabel', { move })}
      onPress={onLater}
      style={({ pressed }) => [styles.row, { backgroundColor: color.surface }, pressed && styles.dim]}>
      <Icon name="arrow.down.to.line" />
      <View style={styles.grow}>
        <Text style={[styles.name, { color: color.text }]}>{t('taken.later')}</Text>
        <Text style={[styles.note, { color: color.textSecondary }]}>{t('taken.laterNote')}</Text>
      </View>
    </Pressable>
  );
  const rows = options.map((option) => (
    <Pressable
      key={option.id}
      testID="taken-option"
      accessibilityRole="button"
      accessibilityLabel={option.done ? `${option.name}. ${t('taken.done')}` : option.name}
      onPress={() => onPick(option.id)}
      style={({ pressed }) => [styles.row, { backgroundColor: color.surface }, pressed && styles.dim]}>
      <MoveThumb equipment={option.equipment} />
      <View style={styles.grow}>
        <Text style={[styles.name, { color: color.text }]}>{option.name}</Text>
        {option.done && <Text style={[styles.note, { color: color.textSecondary }]}>{t('taken.done')}</Text>}
      </View>
    </Pressable>
  ));
  const instead =
    options.length > 0 ? (
      <>
        <Text style={[styles.kicker, { color: color.muted }]}>{t('taken.instead')}</Text>
        {rows}
      </>
    ) : (
      <Text style={[styles.note, { color: color.textSecondary }]}>{t('taken.none')}</Text>
    );
  const more = !hasMore ? null : <Button label={t('taken.more')} variant="ghost" onPress={onMore} />;
  return (
    <View testID="taken-sheet" style={styles.sheet}>
      <Text accessibilityRole="header" style={[styles.heading, { color: color.text }]}>
        {t('taken.title', { move })}
      </Text>
      {later}
      {instead}
      {more}
      <Button label={t('swap.close')} variant="ghost" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { gap: tokens.space.sm },
  heading: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  kicker: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, padding: tokens.space.sm, borderRadius: tokens.radius.card, minHeight: tokens.size.touch },
  grow: { flex: 1, gap: tokens.space.xs },
  name: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  note: { fontSize: tokens.type.bodySmall },
  dim: { opacity: tokens.opacity.dim },
});
