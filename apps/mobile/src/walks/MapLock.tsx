import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * Where the map would be, without a subscription (K-1251, ADR-094 Ek 6): a sand group with a lock, one line and "See plans", in the words
 * and the look of the locked call. Opened only on a tap (ADR-057 D5).
 */
export function MapLock() {
  const { color } = useTheme();
  return (
    <View style={[styles.lock, { backgroundColor: color.tintDay }]}>
      <Icon name="lock.fill" size="small" tone="muted" />
      <Text style={[styles.line, { color: color.text }]}>{t('walks.today.locked')}</Text>
      <Button label={t('subscription.seePlans')} variant="text" size="sm" onPress={() => router.push('/paywall')} />
    </View>
  );
}

const styles = StyleSheet.create({
  lock: { borderRadius: tokens.radius.card, padding: tokens.space.lg, gap: tokens.space.sm, alignItems: 'flex-start' },
  line: { fontSize: tokens.type.body },
});
