import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { dayLabel, stripDays } from './dayLabel';

type Props = {
  /** The day shown (YYYY-MM-DD). */
  day: string;
  today: string;
  /** Days with at least one meal logged: a dot under each. */
  logged: ReadonlySet<string>;
  onChange: (day: string) => void;
};

const CELL = 48;
const WEEKDAY_LETTER = new Intl.DateTimeFormat('en-US', { weekday: 'narrow', timeZone: 'UTC' });
const letterOf = (day: string) => WEEKDAY_LETTER.format(new Date(`${day}T00:00:00Z`));
const dateOf = (day: string) => String(Number(day.slice(8, 10)));

/**
 * The day navigator (K-1063, ADR-090 Ek 3): chevrons for the day before and after, the day in words, and under them a strip of the
 * last month — a dot on each day with something logged, the day shown filled. Any day of the strip can be read, changed and logged
 * into; nothing after today. The strip scrolls to the day shown, so a tap on a chevron never leaves it out of sight.
 */
export function DayStrip({ day, today, logged, onChange }: Props) {
  const { color } = useTheme();
  const days = stripDays(today);
  const index = Math.max(0, days.indexOf(day));
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    scroll.current?.scrollTo({ x: Math.max(0, index * CELL - CELL * 3), animated: false });
  }, [index]);
  const earlier = index > 0 ? days[index - 1] : null;
  const later = day < today ? days[index + 1] : null;
  return (
    <View testID="day-strip" style={styles.wrap}>
      <View style={styles.bar}>
        <Pressable
          testID="day-before"
          accessibilityRole="button"
          accessibilityLabel={t('food.day.before')}
          accessibilityState={{ disabled: earlier === null }}
          disabled={earlier === null}
          onPress={() => earlier !== null && onChange(earlier)}
          hitSlop={tokens.space.sm}
          style={[styles.chevron, earlier === null && styles.dim]}>
          <Icon name="chevron.left" />
        </Pressable>
        <Text accessibilityRole="header" testID="day-label" style={[styles.label, { color: color.text }]}>
          {dayLabel(day, today)}
        </Text>
        <Pressable
          testID="day-after"
          accessibilityRole="button"
          accessibilityLabel={t('food.day.after')}
          accessibilityState={{ disabled: later === null }}
          disabled={later === null}
          onPress={() => later !== null && onChange(later)}
          hitSlop={tokens.space.sm}
          style={[styles.chevron, later === null && styles.dim]}>
          <Icon name="chevron.right" />
        </Pressable>
      </View>
      <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {days.map((value) => {
          const selected = value === day;
          return (
            <Pressable
              key={value}
              testID={`day-${value}`}
              accessibilityRole="button"
              accessibilityLabel={`${dayLabel(value, today)}${logged.has(value) ? `, ${t('food.day.hasMeals')}` : ''}`}
              accessibilityState={{ selected }}
              onPress={() => onChange(value)}
              style={[styles.cell, selected && { backgroundColor: color.text }]}>
              <Text style={[styles.letter, { color: selected ? color.background : color.muted }]}>{letterOf(value)}</Text>
              <Text style={[styles.date, { color: selected ? color.background : color.text }]}>{dateOf(value)}</Text>
              <View style={[styles.dot, logged.has(value) && { backgroundColor: selected ? color.background : color.accent }]} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space.sm },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chevron: { width: tokens.size.touch, height: tokens.size.touch, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.3 },
  label: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  strip: { gap: tokens.space.xs },
  cell: { width: CELL, alignItems: 'center', paddingVertical: tokens.space.xs, borderRadius: tokens.radius.button, gap: 2 },
  letter: { fontSize: tokens.type.bodySmall },
  date: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold, fontVariant: ['tabular-nums'] },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
