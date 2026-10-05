import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProblemText } from '@/components/ProblemText';
import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { ScreenTitle } from '@/components/ScreenTitle';
import { TextField } from '@/components/TextField';
import { grantConsent } from '@/consent/consents';
import { t } from '@/copy';
import { type DraftItem, type KnownFoods, addFood, requestsOf } from '@/food/draft';
import { EstimateCard } from '@/food/EstimateCard';
import { FoodPicker } from '@/food/FoodPicker';
import { ItemRows } from '@/food/ItemRows';
import { foodParams } from '@/food/params';
import { recipeOf } from '@/food/recipes';
import { useAppServices } from '@/services/ServicesProvider';
import { newClientId } from '@/sync/send';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { load } from '@/today/today';

type Schemas = components['schemas'];
type Step = 'checking' | 'consent' | 'entry';

const MISSING_KEYS = { name: 'recipe.missing.name', portions: 'recipe.missing.portions', items: 'recipe.missing.items' } as const;

/**
 * Entering a recipe (K-423, ADR-034): a name, how many portions it makes, and the ingredients through the meal's own item
 * flow (search or barcode, amounts left empty, I2 A4) — database foods only, no recipe inside a recipe. The server's
 * estimate of the whole recipe is shown as ranges (U1, U5). Health data: the consent first (ADR-030 #25).
 *
 * Saved on the server, not queued: only the ingredients are kept and the server estimates them on every read, so a
 * recipe is only useful once it is there. One clientId for the screen's life (ADR-024): a save retried after a lost
 * answer finds the first one rather than making two.
 */
export default function RecipeScreen() {
  const { api, consents, report } = useAppServices();
  const { color } = useTheme();
  const [step, setStep] = useState<Step>('checking');
  const [name, setName] = useState('');
  const [portions, setPortions] = useState('');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [known, setKnown] = useState<KnownFoods>(() => new Map());
  const [estimate, setEstimate] = useState<{ key: string; value: Schemas['FoodEstimate'] | null } | null>(null);
  const [tried, setTried] = useState(false); // the missing parts are said once a save was asked for, not while typing
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [clientId] = useState(newClientId); // one for the screen's life (ADR-024)

  useEffect(() => {
    // Not known (a failing keychain) is not given: the consent step, never an endless wait.
    void consents
      .granted('HEALTH_DATA')
      .catch(() => false)
      .then((granted) => setStep(granted ? 'entry' : 'consent'));
  }, [consents]);

  const requests = requestsOf(items, known);
  const key = requests === null ? null : JSON.stringify(requests);
  // The estimate follows the ingredients; an answer for ingredients since changed is dropped (the key is checked).
  useEffect(() => {
    if (key === null) return;
    let live = true;
    void load(() => api.POST('/v1/food-estimates', { body: { items: JSON.parse(key) as Schemas['ItemRequest'][] } })).then((answer) => {
      if (live) setEstimate({ key, value: answer.state === 'ready' ? answer.value : null });
    });
    return () => {
      live = false;
    };
  }, [api, key]);
  const shown = estimate !== null && estimate.key === key ? estimate.value : null;
  const { recipe, missing } = recipeOf({ name, portions, items }, known, clientId);

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

  const save = async () => {
    setTried(true);
    if (saving.current || recipe === null) return;
    saving.current = true;
    setBusy(true);
    setProblem(null);
    try {
      const { data, error, response } = await api.POST('/v1/recipes', { body: recipe });
      if (data !== undefined) {
        // 200: this clientId was saved before (an answer lost) and the server answers what it kept, not this body
        // (ADR-024). Changed since, the change is not in it: say so rather than go back as if it were (K-423 review).
        if (response.status === 200 && !sameRecipe(data, recipe)) return setProblem(t('recipe.savedEarlier'));
        return router.back();
      }
      report({ name: error?.code ?? `HTTP ${response.status}` });
      if (response.status === 403 && error?.code === 'CONSENT_REQUIRED') setStep('consent');
      // The server's fault is not the user's; a refusal can be an amount or the recipe limit (one code for both).
      else setProblem(t(response.status >= 500 ? 'settings.serverError' : 'recipe.refused'));
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setProblem(t('recipe.needsConnection'));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  const change = (index: number, part: Partial<DraftItem>) => {
    setItems((before) => before.map((item, i) => (i === index ? { ...item, ...part } : item)));
    setProblem(null);
  };
  const add = (food: Schemas['Food']) => {
    setItems((before) => addFood(before, food));
    setKnown((before) => new Map(before).set(food.id, food));
  };

  const consentStep =
    step === 'consent' ? (
      <View style={styles.part}>
        <Text style={[styles.heading, { color: color.text }]}>{t('consent.health_data.title')}</Text>
        <Text style={[styles.text, { color: color.textSecondary }]}>{t('consent.health_data.body')}</Text>
        {problem !== null && <ProblemText style={[styles.text, { color: color.text }]}>{problem}</ProblemText>}
        <Button label={t('meal.consent.allow')} onPress={() => void allow()} disabled={busy} />
        <Button label={t('meal.consent.notNow')} variant="ghost" onPress={() => router.back()} disabled={busy} />
      </View>
    ) : null;

  const missingNotes = tried
    ? missing.map((part) => (
        <Text key={part} style={[styles.text, { color: color.text }]}>
          {t(MISSING_KEYS[part], { max: foodParams.recipePortionsMax })}
        </Text>
      ))
    : null;

  const entry =
    step === 'entry' ? (
      <View style={styles.part}>
        <TextField label={t('recipe.name')} value={name} onChangeText={setName} maxLength={foodParams.recipeNameMaxChars} />
        <TextField label={t('recipe.portions')} value={portions} onChangeText={setPortions} keyboardType="number-pad" maxLength={2} />
        <Text style={[styles.heading, { color: color.text }]}>{t('recipe.ingredients')}</Text>
        <ItemRows items={items} known={known} onChange={change} onRemove={(index) => setItems((before) => before.filter((_, i) => i !== index))} />
        <FoodPicker full={items.length >= foodParams.itemsMax} onFood={add} />
        {shown !== null && <EstimateTitle />}
        {shown !== null && <EstimateCard estimate={shown} question={null} />}
        {missingNotes}
        {problem !== null && <ProblemText style={[styles.text, { color: color.text }]}>{problem}</ProblemText>}
        <Button label={t('recipe.save')} onPress={() => void save()} disabled={busy} />
      </View>
    ) : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <ScreenTitle>{t('recipe.title')}</ScreenTitle>
        {consentStep}
        {entry}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Whether the recipe the server kept is the one just sent: name, portions, and each ingredient's amount. */
function sameRecipe(kept: Schemas['Recipe'], sent: Schemas['NewRecipe']): boolean {
  const ingredients = (items: { foodId: string; amount: { quantity: number; unit: string } }[]) =>
    items
      .map((item) => `${item.foodId} ${item.amount.quantity} ${item.amount.unit}`)
      .sort()
      .join('|');
  return kept.name === sent.name && kept.portions === sent.portions && ingredients(kept.items) === ingredients(sent.items);
}

function EstimateTitle() {
  const { color } = useTheme();
  return <Text style={[styles.small, { color: color.muted }]}>{t('recipe.estimate')}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.lg },
  part: { gap: tokens.space.md },
  heading: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
