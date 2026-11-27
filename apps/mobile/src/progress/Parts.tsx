/** The Progress tab's cards (K-979, ADR-078, ADR-094 Ek 3): this week's muscles, strength, the weigh-ins toward the trend, the lock line. */
import { SymbolView } from 'expo-symbols';
import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { MuscleMap } from '@/components/MuscleMap';
import { ProgressBar } from '@/components/ProgressBar';
import { Section } from '@/components/Section';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import type { Figure } from '@/train/demo';
import { exerciseName } from '@/train/program';
import { isBodyOnly, setText } from '@/train/session';
import type { Move } from '@/train/trainData';
import { type UnitSystem, formatLoad } from '@/units/units';

import type { DotsNote } from './sections';
import { openDetail } from '@/settings/detail';

type Schemas = components['schemas'];

/** "Needs your OK for health data · Allow" (ADR-072 Ek 1): in place of what needs the consent; Allow leads to Settings. */
export function LockLine() {
  const { color } = useTheme();
  return (
    <View testID="progress-locked" style={[styles.lock, { backgroundColor: color.surface }]}>
      <SymbolView name="lock.fill" size={tokens.type.body} tintColor={color.muted} />
      <Text style={[styles.grow, styles.fine, { color: color.textSecondary }]}>{t('thisWeek.food.locked')}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={t('thisWeek.food.allowLabel')} onPress={() => openDetail('consent')} hitSlop={tokens.space.sm} style={styles.allow}>
        <Text style={[styles.strong, { color: color.accent }]}>{t('thisWeek.food.allow')}</Text>
      </Pressable>
    </View>
  );
}

/** A legend's square; one as light as the planned fill keeps the control edge, else it is lost on the card (WCAG 1.4.11). */
function Swatch({ fill, outlined = false, testID }: { fill: string; outlined?: boolean; testID?: string }) {
  const { color } = useTheme();
  return <View testID={testID} style={[styles.swatch, { backgroundColor: fill }, outlined && { borderColor: color.edge, borderWidth: tokens.border.hairline }]} />;
}

type MuscleSets = Schemas['MuscleSets'];

/** A muscle's sets this week under the map: its name, the sets of the target, a coral bar of the target (full past it). */
function PickedMuscle({ m }: { m: MuscleSets }) {
  const { color } = useTheme();
  const name = t(`demo.muscle.${m.muscle}`);
  return (
    <View
      testID={`muscle-picked-${m.muscle}`}
      accessible
      accessibilityLabel={t('progress.muscles.barLabel', { muscle: name, done: m.doneSets, target: m.targetSets })}
      style={styles.picked}>
      <View style={styles.pickedTop}>
        <Text style={[styles.pickedName, { color: color.text }]}>{name}</Text>
        <Text style={[styles.pickedSets, { color: color.text }]}>{t('progress.muscles.pickedSets', { done: m.doneSets, target: m.targetSets })}</Text>
      </View>
      {/* One element for VoiceOver: its label says the sets of the target, so the bar inside is not a second stop. */}
      <ProgressBar value={m.targetSets > 0 ? m.doneSets / m.targetSets : 0} label={name} />
    </View>
  );
}

/**
 * This week's muscles (ADR-078 #4, ADR-094 Ek 3 #5): the one map, planned first, filling as the user trains, drawn smaller and
 * taking a touch; under it the sets of the muscle touched (the first the server lists until one is), each muscle of an area
 * of several. The sets and the target are the server's. VoiceOver reaches the map as one image whose label says every
 * muscle's sets, so nothing is behind the touch for it; a muscle with no target has an empty bar. Nothing planned, no map.
 */
export function MusclesCard({ muscles, figure }: { muscles: MuscleSets[]; figure: Figure }) {
  const { color } = useTheme();
  const [touched, setTouched] = useState<string[] | null>(null);
  if (muscles.length === 0) return null;
  const trained = muscles.some((m) => m.doneSets > 0);
  // A touched muscle gone from the next read falls back to the first one.
  const shown = muscles.filter((m) => touched?.includes(m.muscle));
  const picked = shown.length > 0 ? shown : [muscles[0]];
  return (
    <Section card testID="section-muscles" title={t('progress.muscles.title')} aside={t(trained ? 'progress.muscles.thisWeek' : 'progress.muscles.planned')}>
      <MuscleMap muscles={muscles} figure={figure} small onPress={setTouched} />
      {picked.map((m) => (
        <PickedMuscle key={m.muscle} m={m} />
      ))}
      <View style={styles.legend} accessible={false}>
        <View style={styles.legendItem}>
          <Swatch testID="legend-planned" fill={color.accentSoft} outlined />
          <Text style={[styles.fine, { color: color.muted }]}>{t('progress.muscles.legendPlanned')}</Text>
        </View>
        <View style={styles.legendItem}>
          <Swatch fill={color.accent} />
          <Text style={[styles.fine, { color: color.muted }]}>{t('progress.muscles.legendDone')}</Text>
        </View>
      </View>
    </Section>
  );
}

