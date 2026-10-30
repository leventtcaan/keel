import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { type StripDay, type WeekHead, weekRecordText } from './week';

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
 * still planned a ring; an empty day is only empty, never red (U7). A tap on a day opens it (`onDay`: its plan or its log).
 */
export function WeekStrip({ head, days, onDay }: { head: WeekHead; days: StripDay[]; onDay?: (day: StripDay) => void }) {
  const { color } = useTheme();
  // Built outside the JSX (the raw-text guard reads its children).
  const tick = <SymbolView testID="tick" name="checkmark" size={tokens.type.bodySmall} tintColor={color.onAccent} weight="bold" />;
  const dot = (date: string) => <View testID={`logged-${date}`} style={[styles.dot, { backgroundColor: color.accent }]} />;
  // A day with nothing on it is a small quiet dot (prototype `.mk.none`): the day is there, and nothing says missed (U7).
  const none = (date: string) => <View testID={`empty-dot-${date}`} style={[styles.none, { backgroundColor: color.edge }]} />;
  const right =
    head.record !== null ? weekRecordText({ onTrack: head.record.onTrack, counted: head.record.counted }) : head.countedByWeek ? t('thisWeek.countedByWeek') : null;
  return (
    <View style={styles.strip}>
      <View style={styles.head}>
        {head.week === null ? <View /> : <Text style={[styles.headText, { color: color.text }]}>{t('thisWeek.week', { week: head.week })}</Text>}
        {right === null ? null : <Text style={[styles.headText, { color: color.textSecondary }]}>{right}</Text>}
      </View>
      <View testID="week-strip" accessibilityLabel={t('thisWeek.strip.label')} style={styles.week}>
        {days.map((day) => (
          <Pressable
            key={day.date}
            testID={`day-${day.date}`}
            accessibilityRole={onDay === undefined ? undefined : 'button'}
            accessibilityLabel={spoken(day)}
            disabled={onDay === undefined}
            onPress={() => onDay?.(day)}
            style={styles.day}>
            {/* Today's ink ring stands off the mark (prototype `.mk.td`): a planned day keeps its accent ring inside it. */}
            <View testID={day.today ? `ring-${day.date}` : undefined} style={[styles.ring, { borderColor: day.today ? color.text : color.background }]}>
              <View
                testID={`mark-${day.date}`}
                style={[
                  styles.mark,
                  day.trained && { backgroundColor: color.accent },
                  day.planned && { borderColor: color.accent, borderWidth: tokens.border.outline },
                ]}>
                {day.trained ? tick : null}
                {day.logged && !day.trained ? dot(day.date) : null}
                {!day.trained && !day.planned && !day.logged ? none(day.date) : null}
              </View>
            </View>
            <Text style={[styles.letter, { color: day.today ? color.text : color.muted }]}>{t(`thisWeek.strip.letter.${day.weekday}`)}</Text>
          </Pressable>
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
  ring: { borderWidth: tokens.border.outline, borderRadius: tokens.radius.card, padding: tokens.space.xs / 2 },
  mark: {
    width: tokens.size.touch - tokens.space.md,
    height: tokens.size.touch - tokens.space.md,
    borderRadius: tokens.radius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: tokens.space.sm, height: tokens.space.sm, borderRadius: tokens.space.xs },
  none: { width: tokens.size.track, height: tokens.size.track, borderRadius: tokens.size.track / 2 },
  letter: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
});
