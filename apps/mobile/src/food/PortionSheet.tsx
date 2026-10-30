import { useContext, useEffect, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { useKeyboardLift } from '@/components/KeyboardFrame';
import { ListGroup, ListRow } from '@/components/ListGroup';
import { Stepper } from '@/components/Stepper';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { useReduceMotion } from '@/theme/useReduceMotion';
import { parseNumber } from '@/units/units';

import { unitAfterNumber, unitLabel } from './amountText';
import { type DraftItem, type KnownFoods, type KnownRecipes, PORTION, itemProblem } from './draft';
import { PROBLEM_KEYS, numbersOf } from './ItemRows';
import { MacroBar } from './MacroBar';
import { foodParams } from './params';
import { isCounted, isWeight, portionOf, quantityInPortion, stepOf } from './portions';
import { kcalText, rangeText } from './single';

type Schemas = components['schemas'];

/** The Stepper never steps below nothing; an amount of 0 is named by the item's own problem (it must be above 0). */
const FLOOR = 0;

type Props = {
  item: DraftItem;
  /** Where the item is in the meal being put together (0 for a new food); only names the controls for tests and VoiceOver. */
  index: number;
  known: KnownFoods;
  recipes?: KnownRecipes;
  /** The server's estimate of this very item, when it has answered: the range the Details row shows. */
  estimate?: Schemas['EstimatedItem'];
  /** The meal's items as they were logged (a correction): an item still at its logged amount shows the very numbers the day shows for it. */
  logged?: Schemas['EstimatedItem'][];
  /** "Breakfast": what the one button adds to. Already translated. */
  slotName: string;
  /** `add`: a food for the meal; `save`: a logged item being corrected; `done`: an item of a meal still being put together. */
  mode: 'add' | 'save' | 'done';
  /** The heart: absent for a recipe, a quick add. */
  favorite?: { on: boolean; onToggle: () => void };
  /** The server's one question about the amount ("Weighing it makes it exact"), already worded; absent when it asks none. */
  question?: string | null;
  /** The server's answer for this amount is still on its way: no number is shown rather than one that will move. */
  waiting?: boolean;
  /** The button waits (a save is on its way). */
  busy: boolean;
  /** There is nothing to send yet (the estimate is being waited for, an amount is wrong). */
  blocked: boolean;
  onChange: (part: Partial<DraftItem>) => void;
  onSubmit: () => void;
  onClose: () => void;
  /** A correction can take the item out of the meal. */
  onRemove?: () => void;
};

/**
 * The portion step (Evre 7 A, ADR-090 #1, #5): a sheet over the screen with the food's calories as the big number and its macros as a bar
 * and three figures, the portions it is eaten in as chips (g and oz last), the quantity on a stepper whose number can be typed on a
 * numeric pad, half, 1, 2, 3 beside it for what is counted, a heart for Favorites — and the screen's one button, fixed at the foot above
 * the keyboard: "Add to Breakfast · 220 kcal". The numbers follow every choice. A quick add is the same sheet with its calories and macros
 * as fields. Closing it (the x, a tap outside) adds nothing.
 */
export function PortionSheet({ item, index, known, recipes, estimate, logged, slotName, mode, favorite, question, waiting = false, busy, blocked, onChange, onSubmit, onClose, onRemove }: Props) {
  const { color } = useTheme();
  const reduce = useReduceMotion();
  const insets = useContext(SafeAreaInsetsContext);
  const lift = useKeyboardLift(0);
  const [rise] = useState(() => new Animated.Value(0));
  const [detail, setDetail] = useState(false);

  useEffect(() => {
    if (reduce) return undefined;
    const coming = Animated.timing(rise, { toValue: 1, duration: tokens.motion.bannerMs, useNativeDriver: true });
    coming.start();
    return () => coming.stop();
  }, [reduce, rise]);

  const issue = itemProblem(item, known, recipes);
  const portions = item.unit === PORTION;
  const ceiling = recipes?.get(item.foodId)?.portions ?? 0;
  const issueText =
    issue === null || issue === 'missing'
      ? null
      : issue === 'tooMuch' && portions
        ? t(`meal.item.tooManyPortions.${ceiling === 1 ? 'one' : 'other'}`, { portions: ceiling })
        : t(PROBLEM_KEYS[issue]);
  const portion = portionOf(item);
  const quantity = parseNumber(item.quantity);
  const counted = isCounted(portion, item.unit) && !portions;
  const numbers = numbersOf(item, estimate, logged, waiting);
  const food = known.get(item.foodId);
  const quick = item.quick;
  const label = numbers === null || quick !== undefined ? t('meal.sheet.add', { slot: slotName }) : t('meal.sheet.addKcal', { slot: slotName, kcal: kcalText(numbers.kcal) });

  const bottom = Math.max(lift, insets?.bottom ?? 0);
  const motion = reduce ? {} : { opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [tokens.space.xl, 0] }) }] };

  const heart =
    favorite === undefined ? null : (
      <Pressable
        testID={`favorite-${index}`}
        accessibilityRole="button"
        accessibilityLabel={t(favorite.on ? 'meal.favorite.remove' : 'meal.favorite.add', { name: item.name })}
        accessibilityState={{ selected: favorite.on }}
        onPress={favorite.onToggle}
        style={styles.headButton}>
        <Icon name={favorite.on ? 'heart.fill' : 'heart'} tone={favorite.on ? 'accent' : 'muted'} />
      </Pressable>
    );
  const brand = food?.brand === undefined ? null : <Text style={[styles.small, { color: color.muted }]}>{food.brand}</Text>;
  const head = (
    <View style={styles.head}>
      <View style={styles.name}>
        <Text accessibilityRole="header" style={[styles.title, { color: color.text }]}>
          {item.name}
        </Text>
        {brand}
      </View>
      {heart}
      <Pressable testID="sheet-close" accessibilityRole="button" accessibilityLabel={t('meal.sheet.closeSpoken')} onPress={onClose} style={styles.headButton}>
        <Icon name="xmark.circle.fill" tone="muted" />
      </Pressable>
    </View>
  );

  const figures =
    numbers === null || quick !== undefined ? null : (
      <View style={styles.part}>
        <View style={styles.bigLine}>
          <Text testID={`numbers-${index}`} style={[styles.big, { color: color.text }]}>
            {numbers.kcal.toLocaleString('en-US')}
          </Text>
          <Text style={[styles.bigUnit, { color: color.muted }]}>{t('food.budget.kcalUnit')}</Text>
        </View>
        <MacroBar protein={numbers.protein} carbs={numbers.carbs} fat={numbers.fat} />
      </View>
    );

  const chips =
    quick !== undefined ? null : (
      <View style={styles.chips} testID={`units-${index}`}>
        {item.units.map((unit) => (
          <Chip
            key={unit}
            label={item.portions?.find((p) => p.unit === unit)?.label ?? unitLabel(unit)}
            accessibilityLabel={t('meal.item.unitSpoken', { name: item.name, unit: unitLabel(unit) })}
            selected={unit === item.unit}
            onPress={() => unit !== item.unit && onChange({ unit, quantity: quantityInPortion(item, unit) })}
          />
        ))}
      </View>
    );
  const stepper =
    quick !== undefined ? null : (
      <Stepper
        // Another unit is another number: a field still being typed in (the keyboard stays up over a chip's press) starts over.
        key={item.unit}
        label={t('meal.item.amount', { name: item.name })}
        value={quantity}
        onChange={(next) => onChange({ quantity: String(next) })}
        onEmpty={() => onChange({ quantity: '' })}
        step={stepOf(item.unit, portion)}
        min={FLOOR}
        decimals={foodParams.amountDecimals}
        unit={unitAfterNumber(item.unit)}
      />
    );
  const quickChips =
    counted && quick === undefined ? (
      <View style={styles.chips}>
        {foodParams.quickQuantities.map((value) => (
          <Chip
            key={value}
            label={value === 0.5 ? t('meal.item.half') : String(value)}
            accessibilityLabel={t('meal.item.quantitySpoken', { quantity: value })}
            selected={quantity === value}
            onPress={() => onChange({ quantity: String(value) })}
          />
        ))}
      </View>
    ) : null;
  const quickFields =
    quick === undefined ? null : (
      <View style={styles.part}>
        <TextField
          label={t('meal.quickAdd.kcal')}
          value={quick.kcal}
          onChangeText={(kcal) => onChange({ quick: { ...quick, kcal } })}
          keyboardType="number-pad"
          maxLength={String(foodParams.quickAddKcalMax).length}
        />
        <View style={styles.macros}>
          {(['protein', 'carbs', 'fat'] as const).map((macro) => (
            <View key={macro} style={styles.macro}>
              <TextField
                label={t(`meal.quickAdd.${macro}`)}
                value={quick[macro]}
                onChangeText={(text) => onChange({ quick: { ...quick, [macro]: text } })}
                keyboardType="number-pad"
                maxLength={String(foodParams.quickAddMacroMax).length}
              />
            </View>
          ))}
        </View>
      </View>
    );
  // Weighing means something only on a scale (g, oz); a recipe's portion is never weighed (ADR-034).
  const weighed =
    portions || quick !== undefined || !isWeight(item.unit) ? null : (
      <ListGroup>
        <ListRow
          label={t('meal.sheet.weighed')}
          accessibilityLabel={t('meal.item.weighedSpoken', { name: item.name })}
          switch={{ value: item.weighed, onValueChange: (value) => onChange({ weighed: value }) }}
        />
      </ListGroup>
    );
  const detailText =
    estimate === undefined
      ? t('meal.item.detailWaiting')
      : t('meal.item.detailRange', {
          kcal: rangeText(estimate.kcal, t('food.budget.kcalUnit')),
          protein: rangeText(estimate.proteinG, t('food.budget.proteinUnit')),
        });
  const details =
    quick !== undefined || portions ? null : (
      <View>
        <Pressable testID={`details-${index}`} accessibilityRole="button" accessibilityState={{ expanded: detail }} onPress={() => setDetail((now) => !now)} style={styles.detailsRow}>
          <Text style={[styles.small, { color: color.accent }]}>{t(detail ? 'meal.item.detailHide' : 'meal.sheet.detail')}</Text>
        </Pressable>
        {detail && <Text style={[styles.small, { color: color.textSecondary }]}>{detailText}</Text>}
      </View>
    );

  const removal =
    onRemove === undefined ? null : <Button label={t('meal.item.remove')} accessibilityLabel={t('meal.item.removeSpoken', { name: item.name })} variant="destructive" onPress={onRemove} />;
  const questionLine = question === undefined || question === null ? null : <Text style={[styles.small, { color: color.textSecondary }]}>{question}</Text>;
  const problemLine = issueText === null ? null : <Text style={[styles.small, { color: color.text }]}>{issueText}</Text>;
  return (
    <Modal transparent animationType="none" visible statusBarTranslucent onRequestClose={onClose}>
    <View style={StyleSheet.absoluteFill} testID="portion-sheet" accessibilityViewIsModal>
      <Pressable accessibilityRole="button" accessibilityLabel={t('meal.sheet.closeSpoken')} onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: color.text, opacity: tokens.opacity.scrim }]} />
      <View style={styles.anchor} pointerEvents="box-none">
        <Animated.View style={[styles.panel, { backgroundColor: color.background, paddingBottom: bottom + tokens.space.sm }, motion]}>
          <View style={[styles.grabber, { backgroundColor: color.edge }]} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body} bounces={false}>
            {head}
            {figures}
            {chips}
            {quickChips}
            {stepper}
            {quickFields}
            {weighed}
            {questionLine}
            {problemLine}
            {details}
            {removal}
          </ScrollView>
          <View style={styles.dock}>
            <Button label={mode === 'add' ? label : t(mode === 'save' ? 'meal.edit.save' : 'meal.done')} onPress={onSubmit} disabled={busy || blocked || issue !== null} busy={busy} />
          </View>
        </Animated.View>
      </View>
    </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  anchor: { flex: 1, justifyContent: 'flex-end' },
  panel: { maxHeight: '90%', borderTopLeftRadius: tokens.radius.card + tokens.space.sm, borderTopRightRadius: tokens.radius.card + tokens.space.sm, paddingTop: tokens.space.sm },
  grabber: { alignSelf: 'center', width: tokens.size.touch - tokens.space.sm, height: tokens.size.track - 2, borderRadius: tokens.radius.track },
  body: { gap: tokens.space.md, paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.md, paddingBottom: tokens.space.md },
  dock: { paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.sm },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space.xs },
  name: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontSize: tokens.type.number, fontWeight: tokens.weight.bold },
  headButton: { width: tokens.size.touch, height: tokens.size.touch, alignItems: 'center', justifyContent: 'center' },
  part: { gap: tokens.space.sm },
  bigLine: { flexDirection: 'row', alignItems: 'baseline', gap: tokens.space.sm },
  big: { fontFamily: tokens.font.displayBold, fontSize: tokens.type.display, fontVariant: ['tabular-nums'] },
  bigUnit: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  macros: { flexDirection: 'row', gap: tokens.space.sm },
  macro: { flex: 1 },
  detailsRow: { minHeight: tokens.size.touch / 2, justifyContent: 'center' },
  small: { fontSize: tokens.type.bodySmall },
});