/**
 * A best set as the user reads it (K-1028): "100 kg × 8", "+10 kg × 6" for a weighted move, "Bodyweight × 6" when the body is
 * the load (0 kg is not a weight to beat). The workout's own wording, from the move's load model; a move the catalog did not
 * give is written as an outside load, the only thing the phone can say of it.
 */
export function liftSet(set: { loadKg: number; reps: number }, move: Move | undefined, units: UnitSystem): string {
  return move === undefined ? t('progress.strength.set', { load: formatLoad(set.loadKg, units), reps: set.reps }) : setText(set, move, units);
}

/** Strength before the first workout (a lock, no chart) and after it (each lift's best set, the baseline to beat). */
export function StrengthCard({ part, lifts, moves, units }: { part: 'locked' | 'baseline'; lifts: Schemas['LiftProgress'][]; moves: ReadonlyMap<string, Move>; units: UnitSystem }) {
  const { color } = useTheme();
  let body: ReactNode;
  if (part === 'locked') {
    body = (
      <View testID="strength-locked" style={styles.row}>
        <SymbolView name="lock.fill" size={tokens.type.body} tintColor={color.muted} />
        <Text style={[styles.grow, styles.body, { color: color.textSecondary }]}>{t('progress.strength.locked')}</Text>
      </View>
    );
  } else {
    body = (
      <>
        {lifts.map((lift) => {
          const name = exerciseName(lift.exerciseId, moves);
          const move = moves.get(lift.exerciseId);
          const bodyOnly = move !== undefined && isBodyOnly(lift.best, move);
          const said = bodyOnly
            ? t('progress.strength.rowLabelBodyweight', { move: name, reps: lift.best.reps })
            : t('progress.strength.rowLabel', { move: name, load: formatLoad(lift.best.loadKg, units), reps: lift.best.reps });
          return (
            <View key={lift.exerciseId} testID={`strength-row-${lift.exerciseId}`} accessible accessibilityLabel={said} style={styles.row}>
              <Text style={[styles.grow, styles.body, { color: color.text }]}>{name}</Text>
              <Text style={[styles.strong, styles.nums, { color: color.text }]}>{liftSet(lift.best, move, units)}</Text>
            </View>
          );
        })}
        <Text style={[styles.fine, { color: color.muted }]}>{t('progress.strength.next')}</Text>
      </>
    );
  }
  return (
    <Section card testID="section-strength" title={t('progress.strength.title')} aside={part === 'baseline' ? t('progress.strength.baseline') : null}>
      {body}
    </Section>
  );
}

/** The weigh-ins toward the trend (ADR-078 #1, U8): which of the 7 are in; the trend itself shows only when it is ready. */
export function WeighInDots({ count, min, note }: { count: number; min: number; note: DotsNote }) {
  const { color } = useTheme();
  const line = note === null ? null : t(note === 'stale' ? 'progress.weight.stale' : 'progress.weight.after', { min });
  const dots = Array.from({ length: min }, (_, i) => (
    <View key={i} testID={i < count ? 'weight-dot-filled' : 'weight-dot-empty'} style={[styles.dot, i < count ? { backgroundColor: color.accent } : { backgroundColor: color.track, borderColor: color.edge, borderWidth: tokens.border.hairline }]} />
  ));
  return (
    <Section card testID="section-weight" title={t('progress.weight.title')} aside={t('progress.weight.count', { count, min })}>
      <View testID="weight-dots" accessible accessibilityLabel={t('progress.weight.spoken', { count, min })} style={styles.dots}>
        {dots}
      </View>
      {line === null ? null : <Text style={[styles.fine, { color: color.muted }]}>{line}</Text>}
    </Section>
  );
}

const styles = StyleSheet.create({
  fine: { fontSize: tokens.type.bodySmall },
  body: { fontSize: tokens.type.body },
  strong: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.bold },
  nums: { fontVariant: ['tabular-nums'] },
  grow: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, minHeight: tokens.size.touch },
  lock: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, borderRadius: tokens.radius.card, padding: tokens.space.md, minHeight: tokens.size.touch },
  allow: { minHeight: tokens.size.touch, justifyContent: 'center', paddingHorizontal: tokens.space.sm },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: tokens.space.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs },
  swatch: { width: tokens.size.swatch, height: tokens.size.swatch, borderRadius: tokens.radius.track },
  picked: { gap: tokens.space.xs },
  pickedTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: tokens.space.sm },
  pickedName: { ...tokens.face.display, fontSize: tokens.type.body },
  pickedSets: { ...tokens.face.displaySemiBold, fontSize: tokens.type.body, fontVariant: ['tabular-nums'] },
  // The weigh-ins toward the trend as one segmented bar across the card (K-1054), a segment for each; one not yet made keeps
  // the control edge (WCAG 1.4.11, K-816).
  dots: { flexDirection: 'row', gap: tokens.space.xs },
  dot: { flex: 1, height: tokens.space.sm, borderRadius: tokens.radius.track },
});
