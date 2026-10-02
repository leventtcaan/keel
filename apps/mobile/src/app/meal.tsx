import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ScreenTitle } from '@/components/ScreenTitle';
import { TextField } from '@/components/TextField';
import { grantConsent } from '@/consent/consents';
import { has, t } from '@/copy';
import { EstimateCard } from '@/food/EstimateCard';
import { type DraftItem, type KnownFoods, addFood, itemProblem, requestsOf } from '@/food/draft';
import { defaultSlot } from '@/food/meals';
import { foodParams } from '@/food/params';
import { useAppServices } from '@/services/ServicesProvider';
import { newClientId } from '@/sync/send';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { load } from '@/today/today';

type Schemas = components['schemas'];
type Step = 'checking' | 'consent' | 'entry';
type Found = { state: 'idle' } | { state: 'tooShort' } | { state: 'failed' } | { state: 'found'; foods: Schemas['Food'][] };

const SLOTS: Schemas['MealSlot'][] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];
const PROBLEM_KEYS = { invalid: 'meal.item.invalid', tooMuch: 'meal.item.tooMuch' } as const;

/**
 * Logging a meal (K-407): the slot, foods found by name in the database (ADR-008), an amount for each — nothing filled
 * in for the user (I2 A4) — and, once every amount is given, the server's estimate as ranges with its one question
 * (U1, U5). Saved on the phone first and sent when it can be (K-304); the estimate is only a look, the server estimates
 * again when the meal arrives. Health data: the consent first, and nothing typed is kept without it (ADR-030 #25).
 */
