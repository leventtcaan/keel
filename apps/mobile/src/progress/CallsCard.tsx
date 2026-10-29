import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Card } from '@/components/Card';
import { Section } from '@/components/Section';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { shortDate } from '@/train/program';

/**
 * Calls (ADR-078 #2, Ek 3, prototype `#progress`): the latest calls the server listed, newest first. A row opens that call on
 * the call screen, read only (`?id=`, back to Progress); one that was not applied says so, in plain words (U7: no blame). The
 * ledger screen is off the surface (ADR-069 #3), so no way leads to it from here: the card lists the latest calls_shown.
 */
export function CallsCard({ items }: { items: components['schemas']['Decision'][] }) {
  const { color } = useTheme();
  const rows = items.map((call) => {
    const title = t(`${call.copyKey}.title`);
    const date = shortDate(call.madeOn);
    const declined = call.application.state === 'DECLINED';
    return (
      <Pressable
        key={call.id}
        testID={`call-${call.id}`}
        accessibilityRole="button"
        accessibilityLabel={t(declined ? 'progress.calls.rowLabelNotApplied' : 'progress.calls.rowLabel', { title, date })}
        onPress={() => router.push({ pathname: '/call', params: { id: call.id, from: 'progress' } })}
        style={({ pressed }) => [styles.row, pressed && styles.dim]}>
        <View style={styles.grow}>
          <Text style={[styles.title, { color: color.text }]}>{title}</Text>
          <Text style={[styles.fine, { color: color.muted }]}>{date}</Text>
          {declined ? <Text style={[styles.fine, { color: color.textSecondary }]}>{t('progress.calls.notApplied')}</Text> : null}
        </View>
        <SymbolView name="chevron.right" size={tokens.type.bodySmall} tintColor={color.muted} />
      </Pressable>
    );
  });
  return (
    <Section card testID="section-calls" title={t('progress.calls.title')}>
      <Card testID="calls-list">{rows}</Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, minHeight: tokens.size.touch },
  grow: { flex: 1 },
  title: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  fine: { fontSize: tokens.type.bodySmall },
  dim: { opacity: tokens.opacity.dim },
});
