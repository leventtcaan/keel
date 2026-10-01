import { router } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { newClientId } from '@/sync/send';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { load } from '@/today/today';
import { useReadOnFocus } from '@/today/useReadOnFocus';

/**
 * The user's gyms (K-421, ADR-032), from Settings: the one in use marked; each opens its equipment; a new one opens empty
 * under an id made here (the server stores a gym under the id the phone made). Read on focus, so an edit shows on return.
 */
export default function GymsScreen() {
  const { api } = useAppServices();
  const { color } = useTheme();
  const read = useCallback(() => load(() => api.GET('/v1/gyms')), [api]);
  const { data, reload } = useReadOnFocus(read);

  const gyms =
    data?.state === 'ready'
      ? data.value.map((gym) => (
          <Card key={gym.id}>
            <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/gym', params: { id: gym.id } })} style={styles.row}>
              <Text style={[styles.text, styles.grow, { color: color.text }]}>{gym.name}</Text>
              {gym.current && <Text style={[styles.small, { color: color.accent }]}>{t('gyms.inUse')}</Text>}
            </Pressable>
          </Card>
        ))
      : null;
  const failed =
    data !== null && data.state !== 'ready' ? (
      <View style={styles.block}>
        <Text style={[styles.text, { color: color.textSecondary }]}>{t('gyms.loadFailed')}</Text>
        <Button label={t('gyms.retry')} variant="ghost" onPress={reload} />
      </View>
    ) : null;

  const add =
    data?.state === 'ready' ? (
      <Button label={t('gyms.add')} variant="ghost" onPress={() => router.push({ pathname: '/gym', params: { id: newClientId() } })} />
    ) : null;

  return (
    <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={tokens.space.md}>
          <Text style={[styles.text, { color: color.text }]}>{t('gyms.back')}</Text>
        </Pressable>
        <ScreenTitle>{t('gyms.title')}</ScreenTitle>
        <Text style={[styles.small, { color: color.muted }]}>{t('gyms.note')}</Text>
        {gyms}
        {failed}
        {add}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  block: { gap: tokens.space.sm },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: tokens.space.sm },
  grow: { flex: 1 },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
