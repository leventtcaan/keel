import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CoachEntry } from '@/components/CoachEntry';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import type { components } from '@/api/schema';
import { BudgetLine } from '@/food/BudgetLine';
import { MealList, RepeatOffers } from '@/food/MealList';
import { TargetsCard } from '@/food/TargetsCard';
import { useFoodDay } from '@/food/useFoodDay';
import { useAppServices } from '@/services/ServicesProvider';
import { newClientId } from '@/sync/send';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * The Food tab's day (K-409, K-407): what is left of today's budget, as ranges (U5), today's meals, "same as yesterday"
 * one tap away, and the targets the calls set (K-216). Health data: without the consent, one line and the way to Settings;
 * nothing is logged and nothing kept on the phone without it (ADR-030 #25).
 */
export default function FoodScreen() {
  const { color } = useTheme();
  const { queue, consents, report } = useAppServices();
  const { data, reload } = useFoodDay();
  const [repeating, setRepeating] = useState(false);
  const [repeatFailed, setRepeatFailed] = useState(false);

  const repeat = async (meal: components['schemas']['Meal']) => {
    if (repeating) return;
    setRepeating(true);
    setRepeatFailed(false);
    try {
      // The consent as the phone knows it: withdrawn in Settings since this list was read, nothing is kept.
      if (await consents.granted('HEALTH_DATA')) {
        await queue.record({ kind: 'meal', body: { clientId: newClientId(), eatenAt: new Date().toISOString(), slot: meal.slot, repeatOf: meal.id } });
      }
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setRepeatFailed(true);
    } finally {
      setRepeating(false);
      reload();
    }
  };

  const needsConsent = data !== null && (data.budget.state === 'consent' || data.targets.state === 'consent' || data.meals === null);
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
  const meals = data !== null && data.meals !== null ? <MealList meals={data.meals} /> : null;
  const offers =
    data !== null && data.offers.length > 0 ? (
      <View style={styles.note}>
        <RepeatOffers offers={data.offers} busy={repeating} onRepeat={(meal) => void repeat(meal)} />
        {repeatFailed && <Text style={[styles.text, { color: color.text }]}>{t('food.repeat.failed')}</Text>}
      </View>
    ) : null;

  return (
    // Bottom edge too: inside native tabs the bottom inset includes the tab bar, so the coach bar sits above it.
    <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{t('screens.food.title')}</ScreenTitle>
        {problem}
        {consent}
        {budget}
        {meals}
        {offers}
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
