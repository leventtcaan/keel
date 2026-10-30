import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Card } from '@/components/Card';
import { Section } from '@/components/Section';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { changeRows } from '@/today/callChanges';
import { shortDate } from '@/train/program';
import type { UnitSystem } from '@/units/units';

/**
 * Calls (ADR-078 #2, Ek 3, prototype `#progress`): the latest calls the server listed, newest first. A row opens that call on
 * the call screen, read only (`?id=`, back to Progress); one that was not applied says so, in plain words (U7: no blame). The
 * ledger screen is off the surface (ADR-069 #3), so no way leads to it from here: the card lists the latest calls_shown.
 */
export function CallsCard({ items, units }: { items: components['schemas']['Decision'][]; units: UnitSystem }) {
  const { color } = useTheme();
  const rows = items.map((call, index) => {
    const title = t(`${call.copyKey}.title`);
    const date = shortDate(call.madeOn);
    const declined = call.application.state === 'DECLINED';
    // The date tells the rows apart (three calls can all be "Keep going exactly as you are."): then what the call moved, old to new;
    // the words of the call only when they differ from the row above, else "No change".
    const moved = changeRows(call, units).slice(0, MOVED_SHOWN).map((row) =>
      row.from === null ? t('progress.calls.moved', { label: row.label, to: row.to }) : t('progress.calls.change', { label: row.label, from: row.from, to: row.to }),
    );
    const repeats = index > 0 && t(`${items[index - 1].copyKey}.title`) === title;
    const words = repeats ? (moved.length === 0 ? t('progress.calls.noChange') : null) : title;
    return (
      <Pressable
        key={call.id}
        testID={`call-${call.id}`}
        accessibilityRole="button"
        accessibilityLabel={t(declined ? 'progress.calls.rowLabelNotApplied' : 'progress.calls.rowLabel', { title, date })}
        onPress={() => router.push({ pathname: '/call', params: { id: call.id, from: 'progress' } })}
        style={({ pressed }) => [styles.row, pressed && styles.dim]}>
        <View style={styles.grow}>
          <Text style={[styles.title, { color: color.text }]}>{date}</Text>
          {words === null ? null : <Text style={[styles.fine, { color: color.textSecondary }]}>{words}</Text>}
          {moved.map((line) => (
            <Text key={line} style={[styles.fine, { color: color.accent }]}>
              {line}
            </Text>
          ))}
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

/** The most targets a row of the list says it moved. */
const MOVED_SHOWN = 2;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, minHeight: tokens.size.touch },
  grow: { flex: 1 },
  title: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  fine: { fontSize: tokens.type.bodySmall },
  dim: { opacity: tokens.opacity.dim },
});
