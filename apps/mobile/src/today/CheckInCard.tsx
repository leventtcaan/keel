import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * This week's check-in on Today (K-501): until it is answered, how much it asks — the server's count, at most the week's
 * question budget (U9) — and the way in. Answered, the week's call is the call card's.
 */
export function CheckInCard({ checkIn }: { checkIn: components['schemas']['CheckIn'] }) {
  const { color } = useTheme();
  if (checkIn.answered) return null;
  const count = checkIn.questions.length;
  const note = count === 0 ? t('today.checkIn.none') : count === 1 ? t('today.checkIn.one') : t('today.checkIn.questions', { count });
  return (
    <Card>
      <Text style={[styles.title, { color: color.text }]}>{t('today.checkIn.title')}</Text>
      <Text style={[styles.text, { color: color.textSecondary }]}>{note}</Text>
      <Button label={t('today.checkIn.open')} size="sm" onPress={() => router.push('/check-in')} />
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  text: { fontSize: tokens.type.body },
});
