import { router } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CoachEntry } from '@/components/CoachEntry';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { BudgetLine } from '@/food/BudgetLine';
import { TargetsCard } from '@/food/TargetsCard';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { load } from '@/today/today';
import { useReadOnFocus } from '@/today/useReadOnFocus';

/**
 * The Food tab's day (K-409): what is left of today's budget, as ranges (U5), and the targets the calls set (K-216).
 * Meal logging joins it in K-407. Health data: without the consent, one line and the way to Settings.
 */
export default function FoodScreen() {
  const { color } = useTheme();
  const { api } = useAppServices();
  const read = useCallback(
    async (day: string) => {
      const [budget, targets] = await Promise.all([
        load(() => api.GET('/v1/days/{day}/budget', { params: { path: { day } } })),
        load(() => api.GET('/v1/targets')),
      ]);
      return { budget, targets };
    },
    [api],
  );
  const { data, reload } = useReadOnFocus(read);

  const needsConsent = data !== null && (data.budget.state === 'consent' || data.targets.state === 'consent');
  const failed = data !== null && (data.budget.state === 'failed' || data.targets.state === 'failed');
  const budget =
    data === null || needsConsent ? null : data.budget.state === 'ready' ? (
      <Card testID="budget">
        <Text style={[styles.label, { color: color.muted }]}>{t('food.budget.title')}</Text>
        <BudgetLine left={data.budget.value.left} />
      </Card>
    ) : data.budget.state === 'none' ? (
      <Text style={[styles.text, { color: color.textSecondary }]}>{t('food.budget.none')}</Text>
    ) : null;
  const problem = failed ? (
    <View style={styles.note}>
      <Text style={[styles.text, { color: color.textSecondary }]}>{t('today.failed')}</Text>
      <Button label={t('today.retry')} variant="ghost" size="sm" onPress={reload} />
    </View>
  ) : null;
  const consent = needsConsent ? (
    <View style={styles.note}>
      <Text style={[styles.text, { color: color.textSecondary }]}>{t('food.consent')}</Text>
      <Button label={t('today.consent.open')} variant="ghost" size="sm" onPress={() => router.push('/settings')} />
    </View>
  ) : null;
  const targets = data !== null && data.targets.state === 'ready' ? <TargetsCard targets={data.targets.value} /> : null;

  return (
    // Bottom edge too: inside native tabs the bottom inset includes the tab bar, so the coach bar sits above it.
    <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{t('screens.food.title')}</ScreenTitle>
        {problem}
        {consent}
        {budget}
        {targets}
      </ScrollView>
      <View style={styles.coach}>
        <CoachEntry />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  note: { gap: tokens.space.sm },
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
  coach: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.sm },
});
