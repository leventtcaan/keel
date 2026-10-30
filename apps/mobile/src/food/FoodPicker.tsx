import { type ReactNode, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { ListGroup, ListRow } from '@/components/ListGroup';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { load } from '@/today/today';

import { ActionPill } from './ActionPill';
import { BarcodeScanner } from './BarcodeScanner';
import { FoodList, type FoodRowData } from './FoodList';
import { foodRow } from './foodRows';
import { OwnFoodForm } from './OwnFoodForm';
import { foodParams } from './params';
import { type RecipeMatch, recipeMatches } from './recipes';
import { SearchField } from './SearchField';
import { SectionHeader } from './SectionHeader';

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
  // A barcode not in the database, or not looked up: the product can be added by hand (never a dead end, K-1063).
  | { state: 'notInDatabase'; gtin: string }
  // A number the server refuses as a barcode (a wrong check digit, 400): the digits, not the connection.
  | { state: 'badNumber' }
  | { state: 'barcodeFailed' };

type Props = {
  /** The list holds as many items as the server takes: nothing more is offered, from a barcode either. */
  full: boolean;
  /** A food picked: added to the meal on its natural portion, open as the portion step. */
  onFood: (food: Schemas['Food']) => void;
  /** A food logged as it stands, in one tap (the plus on a result); absent: results have no plus. */
  onLogNow?: (food: Schemas['Food']) => void;
  /** A quick add asked for (calories and macros typed, no food). Absent: no such button. */
  onQuickAdd?: () => void;
  /** What to show while the search box is empty: favorites, the usual, recent, a past meal (FoodHome). */
  idle?: ReactNode;
  /** Shown directly under the search box, whatever it holds: the meal's tray. */
  belowSearch?: ReactNode;
  /** The user's recipes, read when a search needs them (K-423); absent where a recipe cannot be an item (a recipe's own ingredients, ADR-034 #4). */
  recipes?: () => Promise<Schemas['Recipe'][]>;
  onRecipe?: (recipe: Schemas['Recipe']) => void;
  /** Foods starred, by id, and the way to star one; absent: no heart on a result. */
  favorites?: ReadonlySet<string>;
  onFavorite?: (foodId: string, on: boolean) => void;
  /** Foods logged a moment ago, by id: their plus is a check for a moment. */
  added?: ReadonlySet<string>;
  /** The keyboard comes up with the screen (nothing else to offer yet). */
  autoFocus?: boolean;
};

/**
 * Finding a food (K-407, K-1063; Evre 7 A): by name in the database (ADR-008), or by a barcode read by the camera or typed — and, where
 * it can be one, the user's own recipe by name (K-423). It searches as the user types (ADR-085): a short wait after the
 * last key, the old list gone at once, the keyboard's Search key without the wait. Each answer belongs to the search that
 * asked: a late one (slow network) never replaces a newer list, and none comes back once something was picked. A result is a
 * FoodList row: name, brand and portion, the macros as three marks, its calories as one number (ADR-090 #5), a heart and a plus that
 * logs it as it stands. A barcode that is found goes straight to the portion step; one that is not offers "Add it" (the product from its
 * label, the barcode filled in) and "Search instead" — never a dead end. Quick add and Create food are two icon buttons under the
 * search. Shared by the meal and the recipe entry (the same item flow, K-423).
 */
export function FoodPicker({ full, onFood, onLogNow, onQuickAdd, idle, belowSearch, recipes, onRecipe, favorites, onFavorite, added, autoFocus }: Props) {
  const { api } = useAppServices();
  const { color } = useTheme();
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<Found>({ state: 'idle' });
  const [recipeHits, setRecipeHits] = useState<RecipeMatch[]>([]);
  const [scanning, setScanning] = useState(false);
  // The form for a food of the user's own, open from "Create food" or "Add it" (with the barcode that was not found).
  const [creating, setCreating] = useState<{ gtin?: string; name?: string } | null>(null);
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
  const logFood = (food: Schemas['Food']) => {
    clear();
    onLogNow?.(food);
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
      answer = data ?? (response.status === 404 ? { state: 'notInDatabase', gtin } : { state: response.status === 400 ? 'badNumber' : 'barcodeFailed' });
    } catch {
      answer = { state: 'barcodeFailed' };
    }
    if (mine !== searchSeq.current) return;
    // Found: straight to the portion step, the product on its label serving.
    if ('id' in answer) pickFood(answer);
    else setFound(answer);
  };

  const results = found.state === 'found' && !full ? found.foods : [];
  const note = full
    ? t('meal.full', { max: foodParams.itemsMax })
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
                  : null;
  const noMatch = found.state === 'found' && found.foods.length === 0 && recipeHits.length === 0 && !full;

  // Built outside the JSX children (the raw-text guard reads them).
  const rows: FoodRowData[] = results.map((food) => {
    const row = foodRow(food);
    return {
      key: food.id,
      testID: `result-${food.id}`,
      name: food.name,
      sub: row.sub,
      kcal: row.kcal,
      macros: row.macros,
      ...(food.avoided === true ? { marker: t('meal.search.avoided') } : {}),
      ...(food.own === true ? { badge: t('meal.row.own') } : {}),
      onOpen: () => pickFood(food),
      ...(onLogNow === undefined ? {} : { onLog: () => logFood(food) }),
      openLabel: t('meal.search.add', { name: food.name }),
      logLabel: t('meal.search.logNow', { name: food.name }),
      ...(favorites === undefined || onFavorite === undefined
        ? {}
        : { favorite: { on: favorites.has(food.id), onToggle: () => onFavorite(food.id, !favorites.has(food.id)) } }),
      ...(added?.has(food.id) === true ? { added: true } : {}),
    };
  });
  const resultList = <FoodList testID="results" rows={rows} />;
  // A barcode that was not found: the two ways on, in place of a dead end (K-1063).
  const missed =
    found.state === 'notInDatabase' && !full ? (
      <Card testID="barcode-miss">
        <Text style={[styles.text, { color: color.text }]}>{t('meal.barcode.missTitle')}</Text>
        <View style={styles.buttons}>
          <Button label={t('meal.barcode.addIt')} onPress={() => setCreating({ gtin: found.gtin })} />
          <Button label={t('meal.barcode.searchInstead')} variant="secondary" onPress={clear} />
        </View>
      </Card>
    ) : null;
  const quickPill = onQuickAdd === undefined ? null : <ActionPill label={t('meal.quickAdd.open')} icon="bolt.fill" onPress={onQuickAdd} />;
  const tools =
    full || found.state !== 'idle' ? null : (
      <View style={styles.buttons} testID="food-tools">
        {quickPill}
        <ActionPill label={t('meal.own.short')} accessibilityLabel={t('meal.own.open')} icon="plus.square.fill" onPress={() => setCreating({})} />
      </View>
    );
  const empty = noMatch ? (
    <View style={styles.empty} testID="no-match">
      <Icon name="magnifyingglass" tone="muted" />
      <Text style={[styles.text, { color: color.textSecondary }]}>{t('meal.search.none')}</Text>
      <Button
        label={t('meal.search.createNamed', { name: query.trim() })}
        accessibilityLabel={t('meal.search.createNamedSpoken', { name: query.trim() })}
        variant="secondary"
        onPress={() => setCreating({ name: query.trim() })}
      />
    </View>
  ) : null;
  const recipeList = recipeHits.length > 0 && !full ? <RecipeHits hits={recipeHits} onAdd={pickRecipe} /> : null;
  const idleView = found.state === 'idle' && !full ? idle : null;
  const scanner = scanning ? <BarcodeScanner onCode={(gtin) => void lookUpBarcode(gtin)} onClose={() => setScanning(false)} /> : null;
  if (creating !== null) {
    return (
      <OwnFoodForm
        {...(creating.gtin === undefined ? {} : { gtin: creating.gtin })}
        initialName={creating.gtin === undefined ? (creating.name ?? query.trim()) : ''}
        onCancel={() => setCreating(null)}
        onCreated={(food) => {
          setCreating(null);
          pickFood(food);
        }}
      />
    );
  }
  return (
    <View style={styles.search}>
      {/* A full list takes no more, from a barcode either. The barcode is an icon at the end of the box; VoiceOver says "Scan a barcode". */}
      <SearchField
        label={t('meal.search.label')}
        placeholder={t('meal.search.placeholder')}
        value={query}
        onChangeText={type}
        onSearch={searchNow}
        hint={missed === null ? (note ?? undefined) : undefined}
        maxLength={foodParams.searchMaxChars}
        {...(autoFocus === true ? { autoFocus: true } : {})}
        {...(full ? {} : { onScan: () => setScanning(true) })}
      />
      {belowSearch}
      {tools}
      {missed}
      {recipeList}
      {resultList}
      {empty}
      {idleView}
      {scanner}
    </View>
  );
}

/** The user's recipes a search found (K-423): addable ones as rows, one the database can no longer estimate marked. */
function RecipeHits({ hits, onAdd }: { hits: RecipeMatch[]; onAdd: (recipe: Schemas['Recipe']) => void }) {
  return (
    <View style={styles.group}>
      <SectionHeader title={t('meal.recipes.heading')} />
      <ListGroup>
        {hits.map(({ recipe, available }) =>
          available ? (
            <ListRow
              key={recipe.id}
              label={recipe.name}
              detail={t(`meal.recipes.makes.${recipe.portions === 1 ? 'one' : 'other'}`, { portions: recipe.portions })}
              trailing="plus.circle.fill"
              accessibilityLabel={t('meal.recipes.add', { name: recipe.name })}
              onPress={() => onAdd(recipe)}
            />
          ) : (
            <ListRow key={recipe.id} label={t('meal.recipes.unavailable', { name: recipe.name })} />
          ),
        )}
      </ListGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  search: { gap: tokens.space.md },
  group: { gap: tokens.space.xs },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  empty: { alignItems: 'center', gap: tokens.space.sm, paddingVertical: tokens.space.lg },
  text: { fontSize: tokens.type.body },
});
