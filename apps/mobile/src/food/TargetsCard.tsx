import { StyleSheet, Text } from 'react-native';

import type { components } from '@/api/schema';
import { Card } from '@/components/Card';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * The targets the calls set (K-216): plan numbers, one figure each. Carbs and fat only when a split fits — otherwise
 * it says so and makes no number up; before the first calorie target, only the steps and the training days.
 */
export function TargetsCard({ targets }: { targets: components['schemas']['Targets'] }) {
  const { color } = useTheme();
  const lines: string[] = [];
  if (targets.targetKcal !== undefined) {
    lines.push(t('food.targets.kcal', { kcal: targets.targetKcal.toLocaleString('en-US') }));
    if (targets.proteinG !== undefined) lines.push(t('food.targets.protein', { g: targets.proteinG }));
    if (targets.carbsG !== undefined && targets.fatG !== undefined) {
      lines.push(t('food.targets.carbs', { g: targets.carbsG }), t('food.targets.fat', { g: targets.fatG }));
    } else {
      lines.push(t('food.targets.noSplit'));
    }
  }
  lines.push(
    t('food.targets.steps', { steps: targets.stepsPerDay.toLocaleString('en-US') }),
    t('food.targets.training', { count: targets.trainingSessionsPerWeek }),
  );
  return (
    <Card testID="targets">
      <Text style={[styles.label, { color: color.muted }]}>{t('food.targets.title')}</Text>
      {lines.map((line) => (
        <Text key={line} style={[styles.text, { color: color.text }]}>
          {line}
        </Text>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
});
