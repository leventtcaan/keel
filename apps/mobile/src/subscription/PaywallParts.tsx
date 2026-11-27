/**
 * The paywall's parts in the warm notebook (ADR-094 Ek 8): the benefits with a petrol tick, a plan to choose as a tile, and the
 * timeline on sage under the screen's serif heading. Every word arrives already written (words.ts, from the copy); every
 * colour is the theme's role (ADR-094 §1).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import type { PlanLine, TimelineRow } from './words';

export type ValueRow = { words: string };

const STROKE = 2.6;
// A check on a 24-unit grid.
const TICK = 'M5 12.5l4.5 4.5L19 7.5';

/** The benefits: a petrol tick and the words, no tile and no icon to match (ADR-094 Ek 8 #5). */
export function Values({ rows }: { rows: ValueRow[] }) {
  const { color } = useTheme();
  return (
    <View style={styles.values}>
      {rows.map((row) => (
        <View key={row.words} style={styles.value}>
          <View style={styles.tick}>
            <Svg width={tokens.size.valueTick} height={tokens.size.valueTick} viewBox="0 0 24 24" accessible={false}>
              <Path d={TICK} stroke={color.accent} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
          </View>
          <Text style={[styles.valueText, { color: color.text }]}>{row.words}</Text>
        </View>
      ))}
    </View>
  );
}

/** "Example", "Yours": a word in a thin frame, never a fill (the one fill is the button, ADR-094 Ek 8 #2). */
export function FramedTag({ label }: { label: string }) {
  const { color } = useTheme();
  return (
    <View style={[styles.tag, { borderColor: color.edge }]}>
      <Text style={[styles.tagText, { color: color.textSecondary }]}>{label}</Text>
    </View>
  );
}

/**
 * One plan to choose, a tile beside the other: its name and a radio, the store's price large in the rounded face, how it is
 * billed (yearly: a month's price), and the saving in petrol words. `price` is the store's own string (K2); the words are read
 * together (the line's `label`).
 */
export function PlanOption({ line, price, selected, disabled, onPress }: { line: PlanLine; price: string; selected: boolean; disabled: boolean; onPress: () => void }) {
  const { color } = useTheme();
  const radioFill = selected ? <View style={[styles.radioFill, { backgroundColor: color.accent }]} /> : null;
  // The same height either way: a tile with no saving keeps the line's room, so the two tiles stand level.
  const saving = <Text style={[styles.saving, { color: color.accent }]}>{line.badge ?? ''}</Text>;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={line.label}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.plan, { backgroundColor: color.tintDay, borderColor: selected ? color.accent : color.tintDay }]}>
      <View style={styles.planTop}>
        <Text style={[styles.planTitle, { color: color.text }]}>{line.title}</Text>
        <View style={[styles.radio, { borderColor: selected ? color.accent : color.edge }]}>{radioFill}</View>
      </View>
      <Text style={[styles.price, { color: color.text }]}>{price}</Text>
      <Text style={[styles.note, { color: color.textSecondary }]}>{line.perMonth ?? line.note}</Text>
      {saving}
    </Pressable>
  );
}

/**
 * "What happens, and when" on sage (time's ground, ADR-094 §1): the screen's serif heading — the trial in petrol after the
 * lead — then today as a coral dot and its word, each next day a petrol ring, the rail between them soft petrol.
 */
export function TimelineCard({ rows, title, lead, accent }: { rows: TimelineRow[]; title: string; lead: string; accent: string | null }) {
  const { color } = useTheme();
  const accentWords = accent === null ? null : <Text style={{ color: color.accent }}>{` ${accent}`}</Text>;
  return (
    <View accessibilityLabel={t('subscription.timeline.label')} style={[styles.timeline, { backgroundColor: color.tintTime }]}>
      <Text accessibilityRole="header" accessibilityLabel={title} style={[styles.heading, { color: color.text }]}>
        {lead}
        {accentWords}
      </Text>
      {rows.map((row, index) => {
        const today = index === 0;
        const rail = index < rows.length - 1 ? <View style={[styles.connector, { backgroundColor: color.accentMid }]} /> : null;
        return (
          <View key={`${row.day}-${row.words}`} style={styles.step}>
            <View style={styles.rail}>
              <View style={[styles.dot, today ? { borderColor: color.progress, backgroundColor: color.progress } : { borderColor: color.accent, backgroundColor: color.tintTime }]} />
              {rail}
            </View>
            <View style={[styles.stepText, index === rows.length - 1 && styles.lastStep]}>
              <Text style={[styles.when, { color: today ? color.progressText : color.text }]}>{row.when}</Text>
              <Text style={[styles.words, { color: color.textSecondary }]}>{row.words}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  values: { gap: tokens.space.sm },
  value: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space.md },
  tick: { paddingTop: tokens.space.xs / 2 },
  valueText: { flex: 1, fontSize: tokens.type.body },
  tag: { borderWidth: tokens.border.hairline, borderRadius: tokens.radius.chip, paddingHorizontal: tokens.space.sm, paddingVertical: tokens.space.xs / 2 },
  tagText: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
  plan: { flex: 1, borderRadius: tokens.radius.card, borderWidth: tokens.border.ring, padding: tokens.space.md, gap: tokens.space.xs, minHeight: tokens.size.touch },
  planTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space.sm },
  planTitle: { flexShrink: 1, fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  radio: { width: tokens.size.planRadio, height: tokens.size.planRadio, borderRadius: tokens.size.planRadio / 2, borderWidth: tokens.border.outline, alignItems: 'center', justifyContent: 'center' },
  radioFill: { width: tokens.size.planRadio / 2, height: tokens.size.planRadio / 2, borderRadius: tokens.size.planRadio / 4 },
  price: { ...tokens.face.displayBold, fontSize: tokens.type.heading, fontVariant: ['tabular-nums'] },
  note: { fontSize: tokens.type.bodySmall },
  saving: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.bold },
  timeline: { borderRadius: tokens.radius.card, padding: tokens.space.lg, gap: 0 },
  heading: { ...tokens.face.display, fontSize: tokens.type.heading, paddingBottom: tokens.space.md },
  step: { flexDirection: 'row', gap: tokens.space.md },
  rail: { width: tokens.size.timelineDot, alignItems: 'center' },
  dot: { width: tokens.size.timelineDot, height: tokens.size.timelineDot, borderRadius: tokens.size.timelineDot / 2, borderWidth: tokens.border.ring - 1 },
  connector: { width: tokens.border.ring - 1, flexGrow: 1, minHeight: tokens.space.md },
  stepText: { flex: 1, paddingBottom: tokens.space.md, gap: tokens.space.xs / 2 },
  lastStep: { paddingBottom: 0 },
  when: { ...tokens.face.displayBold, fontSize: tokens.type.bodySmall, fontVariant: ['tabular-nums'] },
  words: { fontSize: tokens.type.bodySmall },
});
