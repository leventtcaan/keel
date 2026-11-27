import { SymbolView } from 'expo-symbols';
import { ActionSheetIOS, Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { kcalText } from './single';
import { ALL_SLOTS } from './slots';

type Slot = components['schemas']['MealSlot'];

type Props = {
  value: Slot;
  onChange: (slot: Slot) => void;
  /** What each meal came to on the day being logged, as one number; a meal with nothing in it is absent. */
  kcal: Partial<Record<Slot, number>>;
  /** The day being logged, already worded ("Today", "Fri, Sep 25"). */
  day: string;
};

/**
 * Which meal this is for, as the screen's title (ADR-094 Ek 4 #1): the meal's name in the serif with a petrol chevron, and under it the
 * day and what the meal holds so far ("Today · 610 kcal", "Today · nothing yet"). A press opens the system's list of the four meals, each
 * with its calories on that day, tinted petrol as every system choice of the app (Ek 3 #4). Nothing is squeezed into a narrow pill, so
 * no name wraps and no line moves when a number arrives.
 */
export function MealPicker({ value, onChange, kcal, day }: Props) {
  const { color } = useTheme();
  const name = t(`food.slot.${value}`);
  const amount = kcal[value];
  const state = amount === undefined ? t('meal.picker.dayEmpty', { day }) : t('meal.picker.day', { day, kcal: kcalText(amount) });

  const choose = () => {
    const options = ALL_SLOTS.map((slot) => {
      const held = kcal[slot];
      return held === undefined ? t(`food.slot.${slot}`) : t('meal.picker.option', { slot: t(`food.slot.${slot}`), kcal: kcalText(held) });
    });
    ActionSheetIOS.showActionSheetWithOptions(
      { options: [...options, t('meal.picker.cancel')], cancelButtonIndex: ALL_SLOTS.length, tintColor: color.accent },
      (index) => {
        if (index >= 0 && index < ALL_SLOTS.length) onChange(ALL_SLOTS[index]);
      },
    );
  };

  return (
    <Pressable
      testID="meal-picker"
      accessibilityRole="button"
      accessibilityLabel={amount === undefined ? t('meal.picker.spokenEmpty', { slot: name }) : t('meal.picker.spoken', { slot: name, kcal: kcalText(amount) })}
      accessibilityHint={t('meal.picker.change')}
      onPress={choose}
      style={({ pressed }) => [styles.head, pressed && styles.dim]}>
      <View style={styles.nameLine}>
        <Text accessibilityRole="header" style={[styles.name, { color: color.text }]}>
          {name}
        </Text>
        <SymbolView name="chevron.down" size={tokens.type.bodySmall} tintColor={color.accent} />
      </View>
      <Text style={[styles.state, { color: color.muted }]}>{state}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { alignSelf: 'flex-start', gap: 2, minHeight: tokens.size.touch },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  name: { ...tokens.face.display, fontSize: tokens.type.screenTitle, flexShrink: 1 },
  state: { fontSize: tokens.type.bodySmall, fontVariant: ['tabular-nums'] },
  dim: { opacity: tokens.opacity.dim },
});
