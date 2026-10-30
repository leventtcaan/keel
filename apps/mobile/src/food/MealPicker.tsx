import type { SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Icon } from '@/components/Icon';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { ALL_SLOTS } from './slots';

type Slot = components['schemas']['MealSlot'];

const ICON: Record<Slot, SFSymbol> = {
  BREAKFAST: 'sunrise.fill',
  LUNCH: 'sun.max.fill',
  DINNER: 'moon.fill',
  SNACK: 'carrot.fill',
};

type Props = {
  value: Slot;
  onChange: (slot: Slot) => void;
  /** What each meal came to on the day being logged, as one number; a meal with nothing in it is absent. */
  kcal: Partial<Record<Slot, number>>;
};

/**
 * Which meal this is for (Evre 7 A): four equal pills in one track, each with the meal's icon, its name and what it holds so far on the
 * day being logged. The chosen one is filled in the text colour, as every segmented choice of the app is. The calories update as foods are
 * added, so the control is also a quiet running total per meal.
 */
export function MealPicker({ value, onChange, kcal }: Props) {
  const { color } = useTheme();
  return (
    <View testID="meal-picker" style={[styles.track, { backgroundColor: color.surface }]}>
      {ALL_SLOTS.map((slot) => {
        const selected = slot === value;
        const ink = selected ? color.background : color.text;
        const amount = kcal[slot];
        const name = t(`food.slot.${slot}`);
        return (
          <Pressable
            key={slot}
            testID={`slot-${slot}`}
            accessibilityRole="button"
            accessibilityLabel={amount === undefined ? t('meal.picker.spokenEmpty', { slot: name }) : t('meal.picker.spoken', { slot: name, kcal: t('food.single.kcal', { value: amount.toLocaleString('en-US') }) })}
            accessibilityState={{ selected }}
            onPress={() => onChange(slot)}
            style={[styles.pill, selected && { backgroundColor: color.text }]}>
            <Icon name={ICON[slot]} size="small" tone={selected ? 'background' : 'muted'} />
            <Text style={[styles.name, { color: ink }]}>
              {name}
            </Text>
            {amount === undefined ? (
              <View style={styles.kcalSlot} />
            ) : (
              <Text style={[styles.kcal, { color: selected ? color.background : color.muted }]}>{amount.toLocaleString('en-US')}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: tokens.space.xs, gap: tokens.space.xs, borderRadius: tokens.radius.card },
  pill: {
    flex: 1,
    minHeight: tokens.size.primaryButton + tokens.space.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: tokens.space.xs,
    borderRadius: tokens.radius.button,
  },
  name: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
  kcal: { fontSize: tokens.type.label, fontVariant: ['tabular-nums'] },
  // An empty meal keeps the line its number would take, so the four pills stay one height.
  kcalSlot: { height: tokens.type.label + tokens.space.xs },
});
