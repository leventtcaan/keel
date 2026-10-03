import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { load, type Loaded } from '@/today/today';
import { whatIfRows } from '@/today/whatIf';

type WhatIf = components['schemas']['WhatIf'];

/**
 * "What would change the call" (K-610, L3 Y3, prototype 5.6): the same rules run on example weeks after this call — each
 * "if" with the call the rules would make. Read from the server (the engine decides, U1); said to be example data,
 * never the user's own (U2: which data would change it).
 */
export default function WhatIfScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAppServices();
  const { color } = useTheme();
  const [read, setRead] = useState<Loaded<WhatIf> | null>(null);

  useEffect(() => {
    let live = true;
    void load(() => api.GET('/v1/decisions/{id}/what-if', { params: { path: { id } } })).then((loaded) => {
      if (live) setRead(loaded);
    });
    return () => {
      live = false;
    };
  }, [api, id]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <View style={styles.head}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('why.back')} onPress={() => router.back()} hitSlop={tokens.space.md}>
          <Text style={[styles.back, { color: color.text }]}>{`${t('settings.backMark')} ${t('why.back')}`}</Text>
        </Pressable>
        <ScreenTitle>{t('whatIf.title')}</ScreenTitle>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Body read={read} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Body({ read }: { read: Loaded<WhatIf> | null }) {
  const { color } = useTheme();
  const line = (key: string) => <Text style={[styles.text, { color: color.textSecondary }]}>{t(key)}</Text>;
  if (read === null) return null;
  if (read.state === 'consent') {
    return (
      <View style={styles.note}>
        {line('today.consent.body')}
        <Button label={t('today.consent.open')} variant="ghost" size="sm" onPress={() => router.push('/settings')} />
      </View>
    );
  }
  if (read.state === 'none') return line('whatIf.latestOnly');
  if (read.state !== 'ready') return line('whatIf.failed');
  return (
    <>
      {line('whatIf.intro')}
      {whatIfRows(read.value).map((row) => (
        <Card key={row.when}>
          <Text style={[styles.small, { color: color.textSecondary }]}>{row.when}</Text>
          <Text style={[styles.then, { color: color.text }]}>{row.then}</Text>
        </Card>
      ))}
      <Text style={[styles.small, { color: color.muted }]}>{t('whatIf.example')}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  head: { paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.sm, gap: tokens.space.sm },
  back: { fontSize: tokens.type.body },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  note: { gap: tokens.space.sm },
  then: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
