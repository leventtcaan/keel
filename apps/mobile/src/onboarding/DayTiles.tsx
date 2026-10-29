import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { offeredDayCounts } from './params';

type Props = {
  /** The count chosen so far; none yet: null. */
  chosen: number | null;
  onChoose: (count: number) => void;
  disabled?: boolean;
};

/**
 * The days question's answers (ADR-072 #4): one box for each count the onboarding offers, the same in the walk
 * (onboarding/days) and where a program is built later (build-program, ADR-084).
 */
export function DayTiles({ chosen, onChoose, disabled = false }: Props) {
  const { color } = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={styles.tiles}>
      {offeredDayCounts.map((count) => {
        const selected = count === chosen;
        const ink = selected ? color.decisionText : color.text;
        return (
          <Pressable
            key={count}
            accessibilityRole="radio"
            accessibilityLabel={t('onboarding.days.label', { count })}
            accessibilityState={{ checked: selected, disabled }}
            disabled={disabled}
            onPress={() => onChoose(count)}
            style={[
              styles.tile,
              selected
                ? { backgroundColor: color.decisionBackground, borderColor: color.decisionBackground }
                : { backgroundColor: color.background, borderColor: color.edge },
            ]}>
            <Text style={[styles.count, { color: ink }]}>{count}</Text>
            <Text style={[styles.unit, { color: selected ? color.decisionMuted : color.muted }]}>{t('onboarding.days.unit')}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The prototype's box: three wide, four tall. */
const TILE_ASPECT = 3 / 4;
const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: tokens.space.sm },
  tile: {
    flex: 1,
    aspectRatio: TILE_ASPECT,
    borderRadius: tokens.radius.option,
    borderWidth: tokens.border.outline,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space.xs,
  },
  count: { fontFamily: tokens.font.display, fontSize: tokens.type.tile },
  unit: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
});
