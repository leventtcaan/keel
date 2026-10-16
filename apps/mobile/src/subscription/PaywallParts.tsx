/**
 * The paywall's parts (paywall v2, ADR-072 Ek 3, prototype paywall-v2.html): the three values, a plan to choose, the timeline.
 * Every word arrives already written (words.ts, from the copy); every colour is the theme's.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import type { PlanLine, TimelineRow } from './words';

export type ValueIconKind = 'program' | 'sets' | 'call';
export type ValueRow = { icon: ValueIconKind; words: string };

const ICON = 20;
const STROKE = 2;

// Each icon is one outline on a 24-unit grid (prototype paywall-v2 `.vi`): a barbell, a target, a calendar with a check.
const GLYPH: Record<ValueIconKind, string> = {
  program: 'M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11',
  sets: 'M20.5 12a8.5 8.5 0 1 1-17 0a8.5 8.5 0 1 1 17 0M16 12a4 4 0 1 1-8 0a4 4 0 1 1 8 0',
  call: 'M7 5h10a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3zM4 10h16M8 3v4M16 3v4M9.2 15l2 2 3.8-4',
};

function ValueIcon({ kind }: { kind: ValueIconKind }) {
  const { color } = useTheme();
  return (
    <Svg width={ICON} height={ICON} viewBox="0 0 24 24" accessible={false}>
      <Path d={GLYPH[kind]} stroke={color.accent} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function Values({ rows }: { rows: ValueRow[] }) {
  const { color } = useTheme();
  return (
    <View style={styles.values}>
      {rows.map((row) => (
        <View key={row.icon} style={styles.value}>
          <View style={[styles.valueTile, { backgroundColor: color.accentSoft }]}>
            <ValueIcon kind={row.icon} />
          </View>
          <Text style={[styles.valueText, { color: color.text }]}>{row.words}</Text>
        </View>
      ))}
    </View>
  );
}

/** One plan to choose, a radio: the saving as a badge on the yearly one. Its words are read together (the line's `label`). */
export function PlanOption({ line, selected, disabled, onPress }: { line: PlanLine; selected: boolean; disabled: boolean; onPress: () => void }) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={line.label}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.plan, { backgroundColor: selected ? color.accentSoft : color.surface, borderColor: selected ? color.accent : color.surface }]}>
      <View style={[styles.radio, { borderColor: selected ? color.accent : color.edge }]}>
        {selected && <View style={[styles.radioFill, { backgroundColor: color.accent }]} />}
      </View>
      <View style={styles.planName}>
        <View style={styles.planTitle}>
          <Text style={[styles.planTitleText, { color: color.text }]}>{line.title}</Text>
          {line.badge !== null && (
            <View style={[styles.badge, { backgroundColor: color.accent }]}>
              <Text style={[styles.badgeText, { color: color.onAccent }]}>{line.badge}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.note, { color: color.muted }]}>{line.note}</Text>
      </View>
      <View style={styles.planPrice}>
        <Text style={[styles.price, { color: color.text }]}>{line.price}</Text>
        {line.perMonth !== null && <Text style={[styles.note, { color: color.muted }]}>{line.perMonth}</Text>}
      </View>
    </Pressable>
  );
}

/** "What happens, and when": the first dot filled, a line down to the last. */
export function TimelineCard({ rows }: { rows: TimelineRow[] }) {
  const { color } = useTheme();
  return (
    <View accessibilityLabel={t('subscription.timeline.label')} style={[styles.timeline, { backgroundColor: color.surface }]}>
      <Text style={[styles.heading, { color: color.muted }]}>{t('subscription.timeline.heading')}</Text>
      {rows.map((row, index) => (
        <View key={`${row.day}-${row.words}`} style={styles.step}>
          <View style={styles.rail}>
            <View
              style={[
                styles.dot,
                { borderColor: index === 0 ? color.accent : color.text, backgroundColor: index === 0 ? color.accent : color.surface },
              ]}
            />
            {index < rows.length - 1 && <View style={[styles.connector, { backgroundColor: color.edge }]} />}
          </View>
          <View style={styles.stepText}>
            <Text style={[styles.when, { color: color.text }]}>{row.when}</Text>
            <Text style={[styles.words, { color: color.textSecondary }]}>{row.words}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  values: { gap: tokens.space.sm },
  value: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md },
  valueTile: { width: tokens.size.valueTile, height: tokens.size.valueTile, borderRadius: tokens.radius.chip, alignItems: 'center', justifyContent: 'center' },
  valueText: { flex: 1, fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    borderRadius: tokens.radius.option,
    borderWidth: tokens.border.ring,
    padding: tokens.space.md,
    minHeight: tokens.size.touch,
  },
  radio: { width: tokens.size.planRadio, height: tokens.size.planRadio, borderRadius: tokens.size.planRadio / 2, borderWidth: tokens.border.outline, alignItems: 'center', justifyContent: 'center' },
  radioFill: { width: tokens.size.planRadio / 2, height: tokens.size.planRadio / 2, borderRadius: tokens.size.planRadio / 4 },
  planName: { flex: 1, gap: tokens.space.xs },
  planTitle: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: tokens.space.sm },
  planTitleText: { fontSize: tokens.type.body, fontWeight: tokens.weight.bold },
  badge: { borderRadius: tokens.radius.chip, paddingHorizontal: tokens.space.sm, paddingVertical: tokens.space.xs },
  badgeText: { fontSize: tokens.type.label, fontWeight: tokens.weight.black },
  planPrice: { alignItems: 'flex-end', gap: tokens.space.xs },
  price: { fontSize: tokens.type.body, fontWeight: tokens.weight.bold },
  note: { fontSize: tokens.type.label },
  timeline: { borderRadius: tokens.radius.card, padding: tokens.space.md, gap: tokens.space.xs },
  heading: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold, paddingBottom: tokens.space.sm },
  step: { flexDirection: 'row', gap: tokens.space.md },
  rail: { width: tokens.size.timelineDot, alignItems: 'center' },
  dot: { width: tokens.size.timelineDot, height: tokens.size.timelineDot, borderRadius: tokens.size.timelineDot / 2, borderWidth: tokens.border.ring - 1 },
  connector: { width: tokens.border.ring - 1, flexGrow: 1, minHeight: tokens.space.md },
  stepText: { flex: 1, paddingBottom: tokens.space.md, gap: tokens.space.xs / 2 },
  when: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.bold },
  words: { fontSize: tokens.type.bodySmall },
});
