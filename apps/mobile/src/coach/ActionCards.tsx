import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { announce } from '@/components/ProblemText';
import { t } from '@/copy';
import { amountLine } from '@/food/amountText';
import { handOffMeal } from '@/food/handoff';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Schemas = components['schemas'];

/** Today's walk as the reminders keep it (K-1216): the steps left and their line, the nudge's time, whether it is planned today. */
export type WalkToday = { day: string; remaining: number; body: string; at: string; planned: boolean };

/** What "Add to plan" said back, or that it could not be asked. */
type Planned = 'set' | 'off' | 'late' | 'quiet' | 'none' | 'failed';

/** What a press says on the card: today's reminder set, the reminders off (with the way to Settings), past the time, or a failure. */
const SAID: Record<Exclude<Planned, 'none'>, string> = {
  set: 'coach.action.walk.set',
  off: 'coach.action.walk.off',
  late: 'coach.action.walk.late',
  quiet: 'coach.action.walk.quiet',
  failed: 'coach.action.walk.failed',
};

/**
 * The engine's walk for the steps left (K-1236, ADR-092 Ek 2 #2): the line is Today's own read (U1: the engine's target less
 * Health's count, against the user's routes), the coach makes none up. "Add to plan" sets today's evening walk reminder alone;
 * the plan, the targets, the call and the user's own reminder switch stay as they are.
 */
export function WalkCard({ walk }: { walk: WalkToday }) {
  const { reminders } = useAppServices();
  const [said, setSaid] = useState<Planned | null>(walk.planned ? 'set' : null);
  const add = async () => {
    const answer: Planned = await reminders.planWalkToday().catch((): Planned => 'failed');
    setSaid(answer);
    if (answer !== 'none') announce(t(SAID[answer], { time: walk.at }));
  };
  // Nothing left to walk by the time it was pressed (past midnight, a newer read): the card has nothing to offer.
  if (said === 'none') return null;
  const line = said === null ? null : <Words words={t(SAID[said], { time: walk.at })} />;
  const way =
    said === null ? (
      <Button label={t('coach.action.walk.add')} onPress={() => void add()} />
    ) : said === 'off' ? (
      <Button label={t('coach.action.walk.settings')} variant="ghost" size="sm" onPress={() => router.push('/settings')} />
    ) : said === 'failed' ? (
      <Button label={t('coach.action.walk.add')} onPress={() => void add()} />
    ) : null;
  return (
    <Card id="walk" title={t('coach.action.walk.title')}>
      <Words words={walk.body} strong />
      {line}
      {way}
    </Card>
  );
}

/**
 * What fits what is left today (K-1236, K-507): the user's own food in their usual amount, as the database has it. "Log" takes it
 * to the meal screen as a draft (in memory, V3), where it is saved; nothing is logged from here.
 */
export function MealCard({ suggestion }: { suggestion: Schemas['Suggestion'] }) {
  const log = () => {
    handOffMeal([{ foodId: suggestion.foodId, name: suggestion.name, quantity: suggestion.amount.quantity, unit: suggestion.amount.unit }]);
    router.push('/meal');
  };
  return (
    <Card id="meal" title={t('coach.action.meal.title')}>
      <Words words={amountLine(suggestion.name, suggestion.amount)} strong />
      <Button label={t('coach.action.meal.log')} onPress={log} />
    </Card>
  );
}

/** A card the engine's suggestion is on: the coral ground and the petrol button (ADR-094 §3), its title in the serif voice. */
function Card({ id, title, children }: { id: 'walk' | 'meal'; title: string; children: ReactNode }) {
  const { color } = useTheme();
  return (
    <View testID={`coach-action-${id}`} style={[styles.card, { backgroundColor: color.tintSuggest }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: color.text }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Words({ words, strong = false }: { words: string; strong?: boolean }) {
  const { color } = useTheme();
  return <Text style={[styles.words, { color: strong ? color.text : color.textSecondary }]}>{words}</Text>;
}

const styles = StyleSheet.create({
  card: { borderRadius: tokens.radius.card, padding: tokens.space.md, gap: tokens.space.sm },
  title: { ...tokens.face.display, fontSize: tokens.type.heading },
  words: { fontSize: tokens.type.body },
});
