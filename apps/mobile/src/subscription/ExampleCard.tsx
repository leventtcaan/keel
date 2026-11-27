/**
 * The paywall's hero without calls (paywall v2, ADR-072 Ek 3, prototype `#heroSet`; ADR-094 Ek 8): without the health data
 * consent there are no calls (ADR-074), so a set's target, drawn as the app draws a call and marked Example in a thin frame: it
 * is not this person's set (no fake proof, U1: the numbers are copy, never computed). With calls, the example is told in weight
 * (PaywallHero.tsx).
 */
import { StyleSheet, Text, View } from 'react-native';

import { DecisionBlock } from '@/components/DecisionBlock';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { FramedTag } from './PaywallParts';

export function ExampleCard() {
  const { color } = useTheme();
  const key = (part: string) => t(`subscription.example.set.${part}`);
  const tag = <FramedTag label={t('subscription.example.tag')} />;
  return (
    <View accessibilityLabel={key('label')}>
      <DecisionBlock eyebrow={key('eyebrow')} aside={tag} title={key('title')}>
        <View style={[styles.row, { borderTopColor: color.line }]}>
          <Text style={[styles.key, { color: color.muted }]}>{key('row')}</Text>
          <View accessible accessibilityLabel={key('spoken')} style={styles.nums}>
            <Text style={[styles.from, { color: color.muted }]}>{key('from')}</Text>
            <Text style={[styles.arrow, { color: color.muted }]}>{t('subscription.example.arrow')}</Text>
            <Text style={[styles.to, { color: color.accent }]}>{key('to')}</Text>
            <Text style={[styles.unit, { color: color.text }]}>{key('unit')}</Text>
          </View>
        </View>
        <Text style={[styles.why, { color: color.text }]}>
          {key('why')} <Text style={[styles.step, { color: color.accent }]}>{key('step')}</Text>
        </Text>
      </DecisionBlock>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
    borderTopWidth: tokens.border.hairline,
    paddingTop: tokens.space.sm,
  },
  key: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold },
  nums: { flexDirection: 'row', alignItems: 'baseline', gap: tokens.space.xs },
  from: { ...tokens.face.displayBold, fontSize: tokens.type.displaySmall, textDecorationLine: 'line-through' },
  arrow: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.bold },
  to: { ...tokens.face.displayBold, fontSize: tokens.type.display },
  unit: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.bold },
  why: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold },
  step: { fontWeight: tokens.weight.bold },
});
