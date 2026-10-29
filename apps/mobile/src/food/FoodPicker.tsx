import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { load } from '@/today/today';

import { BarcodeScanner } from './BarcodeScanner';
import { foodParams } from './params';
import { type RecipeMatch, recipeMatches } from './recipes';

type Schemas = components['schemas'];
type Found =
  | { state: 'idle' }
  | { state: 'tooShort' }
  // Asked, not answered yet: the old list is gone (ADR-085 #2).
  | { state: 'searching' }
  // No answer at all (the request threw) vs an answer that was an error (ADR-085 #3): the connection is blamed only for the first.
  | { state: 'failed' }
  | { state: 'serverError' }
  | { state: 'found'; foods: Schemas['Food'][] }
  // A barcode not in the database (FDC is mostly US products, ADR-008), or not looked up.
  | { state: 'notInDatabase' }
  // A number the server refuses as a barcode (a wrong check digit, 400): the digits, not the connection.
  | { state: 'badNumber' }
  | { state: 'barcodeFailed' };

type Props = {
  /** The list holds as many items as the server takes: nothing more is offered, from a barcode either. */
  full: boolean;
  onFood: (food: Schemas['Food']) => void;
  /** The user's recipes, read when a search needs them (K-423); absent where a recipe cannot be an item (a recipe's own ingredients, ADR-034 #4). */
  recipes?: () => Promise<Schemas['Recipe'][]>;
  onRecipe?: (recipe: Schemas['Recipe']) => void;
};

/** A food's energy per 100 g as a range (U5), in the words the rest of the app uses for one. */
const kcalPer100g = (food: Schemas['Food']) => {
  const unit = t('food.budget.kcalUnit');
  const { low, high } = food.per100g.kcal;
  return {
    written: t('meal.search.per100g', { kcal: `${t('format.range', { low, high })} ${unit}` }),
    spoken: t('meal.search.per100gSpoken', { kcal: `${t('format.rangeSpoken', { low, high })} ${unit}` }),
  };
};

/**
 * Finding a food (K-407): by name in the database (ADR-008), or by a barcode read by the camera or typed — and, where
 * it can be one, the user's own recipe by name (K-423). It searches as the user types (ADR-085): a short wait after the
 * last key, the old list gone at once, the keyboard's Search key without the wait. Each answer belongs to the search that
 * asked: a late one (slow network) never replaces a newer list, and none comes back once something was picked. Shared by
 * the meal and the recipe entry (the same item flow, K-423).
 */
