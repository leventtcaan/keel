import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import { t } from '@/copy';
import { CountUp } from '@/motion/CountUp';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import type { Target } from './sections';
import { openDetail } from '@/settings/detail';

const num = (n: number) => n.toLocaleString('en-US');
/** An estimate stays a range (U5); a day with nothing logged is a plain 0. */
function eatenText(low: number, high: number, spoken = false): string {
  if (high === 0) return '0';
  if (low === high) return num(low);
  return t(spoken ? 'format.rangeSpoken' : 'format.range', { low: num(low), high: num(high) });
}
const share = (done: number, of: number) => (of > 0 ? done / of : 0);

type BoxProps = { kind: Target['kind']; title: string; value: string | null; of: string; fill: number; source: string; label: string; hint: string; onPress: () => void };

/** A box's number written as one whole number ("1,450"): it counts up to the server's number. A range or a dash stays as written (U5). */
const countedOf = (value: string | null): number | null => (value !== null && /^\d[\d,]*$/.test(value) ? Number(value.replaceAll(',', '')) : null);

function Box({ kind, title, value, of, fill, source, label, hint, onPress }: BoxProps) {
  const { color } = useTheme();
  const counted = countedOf(value);
  return (
    <Pressable
      testID={`target-${kind}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      style={({ pressed }) => [styles.box, { backgroundColor: color.surface }, pressed && styles.dim]}>
      <View style={styles.top}>
        <Text style={[styles.title, { color: color.muted }]}>{title}</Text>
        <SymbolView name="chevron.right" size={tokens.type.label} tintColor={color.muted} />
      </View>
      <Text style={[styles.value, { color: color.text }]}>
        {counted === null ? value : <CountUp value={counted} format={num} />}
        <Text style={[styles.of, { color: color.muted }]}>{of === '' ? '' : ` ${of}`}</Text>
      </Text>
      <ProgressBar value={fill} label={label} />
      <Text style={[styles.source, { color: color.muted }]}>{source}</Text>
    </Pressable>
  );
}

/**
 * The first days' four targets (ADR-078 #1, prototype `.tgt`): each opens where it is logged: Calories and Protein the meal,
 * Steps Apple Health (or, not yet connected, Settings where it is connected), Cardio the cardio log
 * (ADR-078 Ek 2: the screen the "+" sheet's Cardio row opens, not the Train tab). The numbers are the server's; what was eaten is a range against the one-number target (U5).
 */
export function TargetsGrid({ targets }: { targets: Target[] }) {
  const { report } = useAppServices();
  const boxes = targets.map((target) => {
    switch (target.kind) {
      case 'calories': {
        const { low, high } = target.eaten;
        const label = t('progress.targets.label.calories', { eaten: eatenText(low, high, true), target: num(target.target) });
        return (
          <Box key="calories" kind="calories" title={t('progress.targets.calories')} value={eatenText(low, high)} of={t('progress.targets.ofKcal', { target: num(target.target) })}
            fill={share((low + high) / 2, target.target)} source={t('progress.targets.fromMeals')} label={label} hint={t('progress.targets.hint.meal')} onPress={() => router.push('/meal')} />
        );
      }
      case 'protein': {
        const { low, high } = target.eaten;
        const label = t('progress.targets.label.protein', { eaten: eatenText(low, high, true), target: num(target.target) });
        return (
          <Box key="protein" kind="protein" title={t('progress.targets.protein')} value={eatenText(low, high)} of={t('progress.targets.ofGrams', { target: num(target.target) })}
            fill={share((low + high) / 2, target.target)} source={t('progress.targets.fromMeals')} label={label} hint={t('progress.targets.hint.meal')} onPress={() => router.push('/meal')} />
        );
      }
      case 'steps': {
        const of = t('progress.targets.ofSteps', { target: num(target.target) });
        if (target.steps === null) {
          return (
            <Box key="steps" kind="steps" title={t('progress.targets.steps')} value={t('progress.targets.noSteps')} of="" fill={0} source={t('progress.targets.connect')}
              label={t('progress.targets.label.stepsOff', { target: num(target.target) })} hint={t('progress.targets.hint.connect')} onPress={() => openDetail('apple')} />
          );
        }
        const open = () => void Linking.openURL('x-apple-health://').catch((error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' }));
        return (
          <Box key="steps" kind="steps" title={t('progress.targets.steps')} value={num(target.steps)} of={of} fill={share(target.steps, target.target)}
            source={t('progress.targets.appleHealth')} label={t('progress.targets.label.steps', { steps: num(target.steps), target: num(target.target) })}
            hint={t('progress.targets.hint.health')} onPress={open} />
        );
      }
      case 'cardio':
        return (
          <Box key="cardio" kind="cardio" title={t('progress.targets.cardio')} value={String(target.done)} of={t('progress.targets.ofCardio', { count: target.count })}
            fill={share(target.done, target.count)} source={t('progress.targets.each', { minutes: target.minutes })}
            label={t('progress.targets.label.cardio', { done: target.done, count: target.count, minutes: target.minutes })} hint={t('progress.targets.hint.cardio')} onPress={() => router.push('/cardio')} />
        );
    }
  });
  return <View style={styles.grid}>{boxes}</View>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  box: { flexGrow: 1, flexBasis: '45%', minHeight: tokens.size.targetBox, borderRadius: tokens.radius.card, padding: tokens.space.md, gap: tokens.space.sm },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.bold },
  value: { fontFamily: tokens.font.display, fontSize: tokens.type.heading, fontVariant: ['tabular-nums'] },
  of: { fontFamily: undefined, fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold },
  source: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
  dim: { opacity: tokens.opacity.dim },
});
