/**
 * The paywall's hero (paywall v2, ADR-072 Ek 3, prototype `#heroCall` / `#heroSet`): the app's own card, drawn as the app draws a
 * call, and marked EXAMPLE: it is not this person's call (no fake proof, U1: the numbers are copy, never computed). The weekly
 * call when the user's plan has calls; without the health data consent there are none (ADR-074), so a set's target instead.
 */
import { StyleSheet, Text, View } from 'react-native';

import { DecisionBlock } from '@/components/DecisionBlock';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

export type ExampleKind = 'call' | 'set';

export function ExampleCard({ kind }: { kind: ExampleKind }) {
  const { color } = useTheme();
  const key = (part: string) => t(`subscription.example.${kind}.${part}`);
  const tag = (
    <View style={[styles.tag, { backgroundColor: color.accent }]}>
      <Text style={[styles.tagText, { color: color.onAccent }]}>{t('subscription.example.tag')}</Text>
    </View>
  );
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
  tag: { borderRadius: tokens.radius.chip, paddingHorizontal: tokens.space.sm, paddingVertical: tokens.space.xs },
  tagText: { fontSize: tokens.type.label, fontWeight: tokens.weight.black },
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
  from: { fontFamily: tokens.font.display, fontSize: tokens.type.displaySmall, textDecorationLine: 'line-through' },
  arrow: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.bold },
  to: { fontFamily: tokens.font.display, fontSize: tokens.type.display },
  unit: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.bold },
  why: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold },
  step: { fontWeight: tokens.weight.bold },
});
