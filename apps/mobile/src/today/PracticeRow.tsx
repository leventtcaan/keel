import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { type Practice, practiceOf } from './practice';

const OPEN: Record<Practice, () => void> = {
  food: () => router.push('/food'),
  train: () => router.dismissTo('/train'),
  walk: () => router.dismissTo('/'),
};

/**
 * "In practice" (K-1217): under the call, one row of up to three ways to the daily places it changed (the food page,
 * Train, the walk on Home). Nothing for a call that moved none of them, one that is not in the plan, or a past call (it is not this week).
 */
export function PracticeRow({ decision }: { decision: components['schemas']['Decision'] }) {
  const { color } = useTheme();
  const places = practiceOf(decision);
  if (places.length === 0) return null;
  return (
    <View testID="practice" style={styles.box}>
      <Text accessibilityRole="header" style={[styles.title, { color: color.muted }]}>
        {t('callScreen.practice.title')}
      </Text>
      <View style={styles.row}>
        {places.map((place) => (
          <View key={place} testID="practice-link">
            <Button label={t(`callScreen.practice.${place}`)} accessibilityLabel={t(`callScreen.practice.${place}Label`)} variant="secondary" size="sm" onPress={OPEN[place]} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: tokens.space.sm },
  title: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
});
