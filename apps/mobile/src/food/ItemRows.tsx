import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ListGroup, ListRow } from '@/components/ListGroup';
import { Stepper } from '@/components/Stepper';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { parseNumber } from '@/units/units';

import { unitAfterNumber, unitLabel } from './amountText';
import { type DraftItem, type KnownFoods, type KnownRecipes, PORTION, itemProblem } from './draft';
import { kcalPer100g } from './kcalLine';
import { foodParams } from './params';
import { UnitSegments } from './UnitSegments';

const PROBLEM_KEYS = { invalid: 'meal.item.invalid', tooMuch: 'meal.item.tooMuch', recipeGone: 'meal.item.recipeGone' } as const;
const GRAMS = 'g';
/** The Stepper never steps below nothing; an amount of 0 is named by the item's own problem (it must be above 0). */
const FLOOR = 0;

type Props = {
  items: DraftItem[];
  known: KnownFoods;
  /** The user's recipes once read (K-423); undefined until then. */
  recipes?: KnownRecipes;
  onChange: (index: number, part: Partial<DraftItem>) => void;
  onRemove: (index: number) => void;
};

/**
 * The items being put together (K-407, K-1046; prototype yeniden-yapim.html §7 "picked"): each with its name and, for a food
 * from the search, its range per 100 g; "Remove" as a destructive text button; the amount as the one Stepper (typed or
 * stepped, nothing filled in for the user beyond ADR-085's defaults, I2 A4); its units as a track of their own; "weighed" as a
 * switch row (never for a recipe's portion, K-423); each says what the server would refuse.
 * Shared by the meal and the recipe entry (K-423).
 */
export function ItemRows({ items, known, recipes, onChange, onRemove }: Props) {
  const { color } = useTheme();
  return (
    <>
      {items.map((item, index) => {
        const itemIssue = itemProblem(item, known, recipes);
        const portions = item.unit === PORTION;
        const ceiling = recipes?.get(item.foodId)?.portions ?? 0;
        const issueText =
          itemIssue === null || itemIssue === 'missing'
            ? null
            : itemIssue === 'tooMuch' && portions
              ? t(`meal.item.tooManyPortions.${ceiling === 1 ? 'one' : 'other'}`, { portions: ceiling })
              : t(PROBLEM_KEYS[itemIssue]);
        const food = known.get(item.foodId);
        const quantity = parseNumber(item.quantity);
        const amountLabel = t('meal.item.amount', { name: item.name });
        return (
          <View key={`${item.foodId}-${index}`} style={styles.item}>
            <View style={styles.head}>
              <View style={styles.name}>
                <Text style={[styles.title, { color: color.text }]}>{item.name}</Text>
                {food !== undefined && <Text style={[styles.small, { color: color.muted }]}>{kcalPer100g(food).written}</Text>}
              </View>
              <Button
                label={t('meal.item.remove')}
                accessibilityLabel={t('meal.item.removeSpoken', { name: item.name })}
                variant="destructive"
                onPress={() => onRemove(index)}
              />
            </View>
            <View style={styles.part}>
              <Text style={[styles.small, styles.fld, { color: color.muted }]}>{t('meal.item.amountTitle')}</Text>
              <Stepper
                // Another unit is another number: a field still being typed in (the keyboard stays up over a chip's press) starts over.
                key={item.unit}
                label={amountLabel}
                value={quantity}
                onChange={(next) => onChange(index, { quantity: String(next) })}
                onEmpty={() => onChange(index, { quantity: '' })}
                step={item.unit === GRAMS ? foodParams.amountStepG : foodParams.amountStepServing}
                min={FLOOR}
                decimals={foodParams.amountDecimals}
                unit={unitAfterNumber(item.unit)}
              />
              {issueText !== null && <Text style={[styles.small, { color: color.text }]}>{issueText}</Text>}
            </View>
            <View style={styles.part}>
              <Text style={[styles.small, styles.fld, { color: color.muted }]}>{t('meal.item.unitTitle')}</Text>
              {/* Another unit empties the amount: the number meant the old one ("1" cup is not 1 g); nothing is converted for the user.
                  Shown for a single unit too (a food in grams only): the chosen unit is always on the screen, as in the prototype. */}
              <UnitSegments
                testID={`units-${index}`}
                units={item.units.map((unit) => ({
                  value: unit,
                  label: unitLabel(unit),
                  spoken: t('meal.item.unitSpoken', { name: item.name, unit: unitLabel(unit) }),
                }))}
                value={item.unit}
                onChange={(unit) => onChange(index, unit === item.unit ? {} : { unit, quantity: '' })}
              />
            </View>
            {/* A portion is never weighed: the recipe's whole weight is not known (ADR-034). */}
            {!portions && (
              <ListGroup>
                <ListRow
                  label={t('meal.item.weighed')}
                  accessibilityLabel={t('meal.item.weighedSpoken', { name: item.name })}
                  switch={{ value: item.weighed, onValueChange: (weighed) => onChange(index, { weighed }) }}
                />
              </ListGroup>
            )}
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  item: { gap: tokens.space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  name: { flex: 1, minWidth: 0, gap: tokens.space.xs },
  part: { gap: tokens.space.xs },
  title: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  small: { fontSize: tokens.type.bodySmall },
  fld: { fontWeight: tokens.weight.semibold },
});
