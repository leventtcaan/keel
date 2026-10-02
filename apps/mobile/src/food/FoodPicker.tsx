import { useRef, useState } from 'react';
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
  | { state: 'failed' }
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

/**
 * Finding a food (K-407): by name in the database (ADR-008), or by a barcode read by the camera or typed — and, where
 * it can be one, the user's own recipe by name (K-423). Each answer belongs to the search that asked: a late one (slow
 * network) never replaces a newer list, and none comes back once something was picked. Shared by the meal and the
 * recipe entry (the same item flow, K-423).
 */
export function FoodPicker({ full, onFood, recipes, onRecipe }: Props) {
  const { api } = useAppServices();
  const { color } = useTheme();
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<Found>({ state: 'idle' });
  const [recipeHits, setRecipeHits] = useState<RecipeMatch[]>([]);
  const [scanning, setScanning] = useState(false);
  const searchSeq = useRef(0);

  const clear = () => {
    searchSeq.current++;
    setRecipeHits([]);
    setFound({ state: 'idle' });
    setQuery('');
  };

  const search = async () => {
    const q = query.trim();
    if (q.length < foodParams.searchMinChars) {
      searchSeq.current++;
      setRecipeHits([]);
      setFound({ state: 'tooShort' });
      return;
    }
    const mine = ++searchSeq.current;
    const [own, answer] = await Promise.all([
      recipes === undefined ? Promise.resolve([]) : recipes(),
      load(() => api.POST('/v1/foods/search', { body: { q, limit: foodParams.searchResults } })),
    ]);
    if (mine !== searchSeq.current) return;
    setRecipeHits(recipeMatches(own, q));
    setFound(answer.state === 'ready' ? { state: 'found', foods: answer.value } : { state: 'failed' });
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
    : found.state === 'tooShort'
      ? t('meal.search.tooShort', { min: foodParams.searchMinChars })
      : found.state === 'failed'
        ? t('meal.search.failed')
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
  const scanButton = full ? null : <Button label={t('meal.barcode.scan')} variant="ghost" size="sm" onPress={() => setScanning(true)} />;

  return (
    <View style={styles.search}>
      <TextField
        label={t('meal.search.label')}
        value={query}
        onChangeText={setQuery}
        onSearch={() => void search()}
        hint={note ?? undefined}
        maxLength={foodParams.searchMaxChars}
      />
      <View style={styles.chips}>
        <Button label={t('meal.search.go')} variant="ghost" size="sm" onPress={() => void search()} />
        {scanButton}
      </View>
      {recipeHits.length > 0 && !full && <RecipeHits hits={recipeHits} onAdd={pickRecipe} />}
      {results.map((food) => (
        <Pressable
          key={food.id}
          accessibilityRole="button"
          accessibilityLabel={t('meal.search.add', { name: food.name })}
          onPress={() => pickFood(food)}
          style={[styles.result, { borderColor: color.line }]}>
          <Text style={[styles.text, { color: color.text }]}>{food.name}</Text>
          {food.brand !== undefined && <Text style={[styles.small, { color: color.muted }]}>{food.brand}</Text>}
        </Pressable>
      ))}
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
});
