import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { MoveThumb } from './MoveThumb';

export type SwapOption = { id: string; name: string; equipment: components['schemas']['Equipment'] | undefined; back: boolean };

type Props = {
  /** The move as it is now: the sheet is titled by it, and it is not offered again. */
  move: string;
  options: SwapOption[];
  onPick: (id: string) => void;
  onClose: () => void;
};

/**
 * Swap, in the session (ADR-073 #6, ADR-075 #5; prototype sheet `swap`): the moves this one can be swapped for, the
 * server's list as the screen filtered it; with a swap in force the planned move comes first, "Back to the planned move".
 * For this workout only, and the new move starts fresh. It takes the page's place, as End's sheet does.
 */
export function SwapSheet({ move, options, onPick, onClose }: Props) {
  const { color } = useTheme();
  return (
    <View testID="swap-sheet" style={styles.sheet}>
      <Text accessibilityRole="header" style={[styles.heading, { color: color.text }]}>
        {t('swap.title', { move })}
      </Text>
      <Text style={[styles.note, { color: color.textSecondary }]}>{t('swap.why')}</Text>
      <Text style={[styles.note, { color: color.textSecondary }]}>{t('workout.swapToday')}</Text>
      {options.map((option) => {
        const note = option.back ? t('swap.back') : undefined;
        return (
          <Pressable
            key={option.id}
            testID="swap-option"
            accessibilityRole="button"
            accessibilityLabel={note === undefined ? option.name : `${option.name}. ${note}`}
            onPress={() => onPick(option.id)}
            style={({ pressed }) => [styles.row, { backgroundColor: color.surface }, pressed && styles.dim]}>
            <MoveThumb equipment={option.equipment} />
            <View style={styles.grow}>
              <Text style={[styles.name, { color: color.text }]}>{option.name}</Text>
              {note !== undefined && <Text style={[styles.note, { color: color.textSecondary }]}>{note}</Text>}
            </View>
          </Pressable>
        );
      })}
      <Button label={t('swap.close')} variant="ghost" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { gap: tokens.space.sm },
  heading: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, padding: tokens.space.sm, borderRadius: tokens.radius.card, minHeight: tokens.size.touch },
  grow: { flex: 1, gap: tokens.space.xs },
  name: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  note: { fontSize: tokens.type.bodySmall },
  dim: { opacity: tokens.opacity.dim },
});