export function FoodPicker({ full, onFood, recipes, onRecipe }: Props) {
  const { api } = useAppServices();
  const { color } = useTheme();
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<Found>({ state: 'idle' });
  const [recipeHits, setRecipeHits] = useState<RecipeMatch[]>([]);
  const [scanning, setScanning] = useState(false);
  const searchSeq = useRef(0);
  const waiting = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopWaiting = () => {
    if (waiting.current !== null) clearTimeout(waiting.current);
    waiting.current = null;
  };
  // Nothing is searched once the picker is gone.
  useEffect(
    () => () => {
      stopWaiting();
      searchSeq.current++;
    },
    [],
  );

  const clear = () => {
    stopWaiting();
    searchSeq.current++;
    setRecipeHits([]);
    setFound({ state: 'idle' });
    setQuery('');
  };

  /** Asks the server for `q` (trimmed, long enough); its answer counts only while no newer search or key has come. */
  const ask = async (q: string) => {
    waiting.current = null;
    const mine = ++searchSeq.current;
    const [own, answer] = await Promise.all([
      recipes === undefined ? Promise.resolve([]) : recipes(),
      load(() => api.POST('/v1/foods/search', { body: { q, limit: foodParams.searchResults } })),
    ]);
    if (mine !== searchSeq.current) return;
    setRecipeHits(recipeMatches(own, q));
    setFound(
      answer.state === 'ready'
        ? { state: 'found', foods: answer.value }
        : answer.state === 'failed' && answer.problem === 'NoConnection'
          ? { state: 'failed' }
          : { state: 'serverError' },
    );
  };

  /** What was shown belongs to the old words: gone at once. Too few letters is a hint; enough is a wait, then a search. */
  const type = (text: string) => {
    setQuery(text);
    stopWaiting();
    searchSeq.current++;
    setRecipeHits([]);
    const q = text.trim();
    if (q === '') setFound({ state: 'idle' });
    else if (q.length < foodParams.searchMinChars) setFound({ state: 'tooShort' });
    else {
      setFound({ state: 'searching' });
      waiting.current = setTimeout(() => void ask(q), foodParams.searchDelayMs);
    }
  };

  /** The keyboard's Search key: the words as they are, without the wait. */
  const searchNow = () => {
    const q = query.trim();
    if (q.length < foodParams.searchMinChars) return type(query);
    stopWaiting();
    setRecipeHits([]);
    setFound({ state: 'searching' });
    void ask(q);
  };

  const pickFood = (food: Schemas['Food']) => {
    clear();
    onFood(food);
  };
  const pickRecipe = (recipe: Schemas['Recipe']) => {
    clear();
    onRecipe?.(recipe);
  };

  /** A code from the reader, looked up as scanned (a UPC-E is expanded by the server, K-208). */
  const lookUpBarcode = async (gtin: string) => {
    setScanning(false);
    stopWaiting();
    const mine = ++searchSeq.current;
    let answer: Found | Schemas['Food'];
    try {
      const { data, response } = await api.POST('/v1/foods/barcode-lookup', { body: { gtin } });
      answer = data ?? { state: response.status === 404 ? 'notInDatabase' : response.status === 400 ? 'badNumber' : 'barcodeFailed' };
    } catch {
      answer = { state: 'barcodeFailed' };
    }
    if (mine !== searchSeq.current) return;
    if ('id' in answer) pickFood(answer);
    else setFound(answer);
  };

  const results = found.state === 'found' && !full ? found.foods : [];
  const note = full
    ? t('meal.full', { max: foodParams.itemsMax })
    : found.state === 'idle'
      ? t('meal.search.empty')
      : found.state === 'tooShort'
        ? t('meal.search.tooShort', { min: foodParams.searchMinChars })
        : found.state === 'searching'
          ? t('meal.search.searching')
          : found.state === 'failed'
            ? t('meal.search.failed')
            : found.state === 'serverError'
              ? t('meal.search.serverError')
              : found.state === 'notInDatabase'
                ? t('meal.barcode.notFound')
                : found.state === 'badNumber'
                  ? t('meal.barcode.badNumber')
                  : found.state === 'barcodeFailed'
                    ? t('meal.barcode.failed')
                    : found.state === 'found' && found.foods.length === 0 && recipeHits.length === 0
                      ? t('meal.search.none')
                      : null;
  // A full list takes no more, from a barcode either.
  // "Scan" on the screen (the meal's words are few, K-980); VoiceOver says all of it.
  const scanButton = full ? null : (
    <Button label={t('meal.barcode.scanShort')} accessibilityLabel={t('meal.barcode.scan')} variant="ghost" size="sm" onPress={() => setScanning(true)} />
  );

  return (
    <View style={styles.search}>
      <TextField
        label={t('meal.search.label')}
        value={query}
        onChangeText={type}
        onSearch={searchNow}
        hint={note ?? undefined}
        maxLength={foodParams.searchMaxChars}
      />
      {scanButton !== null && <View style={styles.chips}>{scanButton}</View>}
      {recipeHits.length > 0 && !full && <RecipeHits hits={recipeHits} onAdd={pickRecipe} />}
      {results.map((food) => {
        const kcal = kcalPer100g(food);
        return (
          <Pressable
            key={food.id}
            accessibilityRole="button"
            accessibilityLabel={t('meal.search.add', { name: food.name })}
            // The range in words, read after the name: the label stays "Add {name}", the button's name.
            accessibilityHint={kcal.spoken}
            onPress={() => pickFood(food)}
            style={[styles.result, { borderColor: color.line }]}>
            <Text style={[styles.text, { color: color.text }]}>{food.name}</Text>
            {food.brand !== undefined && <Text style={[styles.small, { color: color.muted }]}>{food.brand}</Text>}
            <Text style={[styles.small, styles.kcal, { color: color.muted }]}>{kcal.written}</Text>
          </Pressable>
        );
      })}
      {scanning && <BarcodeScanner onCode={(gtin) => void lookUpBarcode(gtin)} onClose={() => setScanning(false)} />}
    </View>
  );
}

/** The user's recipes a search found (K-423): addable ones as buttons, one the database can no longer estimate marked. */
function RecipeHits({ hits, onAdd }: { hits: RecipeMatch[]; onAdd: (recipe: Schemas['Recipe']) => void }) {
  const { color } = useTheme();
  return (
    <View style={styles.search}>
      <Text style={[styles.small, { color: color.muted }]}>{t('meal.recipes.heading')}</Text>
      {hits.map(({ recipe, available }) =>
        available ? (
          <Pressable
            key={recipe.id}
            accessibilityRole="button"
            accessibilityLabel={t('meal.recipes.add', { name: recipe.name })}
            onPress={() => onAdd(recipe)}
            style={[styles.result, { borderColor: color.line }]}>
            <Text style={[styles.text, { color: color.text }]}>{recipe.name}</Text>
            <Text style={[styles.small, { color: color.muted }]}>
              {t(`meal.recipes.makes.${recipe.portions === 1 ? 'one' : 'other'}`, { portions: recipe.portions })}
            </Text>
          </Pressable>
        ) : (
          <Text key={recipe.id} style={[styles.small, styles.result, { color: color.text, borderColor: color.line }]}>
            {t('meal.recipes.unavailable', { name: recipe.name })}
          </Text>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  search: { gap: tokens.space.sm },
  result: { paddingVertical: tokens.space.sm, borderBottomWidth: tokens.border.hairline },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
  kcal: { fontVariant: ['tabular-nums'] },
});
