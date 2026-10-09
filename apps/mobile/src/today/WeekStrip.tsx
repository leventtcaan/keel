import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import type { StripDay, WeekHead } from './week';

/** What VoiceOver says of a day: its name, then each mark it has ("Monday, trained, today"). */
function spoken(day: StripDay): string {
  const marks = [day.trained && 'trained', day.logged && 'logged', day.planned && 'planned', day.today && 'today'].filter(
    (mark): mark is string => mark !== false,
  );
  return marks.reduce((text, mark) => t('thisWeek.strip.mark', { text, mark: t(`thisWeek.strip.${mark}`) }), t(`onboarding.schedule.dayName.${day.weekday}`));
}

/**
 * The week strip (ADR-077 #1, prototype `weekStrip`): above it the week's number while the server names one, and the
 * record of weeks on track ("Counted by week" until a week is over). A day trained has a tick, a day logged a dot, a day
 * still planned a ring; an empty day is only empty, never red (U7).
 */
export function WeekStrip({ head, days }: { head: WeekHead; days: StripDay[] }) {
  const { color } = useTheme();
  // Built outside the JSX (the raw-text guard reads its children).
  const tick = <SymbolView name="checkmark" size={tokens.type.bodySmall} tintColor={color.onAccent} weight="bold" />;
  const dot = (date: string) => <View testID={`logged-${date}`} style={[styles.dot, { backgroundColor: color.accent }]} />;
  const right =
    head.record !== null ? t('thisWeek.onTrack', head.record) : head.countedByWeek ? t('thisWeek.countedByWeek') : null;
  return (
    <View style={styles.strip}>
      <View style={styles.head}>
        {head.week === null ? <View /> : <Text style={[styles.headText, { color: color.text }]}>{t('thisWeek.week', { week: head.week })}</Text>}
        {right === null ? null : <Text style={[styles.headText, { color: color.textSecondary }]}>{right}</Text>}
      </View>
      <View testID="week-strip" accessibilityLabel={t('thisWeek.strip.label')} style={styles.week}>
        {days.map((day) => (
          <View key={day.date} testID={`day-${day.date}`} accessible accessibilityLabel={spoken(day)} style={styles.day}>
            <View
              style={[
                styles.mark,
                day.trained && { backgroundColor: color.accent },
                day.planned && { borderColor: color.accent, borderWidth: tokens.border.outline },
                !day.trained && !day.planned && { backgroundColor: color.surface },
                day.today && { borderColor: color.text, borderWidth: tokens.border.outline },
              ]}>
              {day.trained ? tick : null}
              {day.logged && !day.trained ? dot(day.date) : null}
            </View>
            <Text style={[styles.letter, { color: day.today ? color.text : color.muted }]}>{t(`thisWeek.strip.letter.${day.weekday}`)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { gap: tokens.space.sm },
  head: { flexDirection: 'row', justifyContent: 'space-between', gap: tokens.space.sm },
  headText: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: tokens.space.xs, minWidth: tokens.size.touch },
  mark: {
    width: tokens.size.touch - tokens.space.md,
    height: tokens.size.touch - tokens.space.md,
    borderRadius: tokens.radius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: tokens.space.sm, height: tokens.space.sm, borderRadius: tokens.space.xs },
  letter: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
});
