import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { BudgetLine } from '@/food/BudgetLine';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { formatWeight } from '@/units/units';
import { useUnits } from '@/services/ServicesProvider';

import { type Loaded, programToday } from './today';

type Schemas = components['schemas'];
type Props = {
  day: string;
  weighIns: Loaded<Schemas['WeighIn'][]>;
  program: Loaded<Schemas['Program']>;
  targets: Loaded<Schemas['Targets']>;
  budget: Loaded<Schemas['DayBudget']>;
};

/**
 * Today's list (prototype 2.1): the weigh-in, today's session, the food left, the steps. Each row shows what is known and leaves out
 * what is not — a part behind the consent or not there yet is simply not a row. The food row is what is left of the
 * day's budget, as ranges (K-409); the step count arrives from Apple Health (K-404).
 */
export function TodayList({ day, weighIns, program, targets, budget }: Props) {
  const { color } = useTheme();
  const units = useUnits();
  // Built outside the rows' JSX (the raw-text guard reads JSX attributes there).
  const logWeight = <Button label={t('today.list.weighIn.log')} size="sm" onPress={() => router.push('/weigh-in')} />;
  const rows: { key: string; title: string; note?: string; line?: ReactNode; action?: ReactNode }[] = [];

  if (weighIns.state === 'ready') {
    const latest = weighIns.value.at(-1);
    rows.push(
      latest === undefined
        ? {
            key: 'weighIn',
            title: t('today.list.weighIn.todo'),
            note: t('today.list.weighIn.todoNote'),
            action: logWeight,
          }
        : {
            key: 'weighIn',
            title: t('today.list.weighIn.done'),
            note: formatWeight(latest.kg, units),
          },
    );
  }
  if (weighIns.state === 'failed' || weighIns.state === 'consent') {
    // Offline, or without the consent: the weigh-in still opens — it saves on the phone first, and asks for the
    // consent itself (K-402 review).
    rows.push({ key: 'weighIn', title: t('today.list.weighIn.todo'), note: t('today.list.weighIn.todoNote'), action: logWeight });
  }
  if (program.state === 'ready') {
    const today = programToday(program.value, day);
    rows.push(
      today.kind === 'session'
        ? {
            key: 'training',
            title: today.day.nameKey === undefined ? (today.day.name ?? '') : t(`programDays.${today.day.nameKey}.name`),
            note: t('today.list.training.exercises', {
              count: today.day.exercises.length,
            }),
          }
        : {
            key: 'training',
            title: t(today.kind === 'rest' ? 'today.list.training.rest' : 'today.list.training.restWeek'),
          },
    );
  } else if (program.state === 'none') {
    rows.push({ key: 'training', title: t('today.list.training.none') });
  }
  if (budget.state === 'ready') {
    rows.push({ key: 'food', title: t('today.list.food.title'), line: <BudgetLine left={budget.value.left} /> });
  }
  if (targets.state === 'ready') {
    rows.push({
      key: 'steps',
      title: t('today.list.steps.title'),
      note: t('today.list.steps.target', {
        steps: targets.value.stepsPerDay.toLocaleString('en-US'),
      }),
    });
  }
  if (rows.length === 0) return null;
  return (
    <Card testID="today-list">
      <Text style={[styles.label, { color: color.muted }]}>{t('today.list.title')}</Text>
      {rows.map((row) => (
        <View key={row.key} style={[styles.row, { borderTopColor: color.line }]}>
          <Text style={[styles.text, { color: color.text }]}>{row.title}</Text>
          {row.note !== undefined && <Text style={[styles.small, { color: color.muted }]}>{row.note}</Text>}
          {row.line}
          {row.action}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  row: {
    borderTopWidth: tokens.border.hairline,
    paddingTop: tokens.space.sm,
    gap: tokens.space.xs,
  },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
