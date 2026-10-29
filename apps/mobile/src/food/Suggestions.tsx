import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Card } from '@/components/Card';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { amountLine } from './amountText';
import { handOffMeal } from './handoff';
import { kcalText, mid } from './single';

type Suggestion = components['schemas']['Suggestion'];

/**
 * What the day can still hold (K-507, Ö-17): the user's own foods, each in their usual amount with its range from the
 * database (U1), as one number (ADR-090 #5). One tap opens the meal screen with it, handed over in memory (V3) — the user saves it there.
 * Nothing fits, nothing shown: no word of a day past its target (U7).
 */
export function Suggestions({ suggestions }: { suggestions: Suggestion[] }) {
  const { color } = useTheme();
  if (suggestions.length === 0) return null;
  const log = (suggestion: Suggestion) => {
    handOffMeal([{ foodId: suggestion.foodId, name: suggestion.name, quantity: suggestion.amount.quantity, unit: suggestion.amount.unit }]);
    router.push('/meal');
  };
  return (
    <Card>
      <Text style={[styles.label, { color: color.muted }]}>{t('food.suggestions.title')}</Text>
      {suggestions.map((suggestion) => (
        <Pressable
          key={suggestion.foodId}
          accessibilityRole="button"
          accessibilityLabel={t('food.suggestions.log', { name: suggestion.name })}
          onPress={() => log(suggestion)}
          style={[styles.row, { borderTopColor: color.line }]}>
          <View style={styles.words}>
            <Text style={[styles.text, { color: color.text }]}>
              {amountLine(suggestion.name, suggestion.amount)}
            </Text>
          </View>
          <Text style={[styles.kcal, { color: color.text }]}>
            {kcalText(mid(suggestion.kcal))}
          </Text>
        </Pressable>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, paddingTop: tokens.space.sm, borderTopWidth: StyleSheet.hairlineWidth },
  words: { flex: 1 },
  text: { fontSize: tokens.type.body },
  kcal: { fontSize: tokens.type.body, fontVariant: ['tabular-nums'] },
});
