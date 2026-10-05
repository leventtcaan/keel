import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { type DraftItem, type KnownFoods, type KnownRecipes, PORTION, itemProblem } from './draft';
import { foodParams } from './params';

const PROBLEM_KEYS = { invalid: 'meal.item.invalid', tooMuch: 'meal.item.tooMuch', recipeGone: 'meal.item.recipeGone' } as const;

type Props = {
  items: DraftItem[];
  known: KnownFoods;
  /** The user's recipes once read (K-423); undefined until then. */
  recipes?: KnownRecipes;
  onChange: (index: number, part: Partial<DraftItem>) => void;
  onRemove: (index: number) => void;
};

/**
 * The items being put together (K-407): each with its amount as typed — nothing filled in for the user (I2 A4) — its
 * units, "weighed" (never for a recipe's portion, K-423) and a way to remove it; each says what the server would refuse.
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
        return (
          <View key={`${item.foodId}-${index}`} style={styles.item}>
            <Text style={[styles.name, { color: color.text }]}>{item.name}</Text>
            <TextField
              label={t('meal.item.amount', { name: item.name })}
              value={item.quantity}
              onChangeText={(quantity) => onChange(index, { quantity })}
              problem={issueText}
              announceProblem={false}
              keyboardType="decimal-pad"
              maxLength={foodParams.amountMaxChars}
            />
            <View style={styles.chips}>
              {/* Another unit empties the amount: the number meant the old one ("1" cup is not 1 g); nothing is converted for the user. */}
              {item.units.map((unit) => {
                const label = unit === 'g' ? t('meal.item.grams') : unit === PORTION ? t('meal.item.portions') : unit;
                return (
                  <Chip
                    key={unit}
                    label={label}
                    accessibilityLabel={t('meal.item.unitSpoken', { name: item.name, unit: label })}
                    selected={item.unit === unit}
                    onPress={() => onChange(index, unit === item.unit ? {} : { unit, quantity: '' })}
                  />
                );
              })}
              {/* A portion is never weighed: the recipe's whole weight is not known (ADR-034). */}
              {!portions && (
                <Chip
                  label={t('meal.item.weighed')}
                  accessibilityLabel={t('meal.item.weighedSpoken', { name: item.name })}
                  selected={item.weighed}
                  onPress={() => onChange(index, { weighed: !item.weighed })}
                />
              )}
            </View>
            <Button
              label={t('meal.item.remove')}
              accessibilityLabel={t('meal.item.removeSpoken', { name: item.name })}
              variant="ghost"
              size="sm"
              onPress={() => onRemove(index)}
            />
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  item: { gap: tokens.space.sm },
  name: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
});
