import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { ListGroup, ListRow } from '@/components/ListGroup';
import { Stepper } from '@/components/Stepper';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { parseNumber } from '@/units/units';

import { amountPhrase, unitAfterNumber, unitLabel } from './amountText';
import { type DraftItem, type KnownFoods, type KnownRecipes, PORTION, itemProblem } from './draft';
import { parseQuantity } from './meals';
import { foodParams } from './params';
import { isCounted, isWeight, portionOf, quantityInPortion, stepOf } from './portions';
import { type Macros, kcalText, macroText, macrosOf, macrosOfPortion, rangeText } from './single';

type Schemas = components['schemas'];

export const PROBLEM_KEYS = { invalid: 'meal.item.invalid', tooMuch: 'meal.item.tooMuch', recipeGone: 'meal.item.recipeGone' } as const;
/** The Stepper never steps below nothing; an amount of 0 is named by the item's own problem (it must be above 0). */
const FLOOR = 0;

type Props = {
  items: DraftItem[];
  known: KnownFoods;
  /** The user's recipes once read (K-423); undefined until then. */
  recipes?: KnownRecipes;
  /** The server's estimate of these very items, in order, when it has answered: the ranges of the detail, and the numbers of an item read back from a logged meal. */
  estimated?: Schemas['EstimatedItem'][];
  /** The items as they were logged (a correction): an item still at its logged amount shows the very numbers the day shows for it. */
  logged?: Schemas['EstimatedItem'][];
  /** Foods starred, by id; absent: no star is drawn. */
  favorites?: ReadonlySet<string>;
  onFavorite?: (item: DraftItem, on: boolean) => void;
  onChange: (index: number, part: Partial<DraftItem>) => void;
  onRemove: (index: number) => void;
  /** The item opened first (a logged meal opened on one item); else the last one added. */
  openFirst?: number;
};

/** The single numbers of an item: its portion's, times the quantity; else the middle of the server's estimate for it. */
export function numbersOf(item: DraftItem, estimate: Schemas['EstimatedItem'] | undefined, logged: Schemas['EstimatedItem'][] | undefined): Macros | null {
  const quantity = parseQuantity(item.quantity);
  // Where it was logged and nothing changed, the day's own number: the portion's single number is the food's, the logged one has the amount's error.
  const was = logged?.find((one) => one.foodId === item.foodId && one.amount.unit === item.unit && one.amount.quantity === quantity);
  if (was !== undefined) return macrosOf(was);
  const portion = portionOf(item);
  if (portion !== undefined && quantity !== null) return macrosOfPortion(portion, quantity);
  return estimate === undefined ? null : macrosOf(estimate);
}

/**
 * The items of the meal being put together (K-407, K-1046, K-1063; ADR-090 #1, #5): the one just added is open as the portion step —
 * its natural portion already chosen ("1 large" egg), the other portions as chips, the quantity on a stepper with half, 1, 2, 3 beside
 * it, g and oz when it is weighed — and its numbers as single numbers that follow the choice. The others fold to a line (name,
 * amount, kcal) that opens on a tap, so a meal of five foods is five lines, not five forms. "Details" opens the ranges (U5). A quick
 * add is its calories and macros as fields. Shared by the meal and the recipe entry (K-423).
 */
export function ItemRows({ items, known, recipes, estimated, logged, favorites, onFavorite, onChange, onRemove, openFirst }: Props) {
  const { color } = useTheme();
  const [open, setOpen] = useState<number | null>(() => openFirst ?? (items.length === 0 ? null : items.length - 1));
  const [detail, setDetail] = useState<number | null>(null);
  const count = useRef(items.length);
  // A food added opens; one removed leaves the open one where it was or at the end.
  useEffect(() => {
    if (items.length > count.current) setOpen(items.length - 1);
    else if (items.length < count.current) setOpen((now) => (now === null ? null : Math.min(now, items.length - 1)));
    count.current = items.length;
  }, [items.length]);

  return (
    <>
      {items.map((item, index) => {
        const estimate = estimated?.[index];
        const numbers = numbersOf(item, estimate, logged);
        const isOpen = open === index || items.length === 1;
        const spokenName = item.name;
        if (!isOpen) {
          return (
            <Pressable
              key={`${item.foodId}-${index}`}
              testID={`item-${index}`}
              accessibilityRole="button"
              accessibilityLabel={t('meal.item.open', { name: spokenName })}
              onPress={() => setOpen(index)}
              style={[styles.folded, { backgroundColor: color.surface }]}>
              <View style={styles.name}>
                <Text style={[styles.title, { color: color.text }]}>
                  {item.name}
                </Text>
                <Text style={[styles.small, { color: color.muted }]}>{foldedAmount(item)}</Text>
              </View>
              {numbers !== null && <Text style={[styles.kcal, { color: color.text }]}>{kcalText(numbers.kcal)}</Text>}
            </Pressable>
          );
        }
        return (
          <OpenItem
            key={`${item.foodId}-${index}`}
            index={index}
            item={item}
            known={known}
            recipes={recipes}
            estimate={estimate}
            numbers={numbers}
            favorite={favorites?.has(item.foodId) === true}
            canFavorite={favorites !== undefined && onFavorite !== undefined && item.quick === undefined && item.unit !== PORTION}
            detailOpen={detail === index}
            onDetail={() => setDetail((now) => (now === index ? null : index))}
            onFavorite={(on) => onFavorite?.(item, on)}
            onChange={onChange}
            onRemove={onRemove}
          />
        );
      })}
    </>
  );
}

