import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { dayName } from './program';
import type { AnyDayRow } from './week';

type Props = {
  rows: AnyDayRow[];
  /** Whether a day can be started from its row now: not with a workout under way, not in a week off. */
  startable: boolean;
  onStart: (programDayId: string) => void;
};

/**
 * The program's days on no weekday ("any day"; Evre 7, issue 684): the server's calendar has no session for them, so each is
 * started from a row of its own, as the dated sessions of the week are from theirs: its name, its moves, and Start; a day done
 * this week carries its tick instead. One card, a row per day.
 */
export function AnyDayRows({ rows, startable, onStart }: Props) {
  const { color } = useTheme();
  const items = rows.map(({ day, done }, index) => {
    const count = day.exercises.length;
    const moves = t(count === 1 ? 'train.moveCount.one' : 'train.moveCount.other', { count });
    const divider = index === 0 ? null : { borderTopWidth: tokens.border.hairline, borderColor: color.line };
    const badge = { backgroundColor: done ? color.accent : color.raise };
    const mark = done ? color.onAccent : color.text;
    const tick = (
      <View accessible accessibilityLabel={t('train.doneTag')} style={styles.doneMark}>
        <SymbolView name="checkmark.circle.fill" size={tokens.icon.small} tintColor={color.accent} />
        <Text style={[styles.small, styles.bold, { color: color.accent }]}>{t('train.doneTag')}</Text>
      </View>
    );
    const start = <Button label={t('train.startThis')} accessibilityLabel={t('train.startDay', { day: dayName(day) })} variant="text" onPress={() => onStart(day.id)} />;
    const trailing = done ? tick : startable ? start : null;
    return (
      <View key={day.id} style={[styles.row, divider]}>
        <View style={[styles.badge, badge]} accessible={false}>
          <SymbolView name="dumbbell.fill" size={tokens.icon.small} tintColor={mark} />
        </View>
        <View style={styles.grow}>
          <Text style={[styles.text, styles.bold, { color: color.text }]}>{dayName(day)}</Text>
          <Text style={[styles.small, { color: color.muted }]}>{moves}</Text>
        </View>
        {trailing}
      </View>
    );
  });
  return (
    <View testID="any-day-rows" style={[styles.card, { backgroundColor: color.surface }]}>
      {items}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: tokens.radius.card, paddingHorizontal: tokens.space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md, minHeight: tokens.size.row + tokens.space.md, paddingVertical: tokens.space.sm },
  badge: { width: tokens.size.touch, height: tokens.size.touch, borderRadius: tokens.radius.button, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1 },
  doneMark: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs },
  bold: { fontWeight: tokens.weight.semibold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
