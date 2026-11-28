import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { ListRows } from '@/components/ListGroup';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { DAY_VALUES } from './profileWords';

type Weekday = components['schemas']['Weekday'];

/**
 * "Your call reads these" (K-1257, ADR-094 Ek 9): the one sage group on a Settings page, at its top, holding only what the weekly
 * call reads (the training days and the check-in day, the goal, the height, the activity, the year of birth; checked in the
 * engine). `above` is drawn between the heading and the rows (the week's days).
 */
export function DecisionReads({ above, children }: { above?: ReactNode; children: ReactNode }) {
  const { color } = useTheme();
  return (
    <View testID="decision-reads" style={[styles.group, { backgroundColor: color.tintTime }]}>
      <Text accessibilityRole="header" style={[styles.heading, { color: color.text }]}>
        {t('settings.section.reads')}
      </Text>
      {above}
      <ListRows>{children}</ListRows>
    </View>
  );
}

/** The week from Monday, each day named short with a petrol dot where the program trains, an empty ring where it does not. */
export function WeekDays({ trained }: { trained: readonly Weekday[] }) {
  const { color } = useTheme();
  return (
    <View style={styles.days}>
      {DAY_VALUES.map((weekday) => {
        const on = trained.includes(weekday);
        return (
          <View key={weekday} testID={`week-day-${weekday}`} accessible accessibilityLabel={t(`programEditor.weekdayShort.${weekday}`)} accessibilityState={{ selected: on }} style={styles.day}>
            <Text style={[styles.dayName, { color: on ? color.text : color.muted }]}>{t(`programEditor.weekdayShort.${weekday}`)}</Text>
            <View style={[styles.dot, { borderColor: on ? color.accent : color.edge, backgroundColor: on ? color.accent : color.tintTime }]} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: tokens.radius.card, paddingVertical: tokens.space.sm },
  heading: { ...tokens.face.display, fontSize: tokens.type.heading, paddingHorizontal: tokens.space.md, paddingTop: tokens.space.sm, paddingBottom: tokens.space.md },
  days: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: tokens.space.md, paddingBottom: tokens.space.md },
  day: { alignItems: 'center', gap: tokens.space.xs },
  dayName: { fontSize: tokens.type.label },
  dot: { width: tokens.size.dot, height: tokens.size.dot, borderRadius: tokens.size.dot / 2, borderWidth: tokens.border.outline },
});