/** "2 × 1 large", "150 g": the amount of a folded line. */
export function foldedAmount(item: DraftItem): string {
  if (item.quick !== undefined) return t('meal.quickAdd.folded');
  const quantity = parseQuantity(item.quantity);
  // Typed halfway ("1."): the words as typed rather than a guess.
  return quantity === null ? `${item.quantity} ${unitAfterNumber(item.unit)}`.trim() : amountPhrase({ quantity, unit: item.unit });
}

function OpenItem({
  index,
  item,
  known,
  recipes,
  estimate,
  numbers,
  favorite,
  canFavorite,
  detailOpen,
  onDetail,
  onFavorite,
  onChange,
  onRemove,
}: {
  index: number;
  item: DraftItem;
  known: KnownFoods;
  recipes?: KnownRecipes;
  estimate: Schemas['EstimatedItem'] | undefined;
  numbers: Macros | null;
  favorite: boolean;
  canFavorite: boolean;
  detailOpen: boolean;
  onDetail: () => void;
  onFavorite: (on: boolean) => void;
  onChange: Props['onChange'];
  onRemove: Props['onRemove'];
}) {
  const { color } = useTheme();
  const itemIssue = itemProblem(item, known, recipes);
  const portions = item.unit === PORTION;
  const ceiling = recipes?.get(item.foodId)?.portions ?? 0;
  const issueText =
    itemIssue === null || itemIssue === 'missing'
      ? null
      : itemIssue === 'tooMuch' && portions
        ? t(`meal.item.tooManyPortions.${ceiling === 1 ? 'one' : 'other'}`, { portions: ceiling })
        : t(PROBLEM_KEYS[itemIssue]);
  const portion = portionOf(item);
  const quantity = parseNumber(item.quantity);
  const counted = isCounted(portion, item.unit) && !portions;
  const amountLabel = t('meal.item.amount', { name: item.name });
  const food = known.get(item.foodId);
  const brand = food?.brand;
  const star = canFavorite ? (
    <Pressable
      testID={`favorite-${index}`}
      accessibilityRole="button"
      accessibilityLabel={t(favorite ? 'meal.favorite.remove' : 'meal.favorite.add', { name: item.name })}
      accessibilityState={{ selected: favorite }}
      onPress={() => onFavorite(!favorite)}
      hitSlop={tokens.space.sm}>
      <Icon name={favorite ? 'star.fill' : 'star'} tone={favorite ? 'accent' : 'muted'} />
    </Pressable>
  ) : null;
  const chips =
    item.quick !== undefined ? null : (
      <View style={styles.chips} testID={`units-${index}`}>
        {item.units.map((unit) => (
          <Chip
            key={unit}
            label={item.portions?.find((p) => p.unit === unit)?.label ?? unitLabel(unit)}
            accessibilityLabel={t('meal.item.unitSpoken', { name: item.name, unit: unitLabel(unit) })}
            selected={unit === item.unit}
            onPress={() => unit !== item.unit && onChange(index, { unit, quantity: quantityInPortion(item, unit) })}
          />
        ))}
      </View>
    );
  const quickChips = counted && item.quick === undefined ? (
    <View style={styles.chips}>
      {foodParams.quickQuantities.map((value) => (
        <Chip
          key={value}
          label={quantityLabel(value)}
          accessibilityLabel={t('meal.item.quantitySpoken', { quantity: value })}
          selected={quantity === value}
          onPress={() => onChange(index, { quantity: String(value) })}
        />
      ))}
    </View>
  ) : null;
  const stepper =
    item.quick !== undefined ? null : (
      <Stepper
        // Another unit is another number: a field still being typed in (the keyboard stays up over a chip's press) starts over.
        key={item.unit}
        label={amountLabel}
        value={quantity}
        onChange={(next) => onChange(index, { quantity: String(next) })}
        onEmpty={() => onChange(index, { quantity: '' })}
        step={stepOf(item.unit, portion)}
        min={FLOOR}
        decimals={foodParams.amountDecimals}
        unit={unitAfterNumber(item.unit)}
      />
    );
  const quickFields =
    item.quick === undefined ? null : (
      <View style={styles.part}>
        <TextField
          label={t('meal.quickAdd.kcal')}
          value={item.quick.kcal}
          onChangeText={(kcal) => onChange(index, { quick: { ...(item.quick as NonNullable<DraftItem['quick']>), kcal } })}
          keyboardType="number-pad"
          maxLength={String(foodParams.quickAddKcalMax).length}
        />
        <View style={styles.macros}>
          {(['protein', 'carbs', 'fat'] as const).map((macro) => (
            <View key={macro} style={styles.macro}>
              <TextField
                label={t(`meal.quickAdd.${macro}`)}
                value={(item.quick as NonNullable<DraftItem['quick']>)[macro]}
                onChangeText={(text) => onChange(index, { quick: { ...(item.quick as NonNullable<DraftItem['quick']>), [macro]: text } })}
                keyboardType="number-pad"
                maxLength={String(foodParams.quickAddMacroMax).length}
              />
            </View>
          ))}
        </View>
      </View>
    );
  const detailText =
    estimate === undefined
      ? t('meal.item.detailWaiting')
      : t('meal.item.detailRange', {
          kcal: rangeText(estimate.kcal, t('food.budget.kcalUnit')),
          protein: rangeText(estimate.proteinG, t('food.budget.proteinUnit')),
        });
  const numbersBlock =
    numbers === null || item.quick !== undefined ? null : (
      <View style={styles.numbers}>
        <Text testID={`numbers-${index}`} style={[styles.big, { color: color.text }]}>
          {kcalText(numbers.kcal)}
        </Text>
        <Text style={[styles.macroLine, { color: color.textSecondary }]}>{macroText(numbers)}</Text>
      </View>
    );
  const detailsRow =
    item.quick !== undefined || portions ? null : (
      <Pressable testID={`details-${index}`} accessibilityRole="button" accessibilityState={{ expanded: detailOpen }} onPress={onDetail} style={styles.detailsRow}>
        <Text style={[styles.small, { color: color.accent }]}>{t(detailOpen ? 'meal.item.detailHide' : 'meal.item.detail')}</Text>
      </Pressable>
    );
  const detailBlock = detailOpen ? <Text style={[styles.small, { color: color.textSecondary }]}>{detailText}</Text> : null;
  const brandLine = brand === undefined ? null : <Text style={[styles.small, { color: color.muted }]}>{brand}</Text>;
  const problemLine = issueText === null ? null : <Text style={[styles.small, { color: color.text }]}>{issueText}</Text>;
  // Weighing means something only on a scale (g, oz); a recipe's portion is never weighed (ADR-034).
  const weighedRow =
    portions || item.quick !== undefined || !isWeight(item.unit) ? null : (
      <ListGroup>
        <ListRow
          label={t('meal.item.weighed')}
          accessibilityLabel={t('meal.item.weighedSpoken', { name: item.name })}
          switch={{ value: item.weighed, onValueChange: (weighed) => onChange(index, { weighed }) }}
        />
      </ListGroup>
    );
  return (
    <View testID={`item-${index}`} style={[styles.open, { backgroundColor: color.surface }]}>
      <View style={styles.head}>
        <View style={styles.name}>
          <Text style={[styles.title, { color: color.text }]}>{item.name}</Text>
          {brandLine}
        </View>
        {star}
        <Button label={t('meal.item.remove')} accessibilityLabel={t('meal.item.removeSpoken', { name: item.name })} variant="destructive" onPress={() => onRemove(index)} />
      </View>
      {numbersBlock}
      {chips}
      {stepper}
      {quickChips}
      {quickFields}
      {problemLine}
      {detailsRow}
      {detailBlock}
      {weighedRow}
    </View>
  );
}

/** ½ for half, a plain number otherwise. */
function quantityLabel(value: number): string {
  return value === 0.5 ? t('meal.item.half') : String(value);
}

const styles = StyleSheet.create({
  folded: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, borderRadius: tokens.radius.card, padding: tokens.space.md, minHeight: tokens.size.touch },
  open: { gap: tokens.space.md, borderRadius: tokens.radius.card, padding: tokens.space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  name: { flex: 1, minWidth: 0, gap: tokens.space.xs },
  part: { gap: tokens.space.sm },
  numbers: { gap: tokens.space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  macros: { flexDirection: 'row', gap: tokens.space.sm },
  macro: { flex: 1 },
  detailsRow: { minHeight: tokens.size.touch / 2, justifyContent: 'center' },
  title: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  small: { fontSize: tokens.type.bodySmall },
  big: { fontFamily: tokens.font.displayBold, fontSize: tokens.type.stepperValue, fontVariant: ['tabular-nums'] },
  macroLine: { fontSize: tokens.type.body, fontVariant: ['tabular-nums'] },
  kcal: { fontSize: tokens.type.body, fontVariant: ['tabular-nums'] },
});
