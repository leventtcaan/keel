import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { shortDate } from '@/train/program';

import type { DayView } from './dayView';
import type { StripDay } from './week';

/**
 * A day of the week strip, opened as a short sheet: the day, whether it was trained, planned, only weighed in or a rest day, and its
 * moves in rows (the plan, or the best set of each move done). No sentences: an empty day is "Rest day", never missed (U7).
 */
export function DaySheet({ day, view, onClose }: { day: StripDay; view: DayView; onClose: () => void }) {
  const { color } = useTheme();
  const title = t(`onboarding.schedule.dayName.${day.weekday}`);
  return (
    <BottomSheet testID="day-sheet" onClose={onClose}>
      <View style={styles.top}>
        <View style={styles.head}>
          <Text accessibilityRole="header" style={[styles.title, { color: color.text }]}>
            {view.session === null ? title : t('thisWeek.day.title', { weekday: title, session: view.session })}
          </Text>
          <Text style={[styles.small, { color: color.textSecondary }]}>{shortDate(day.date)}</Text>
        </View>
        <Button label={t('modal.close')} variant="text" size="sm" onPress={onClose} />
      </View>
      <View style={[styles.state, { backgroundColor: view.state === 'trained' ? color.accentSoft : color.surface }]}>
        <Text style={[styles.text, styles.bold, { color: color.text }]}>{t(`thisWeek.day.${view.state}`)}</Text>
      </View>
      {view.rows.map((row) => (
        <View key={row.id} testID="day-row" style={[styles.row, { backgroundColor: color.surface }]}>
          <Text style={[styles.text, styles.name, { color: color.text }]}>{row.name}</Text>
          <Text style={[styles.text, { color: color.textSecondary }]}>{row.detail}</Text>
        </View>
      ))}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: tokens.space.sm },
  head: { flex: 1, gap: tokens.space.xs },
  title: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  state: { alignSelf: 'flex-start', borderRadius: tokens.radius.chip, paddingHorizontal: tokens.space.md, paddingVertical: tokens.space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, padding: tokens.space.sm, borderRadius: tokens.radius.card, minHeight: tokens.size.touch },
  name: { flex: 1, fontWeight: tokens.weight.semibold },
  text: { fontSize: tokens.type.body },
  bold: { fontWeight: tokens.weight.bold },
  small: { fontSize: tokens.type.bodySmall },
});