export default function MealScreen() {
  const { api, queue, consents, report } = useAppServices();
  const { color } = useTheme();
  const [step, setStep] = useState<Step>('checking');
  const [slot, setSlot] = useState<Schemas['MealSlot']>(() => defaultSlot(new Date()));
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<Found>({ state: 'idle' });
  const [items, setItems] = useState<DraftItem[]>([]);
  const [known, setKnown] = useState<KnownFoods>(() => new Map());
  const [estimate, setEstimate] = useState<{ key: string; value: Schemas['FoodEstimate'] } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false); // two taps at once must not log twice
  // Each search answer belongs to the search that asked: a late one (slow network) never replaces a newer list, and none
  // comes back once a food was picked.
  const searchSeq = useRef(0);

  useEffect(() => {
    // Not known (a failing keychain) is not given: the consent step, never an endless wait.
    void consents
      .granted('HEALTH_DATA')
      .catch(() => false)
      .then((granted) => setStep(granted ? 'entry' : 'consent'));
  }, [consents]);

  const requests = requestsOf(items, known);
  const key = requests === null ? null : JSON.stringify(requests);

  // The estimate follows the items; an answer for items since changed is dropped (the key is checked when shown).
  useEffect(() => {
    if (key === null) return;
    let live = true;
    void load(() => api.POST('/v1/food-estimates', { body: { items: JSON.parse(key) as Schemas['ItemRequest'][] } })).then((answer) => {
      if (live && answer.state === 'ready') setEstimate({ key, value: answer.value });
    });
    return () => {
      live = false;
    };
  }, [api, key]);
  const shown = estimate !== null && estimate.key === key ? estimate.value : null;

  const allow = async () => {
    setBusy(true);
    setProblem(null);
    try {
      await grantConsent(api, 'HEALTH_DATA');
      await consents.remember('HEALTH_DATA', 'GRANTED');
      setStep('entry');
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setProblem(t('meal.consent.failed'));
    } finally {
      setBusy(false);
    }
  };

  const search = async () => {
    const q = query.trim();
    if (q.length < foodParams.searchMinChars) {
      searchSeq.current++;
      setFound({ state: 'tooShort' });
      return;
    }
    const mine = ++searchSeq.current;
    const answer = await load(() => api.POST('/v1/foods/search', { body: { q, limit: foodParams.searchResults } }));
    if (mine !== searchSeq.current) return;
    setFound(answer.state === 'ready' ? { state: 'found', foods: answer.value } : { state: 'failed' });
  };

  const add = (food: Schemas['Food']) => {
    searchSeq.current++;
    setItems((before) => addFood(before, food));
    setKnown((before) => new Map(before).set(food.id, food));
    setFound({ state: 'idle' });
    setQuery('');
  };
  const change = (index: number, part: Partial<DraftItem>) => {
    setItems((before) => before.map((item, i) => (i === index ? { ...item, ...part } : item)));
    setProblem(null);
  };

  const save = async () => {
    if (saving.current || requests === null) return;
    saving.current = true;
    setBusy(true);
    try {
      await queue.record({ kind: 'meal', body: { clientId: newClientId(), eatenAt: new Date().toISOString(), slot, items: requests } });
      router.back();
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setProblem(t('meal.saveFailed'));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  // A full meal takes no more: the server would refuse it, and the queue would lose it.
  const full = items.length >= foodParams.itemsMax;
  const results = found.state === 'found' && !full ? found.foods : [];
  const foundNote = full
    ? t('meal.full', { max: foodParams.itemsMax })
    : found.state === 'tooShort'
      ? t('meal.search.tooShort', { min: foodParams.searchMinChars })
      : found.state === 'failed'
        ? t('meal.search.failed')
        : found.state === 'found' && found.foods.length === 0
          ? t('meal.search.none')
          : null;
  // Named: with several items the question says which one it is about.
  const asked = shown?.question;
  const askedName = shown?.items.find((item) => item.foodId === asked?.foodId)?.name;
  const question =
    asked !== undefined && askedName !== undefined && has(asked.copyKey)
      ? t('meal.estimate.question', { name: askedName, question: t(asked.copyKey) })
      : null;

  const consentStep =
    step === 'consent' ? (
      <View style={styles.part}>
        <Text style={[styles.heading, { color: color.text }]}>{t('consent.health_data.title')}</Text>
        <Text style={[styles.text, { color: color.textSecondary }]}>{t('consent.health_data.body')}</Text>
        {problem !== null && <Text style={[styles.text, { color: color.text }]}>{problem}</Text>}
        <Button label={t('meal.consent.allow')} onPress={() => void allow()} disabled={busy} />
        <Button label={t('meal.consent.notNow')} variant="ghost" onPress={() => router.back()} disabled={busy} />
      </View>
    ) : null;

  const entry =
    step === 'entry' ? (
      <View style={styles.part}>
        <View style={styles.chips}>
          {SLOTS.map((option) => (
            <Chip key={option} label={t(`food.slot.${option}`)} selected={slot === option} onPress={() => setSlot(option)} />
          ))}
        </View>

        {items.map((item, index) => {
          const itemIssue = itemProblem(item, known);
          return (
            <View key={`${item.foodId}-${index}`} style={styles.item}>
              <Text style={[styles.name, { color: color.text }]}>{item.name}</Text>
              <TextField
                label={t('meal.item.amount', { name: item.name })}
                value={item.quantity}
                onChangeText={(quantity) => change(index, { quantity })}
                problem={itemIssue === null || itemIssue === 'missing' ? null : t(PROBLEM_KEYS[itemIssue])}
                keyboardType="decimal-pad"
                maxLength={foodParams.amountMaxChars}
              />
              <View style={styles.chips}>
                {item.units.map((unit) => {
                  const label = unit === 'g' ? t('meal.item.grams') : unit;
                  return (
                    <Chip
                      key={unit}
                      label={label}
                      accessibilityLabel={t('meal.item.unitSpoken', { name: item.name, unit: label })}
                      selected={item.unit === unit}
                      onPress={() => change(index, { unit })}
                    />
                  );
                })}
                <Chip
                  label={t('meal.item.weighed')}
                  accessibilityLabel={t('meal.item.weighedSpoken', { name: item.name })}
                  selected={item.weighed}
                  onPress={() => change(index, { weighed: !item.weighed })}
                />
              </View>
              <Button
                label={t('meal.item.remove')}
                accessibilityLabel={t('meal.item.removeSpoken', { name: item.name })}
                variant="ghost"
                size="sm"
                onPress={() => setItems((before) => before.filter((_, i) => i !== index))}
              />
            </View>
          );
        })}

        <View style={styles.search}>
          <TextField
            label={t('meal.search.label')}
            value={query}
            onChangeText={setQuery}
            onSearch={() => void search()}
            hint={foundNote ?? undefined}
            maxLength={foodParams.searchMaxChars}
          />
          <Button label={t('meal.search.go')} variant="ghost" size="sm" onPress={() => void search()} />
          {results.map((food) => (
            <Pressable
              key={food.id}
              accessibilityRole="button"
              accessibilityLabel={t('meal.search.add', { name: food.name })}
              onPress={() => add(food)}
              style={[styles.result, { borderColor: color.line }]}>
              <Text style={[styles.text, { color: color.text }]}>{food.name}</Text>
              {food.brand !== undefined && <Text style={[styles.small, { color: color.muted }]}>{food.brand}</Text>}
            </Pressable>
          ))}
        </View>

        {shown !== null && <EstimateCard estimate={shown} question={question} />}
        {problem !== null && <Text style={[styles.text, { color: color.text }]}>{problem}</Text>}
        <Button label={t('meal.save')} onPress={() => void save()} disabled={busy || requests === null} />
      </View>
    ) : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <ScreenTitle>{t('meal.title')}</ScreenTitle>
        {consentStep}
        {entry}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.lg },
  part: { gap: tokens.space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  item: { gap: tokens.space.sm },
  search: { gap: tokens.space.sm },
  result: { paddingVertical: tokens.space.sm, borderBottomWidth: tokens.border.hairline },
  heading: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  name: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
