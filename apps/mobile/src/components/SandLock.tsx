import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * Where a paid part would be, without a subscription (K-1251, ADR-096 #2): a sand group with a lock, one line and "See plans", in the
 * words and the look of the locked call. Opened only on a tap (ADR-057 D5): never a paywall that opens by itself.
 */
export function SandLock({ line, testID }: { line: string; testID?: string }) {
  const { color } = useTheme();
  return (
    <View testID={testID} style={[styles.lock, { backgroundColor: color.tintDay }]}>
      <Icon name="lock.fill" size="small" tone="muted" />
      <Text style={[styles.line, { color: color.text }]}>{line}</Text>
      <Button label={t('subscription.seePlans')} variant="text" size="sm" onPress={() => router.push('/paywall')} />
    </View>
  );
}

const styles = StyleSheet.create({
  lock: { borderRadius: tokens.radius.card, padding: tokens.space.lg, gap: tokens.space.sm, alignItems: 'flex-start' },
  line: { fontSize: tokens.type.body },
});
