import { formatNumber } from '@/copy/format';
import { router } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { ProgressBar } from '@/components/ProgressBar';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { type UnitSystem, formatWeight } from '@/units/units';
import { openDetail } from '@/settings/detail';
import type { WalkRead } from '@/walks/read';
import { walkLabel, walkLine } from '@/walks/words';

import type { WeightNumber } from './numbers';

const num = (n: number) => formatNumber(n);

type TileProps = {
  id: string;
  icon: SFSymbol;
  value: string;
  note?: string | null;
  badge?: SFSymbol;
  /** How far the day came against its target, 0…1, as a thin coral bar (ADR-094 §3); none for the weight. */
  share?: { value: number; label: string } | null;
  label: string;
  hint: string;
  onPress: () => void;
};

/**
 * One number of today: its glyph, the number, its bar or (the weight only) the change under it. It sits on the strip's
 * sand ground with no tile of its own (ADR-094 §3: no white box in a group). The whole number is the way to its place.
 */
function Tile({ id, icon, value, note = null, badge, share = null, label, hint, onPress }: TileProps) {
  const { color } = useTheme();
  const noteText =
    note === null ? null : (
      <Text style={[styles.note, { color: color.textSecondary }]}>
        {note}
      </Text>
    );
  // Built outside the JSX children (the raw-text guard reads them).
  const mark = badge === undefined ? null : <Icon name={badge} size="small" tone="muted" testID={`number-${id}-badge`} />;
  const bar = share === null ? null : <ProgressBar value={share.value} label={share.label} />;
  const head = (
    <View style={styles.head}>
      <Icon name={icon} size="small" tone="muted" />
      {mark}
    </View>
  );
  return (
    <Pressable
      testID={`number-${id}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.dim]}>
      {head}
      <Text style={[styles.value, { color: color.text }]}>
        {value}
      </Text>
      {bar}
      {noteText}
    </Pressable>
  );
}

type Props = {
  protein: { eaten: number; target: number } | null;
  steps: { steps: number | null; target: number } | null;
  weight: WeightNumber | null;
  /** The steps left as a walk the user knows (K-1216): one line under the numbers. */
  walk?: WalkRead | null;
  units: UnitSystem;
};

/**
 * The numbers under the food row (K-1206): protein against its target, today's steps against theirs, the weight's trend. Each is
 * drawn only when its part was read; a number that is not there is said as such (steps without Apple Health: the target alone, the
 * connect step on a tap), never a zero. Nothing is worked out here (U1): the figures are `numbers.ts`'s.
 */
export function TodayNumbers({ protein, steps, weight, walk = null, units }: Props) {
  const { report } = useAppServices();
  const { color } = useTheme();
  const openHealth = () => void Linking.openURL('x-apple-health://').catch((error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' }));
  const tiles = [];
  if (protein !== null) {
    const [eaten, target] = [num(protein.eaten), num(protein.target)];
    tiles.push(
      <Tile key="protein" id="protein" icon="p.circle" value={t('thisWeek.numbers.protein', { eaten, target })} label={t('progress.targets.label.protein', { eaten, target })}
        share={protein.target > 0 ? { value: protein.eaten / protein.target, label: t('progress.targets.label.protein', { eaten, target }) } : null}
        hint={t('progress.targets.hint.meal')} onPress={() => router.push('/food')} />,
    );
  }
  if (steps !== null) {
    const target = num(steps.target);
    if (steps.steps === null) {
      tiles.push(
        <Tile key="steps" id="steps" icon="figure.walk" value={t('thisWeek.numbers.stepsNone', { target })} badge="link" label={t('progress.targets.label.stepsOff', { target })}
          hint={t('progress.targets.hint.connect')} onPress={() => openDetail('apple')} />,
      );
    } else {
      const count = num(steps.steps);
      const open = openHealth;
      tiles.push(
        <Tile key="steps" id="steps" icon="figure.walk" value={t('thisWeek.numbers.steps', { steps: count, target })} label={t('progress.targets.label.steps', { steps: count, target })}
          share={steps.target > 0 ? { value: (steps.steps ?? 0) / steps.target, label: t('progress.targets.label.steps', { steps: count, target }) } : null}
          hint={t('progress.targets.hint.health')} onPress={open} />,
      );
    }
  }
  if (weight?.kind === 'waiting') {
    tiles.push(
      <Tile key="weight" id="weight" icon="scalemass" value={t('progress.weight.count', { count: weight.count, min: weight.min })} label={t('progress.weight.spoken', { count: weight.count, min: weight.min })}
        hint={t('thisWeek.numbers.weightWaitingHint')} onPress={() => router.push('/weigh-in')} />,
    );
  } else if (weight?.kind === 'trend') {
    const shown = formatWeight(weight.kg, units);
    const { change } = weight;
    const label =
      change === null
        ? t('thisWeek.numbers.weightLabel', { weight: shown })
        : t('thisWeek.numbers.weightLabelChange', {
            weight: shown,
            change: t(`thisWeek.numbers.spoken${change.direction === 'down' ? 'Down' : change.direction === 'up' ? 'Up' : 'Steady'}`, { size: change.size, span: change.span }),
          });
    tiles.push(
      <Tile key="weight" id="weight" icon="scalemass" value={shown} note={change === null ? null : t(`thisWeek.numbers.${change.direction}`, { size: change.size })} label={label}
        hint={t('thisWeek.numbers.weightHint')} onPress={() => router.navigate('/progress')} />,
    );
  }
  if (tiles.length === 0) return null;
  // The steps left as a walk (K-1216), under the numbers (first screen, budget 74, K-1216): an offer in one line, never a debt (U7).
  const walkText =
    walk === null || steps?.steps == null ? null : (
      <Pressable testID="walk-line" accessibilityRole="button" accessibilityLabel={walkLabel(walk.remaining, walk.suggestion)} accessibilityHint={t('progress.targets.hint.health')} onPress={openHealth}>
        <Text style={[styles.walk, { color: color.textSecondary }]}>{walkLine(walk.remaining, walk.suggestion)}</Text>
      </Pressable>
    );
  if (walkText === null) return <View style={styles.row}>{tiles}</View>;
  return (
    <View style={styles.stack}>
      <View style={styles.row}>{tiles}</View>
      {walkText}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space.sm },
  row: { flexDirection: 'row', gap: tokens.space.sm },
  walk: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold, fontVariant: ['tabular-nums'] },
  tile: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, minHeight: tokens.size.touch, paddingVertical: tokens.space.xs, gap: tokens.space.xs },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  value: { ...tokens.face.displayBold, fontSize: tokens.type.body, fontVariant: ['tabular-nums'] },
  note: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold, fontVariant: ['tabular-nums'] },
  dim: { opacity: tokens.opacity.dim },
});
