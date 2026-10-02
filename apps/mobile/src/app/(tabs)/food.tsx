import { router } from 'expo-router';
import { useRef, useState } from 'react';
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
  const [repeatProblem, setRepeatProblem] = useState<string | null>(null);
  // Offers logged since this read: hidden until the next read lands (it shows their meal), so a second tap on a slow
  // network cannot log the same meal twice — each tap is a new clientId, which the server cannot tell apart. Kept with
  // the read they belong to: a new read starts with none hidden.
  const [repeated, setRepeated] = useState<{ read: typeof data; ids: ReadonlySet<string> }>({ read: null, ids: new Set() });
  const hidden = repeated.read === data ? repeated.ids : new Set<string>();
  const busy = useRef(false); // two presses in the same moment must not log twice

  const repeat = async (meal: components['schemas']['Meal']) => {
    if (busy.current) return;
    busy.current = true;
    setRepeating(true);
    setRepeatProblem(null);
    try {
      // The consent as the phone knows it: withdrawn in Settings since this list was read, nothing is kept.
      if (await consents.granted('HEALTH_DATA')) {
        await queue.record({
          kind: 'meal',
          body: { clientId: newClientId(), eatenAt: new Date().toISOString(), slot: meal.slot, repeatOf: meal.id },
        });
        setRepeated((before) => ({ read: data, ids: new Set(before.read === data ? before.ids : []).add(meal.id) }));
      } else {
        setRepeatProblem(t('food.repeat.noConsent'));
      }
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setRepeatProblem(t('food.repeat.failed'));
    } finally {
      busy.current = false;
      setRepeating(false);
      reload();
    }
  };

  const needsConsent = data !== null && (data.budget.state === 'consent' || data.targets.state === 'consent' || data.meals === null);
  const failed = data !== null && (data.budget.state === 'failed' || data.targets.state === 'failed' || (data.meals !== null && !data.mealsRead));
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
  const meals = data !== null && data.meals !== null ? <MealList meals={data.meals} complete={data.mealsRead} /> : null;
  const offered = data === null ? [] : data.offers.filter((meal) => !hidden.has(meal.id));
  const offers = offered.length > 0 ? <RepeatOffers offers={offered} busy={repeating} onRepeat={(meal) => void repeat(meal)} /> : null;
  const repeatNote = repeatProblem !== null ? <Text style={[styles.text, { color: color.text }]}>{repeatProblem}</Text> : null;

  return (
    // Bottom edge too: inside native tabs the bottom inset includes the tab bar, so the coach bar sits above it.
    <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{t('screens.food.title')}</ScreenTitle>
        {problem}
        {consent}
        {budget}
        {!needsConsent && data !== null && <Button label={t('food.log')} onPress={() => router.push('/meal')} />}
        {meals}
        {offers}
        {repeatNote}
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
