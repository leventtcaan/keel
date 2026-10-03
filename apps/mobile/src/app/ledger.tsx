import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { ledgerEntries } from '@/today/ledger';
import { load } from '@/today/today';
import type { UnitSystem } from '@/units/units';

type Decision = components['schemas']['Decision'];
type Read = { state: 'loading' } | { state: 'ready'; calls: Decision[]; next: string | null } | { state: 'none' } | { state: 'consent' } | { state: 'failed' };

/**
 * The call ledger (K-611, L3 Y4): every weekly call, newest first, each with what the trend did after it — read from the
 * server (K-212's kept calls), "after" and never "because". Older calls a page at a time; each opens its "Why this call".
 */
export default function LedgerScreen() {
  const { api } = useAppServices();
  const units = useUnits();
  const { color } = useTheme();
  const [read, setRead] = useState<Read>({ state: 'loading' });

  const page = useCallback(
    async (before: string | null, kept: Decision[]) => {
      const loaded = await load(() => api.GET('/v1/decisions', before === null ? undefined : { params: { query: { before } } }));
      if (loaded.state !== 'ready') return loaded.state === 'none' ? { state: 'none' as const } : { state: loaded.state };
      const calls = [...kept, ...loaded.value.items];
      return calls.length === 0 ? { state: 'none' as const } : { state: 'ready' as const, calls, next: loaded.value.next ?? null };
    },
    [api],
  );

  useEffect(() => {
    let live = true;
    void page(null, []).then((first) => {
      if (live) setRead(first);
    });
    return () => {
      live = false;
    };
  }, [page]);

  const older = async () => {
    if (read.state !== 'ready' || read.next === null) return;
    const more = await page(read.next, read.calls);
    // An older page not read keeps what is shown; the button stays to try again.
    if (more.state === 'ready') setRead(more);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <View style={styles.head}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('why.back')} onPress={() => router.back()} hitSlop={tokens.space.md}>
          <Text style={[styles.back, { color: color.text }]}>{`${t('settings.backMark')} ${t('why.back')}`}</Text>
        </Pressable>
        <ScreenTitle>{t('ledger.title')}</ScreenTitle>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Body read={read} units={units} onOlder={() => void older()} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Body({ read, units, onOlder }: { read: Read; units: UnitSystem; onOlder: () => void }) {
  const { color } = useTheme();
  const line = (key: string) => <Text style={[styles.text, { color: color.textSecondary }]}>{t(key)}</Text>;
  if (read.state === 'loading') return null;
  if (read.state === 'none') return line('ledger.none');
  if (read.state === 'failed') return line('ledger.failed');
  if (read.state === 'consent') {
    return (
      <View style={styles.note}>
        {line('today.consent.body')}
        <Button label={t('today.consent.open')} variant="ghost" size="sm" onPress={() => router.push('/settings')} />
      </View>
    );
  }
  return (
    <>
      {line('ledger.intro')}
      {ledgerEntries(read.calls, units).map((entry) => (
        <Card key={entry.id}>
          <Text style={[styles.small, { color: color.muted }]}>{entry.date}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/why', params: { id: entry.id } })}>
            <Text style={[styles.title, { color: color.text }]}>{entry.title}</Text>
          </Pressable>
          {entry.state !== null && <Text style={[styles.small, { color: color.textSecondary }]}>{entry.state}</Text>}
          {entry.after !== null && <Text style={[styles.text, { color: color.textSecondary }]}>{entry.after}</Text>}
        </Card>
      ))}
      {read.next !== null && <OlderButton onPress={onOlder} />}
    </>
  );
}

function OlderButton({ onPress }: { onPress: () => void }) {
  return <Button label={t('ledger.more')} variant="ghost" size="sm" onPress={onPress} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  head: { paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.sm, gap: tokens.space.sm },
  back: { fontSize: tokens.type.body },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  note: { gap: tokens.space.sm },
  title: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
