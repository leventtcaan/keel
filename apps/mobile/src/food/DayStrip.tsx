import { formatDate } from '@/copy/format';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { dayLabel, stripDays } from './dayLabel';
import { foodParams } from './params';

type Props = {
  /** The day shown (YYYY-MM-DD). */
  day: string;
  today: string;
  /** Days with at least one meal logged: a dot under each. */
  logged: ReadonlySet<string>;
  onChange: (day: string) => void;
};

const CELL = 48;
const WEEKDAY_LETTER = (d: Date) => formatDate(d, { weekday: 'narrow', timeZone: 'UTC' });
const letterOf = (day: string) => WEEKDAY_LETTER(new Date(`${day}T00:00:00Z`));
const dateOf = (day: string) => String(Number(day.slice(8, 10)));

/**
 * The day as the page's title and a week of days under it (K-1063, ADR-090 Ek 3; ADR-094 Ek 5): the day in words in the serif
 * ("Today", "Fri, Sep 25"), then a strip of the last month that shows a week at a time — a dot on each day with something logged, the
 * day shown filled in petrol (a selection, ADR-094 §1), today's letter in coral when another day is shown. Any day of the strip can be
 * read, changed and logged into; nothing after today. The strip scrolls to the day shown.
 */
export function DayStrip({ day, today, logged, onChange }: Props) {
  const { color } = useTheme();
  const days = stripDays(today);
  const index = Math.max(0, days.indexOf(day));
  const scroll = useRef<ScrollView>(null);
  // A week fills the width: the cell is the strip's width over the days in view, known once the strip is laid out.
  const [width, setWidth] = useState(0);
  const cell = width > 0 ? width / foodParams.dayStripVisible : CELL;
  useEffect(() => {
    // The day shown stands at the strip's right end when it is in the last week, else at its middle.
    const start = Math.min(Math.max(0, index - Math.floor(foodParams.dayStripVisible / 2)), Math.max(0, days.length - foodParams.dayStripVisible));
    scroll.current?.scrollTo({ x: start * cell, animated: false });
  }, [index, cell, days.length]);
  return (
    <View testID="day-strip" style={styles.wrap}>
      <Text accessibilityRole="header" testID="day-label" style={[styles.label, { color: color.text }]}>
        {dayLabel(day, today)}
      </Text>
      <ScrollView
        ref={scroll}
        horizontal
        showsHorizontalScrollIndicator={false}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {days.map((value) => {
          const selected = value === day;
          const letter = selected ? color.onAccent : value === today ? color.progressText : color.muted;
          return (
            <Pressable
              key={value}
              testID={`day-${value}`}
              accessibilityRole="button"
              accessibilityLabel={`${dayLabel(value, today)}${logged.has(value) ? `, ${t('food.day.hasMeals')}` : ''}`}
              accessibilityState={{ selected }}
              onPress={() => onChange(value)}
              style={[styles.cell, { width: cell }, selected && { backgroundColor: color.accent }]}>
              <Text style={[styles.letter, { color: letter }]}>{letterOf(value)}</Text>
              <Text style={[styles.date, { color: selected ? color.onAccent : color.text }]}>{dateOf(value)}</Text>
              <View style={[styles.dot, logged.has(value) && { backgroundColor: selected ? color.onAccent : color.accent }]} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space.sm },
  label: { ...tokens.face.display, fontSize: tokens.type.screenTitle },
  cell: { alignItems: 'center', paddingVertical: tokens.space.xs, borderRadius: tokens.radius.button, gap: 2 },
  letter: { fontSize: tokens.type.bodySmall },
  date: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold, fontVariant: ['tabular-nums'] },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
