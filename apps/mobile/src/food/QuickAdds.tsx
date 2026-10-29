import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ProblemText, useProblem } from '@/components/ProblemText';
import { t } from '@/copy';
import { useSaved } from '@/saved/saved';
import { useAppServices } from '@/services/ServicesProvider';
import { newClientId } from '@/sync/send';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { amountLine } from './amountText';
import { foodParams } from './params';
import type { MealStart } from './mealStart';
import { savedMeal } from './savedMeal';

type Schemas = components['schemas'];

const GLYPH = 28;
const kcalOf = (range: Schemas['KcalRange']) => `${t('format.range', { low: range.low, high: range.high })} ${t('food.budget.kcalUnit')}`;
/** Food names carry commas ("Oats, rolled"): spoken apart by a stronger pause. */
const spoken = (meal: Schemas['Meal']) => meal.items.map((item) => item.name).join('; ');

/**
 * The meal screen's one-tap part (K-980, ADR-018 Ek 1 and 3, prototype `#meal`): "Same as yesterday" for the slot being logged,
 * and the foods eaten lately ("Recent", `GET /v1/foods/recent`, K-1025), each with its range (U5) in the text colour — the
 * number is not judged. A tap keeps the meal on the phone (sent when it can be, K-304) and leaves the screen: "+", Meal, one
 * tap. "Same as yesterday" logs yesterday's meal again as it was (`repeatOf`); a recent food logs that food in the amount of its
 * last time. A tap leaves the sheet and the app's one banner says "Saved" with Undo, as the weigh-in and the cardio log do
 * (K-1044; the meal is taken back through the same delete the meal list uses, `takeBack`, K-1029). The server orders them (the slot's own first): the phone only shows the first few that fit. Nothing here estimates:
 * the ranges are the server's (U1). Both lists empty (the first day), nothing is drawn.
 */
export function QuickAdds({
  slot,
  start,
  recent: foods,
  onDone,
}: {
  slot: Schemas['MealSlot'];
  start: MealStart;
  recent: Schemas['Suggestion'][];
  /** A meal was kept: leave the sheet. */
  onDone: () => void;
}) {
  const { api, queue, takeBack, report } = useAppServices();
  const saved = useSaved();
  const { color } = useTheme();
  const [problem, setProblem, occurrence] = useProblem();
  const working = useRef(false); // two taps in the same moment must not log twice; stays set once a meal is kept, while the sheet goes
  // The meal being logged and its clientId: a try that said it failed may have been kept all the same, so trying that meal
  // again is the same clientId (kept once); another meal is a new one.
  const attempt = useRef<{ what: string; clientId: string } | null>(null);

  const offers = start.offers.filter((meal) => meal.slot === slot);
  const recent = foods.slice(0, foodParams.quickRecentMax);
  if (offers.length === 0 && recent.length === 0) return null;

  const log = async (what: string, items: number, body: Pick<Schemas['NewMeal'], 'repeatOf' | 'items'>) => {
    if (working.current) return;
    working.current = true;
    setProblem(null);
    const id = `${slot}:${what}`;
    if (attempt.current === null || attempt.current.what !== id) attempt.current = { what: id, clientId: newClientId() };
    const { clientId } = attempt.current;
    try {
      await queue.record({ kind: 'meal', body: { clientId, eatenAt: new Date().toISOString(), slot, ...body } });
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setProblem(t('food.repeat.failed'));
      working.current = false;
      return;
    }
    onDone();
    saved(savedMeal({ clientId, slot, items }, { api, takeBack, report }));
  };

  return (
    <View style={styles.part}>
      {offers.map((meal) => (
        <Card key={meal.id} outline testID="repeat">
          <Text style={[styles.label, { color: color.muted }]}>{t('food.repeat.title')}</Text>
          <View style={styles.row}>
            <View style={styles.grow}>
              {meal.items.map((item, i) => (
                <Text key={i} style={[styles.name, { color: color.text }]}>
                  {item.name}
                </Text>
              ))}
              <Text style={[styles.kcal, { color: color.text }]}>{kcalOf(meal.kcal)}</Text>
            </View>
            <Button
              label={t('meal.quick.add')}
              size="touch"
              accessibilityLabel={t('food.repeat.spoken', { slot: t(`food.slot.${meal.slot}`), items: spoken(meal) })}
              onPress={() => void log(`repeat:${meal.id}`, meal.items.length, { repeatOf: meal.id })}
            />
          </View>
        </Card>
      ))}
      {recent.length > 0 && (
        <View style={styles.part}>
          <Text style={[styles.label, { color: color.muted }]}>{t('meal.quick.recent')}</Text>
          {recent.map((food) => (
            <Pressable
              key={food.foodId}
              accessibilityRole="button"
              accessibilityLabel={t('food.suggestions.log', { name: food.name })}
              onPress={() => void log(`food:${food.foodId}`, 1, { items: [{ foodId: food.foodId, amount: food.amount }] })}
              style={({ pressed }) => [styles.usual, { borderColor: color.line }, pressed && styles.dim]}>
              <View style={styles.grow}>
                <Text style={[styles.name, { color: color.text }]}>
                  {amountLine(food.name, food.amount)}
                </Text>
                <Text style={[styles.kcal, { color: color.text }]}>{kcalOf(food.kcal)}</Text>
              </View>
              <Svg width={GLYPH} height={GLYPH} viewBox="0 0 28 28" accessible={false}>
                <Circle cx="14" cy="14" r="13" fill={color.accent} />
                <Path d="M14 8v12M8 14h12" stroke={color.onAccent} strokeWidth={2.4} strokeLinecap="round" />
              </Svg>
            </Pressable>
          ))}
        </View>
      )}
      {problem !== null && (
        <ProblemText occurrence={occurrence} style={[styles.name, { color: color.text }]}>
          {problem}
        </ProblemText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  part: { gap: tokens.space.sm },
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  grow: { flex: 1, gap: tokens.space.xs },
  name: { fontSize: tokens.type.body },
  strong: { fontWeight: tokens.weight.semibold },
  kcal: { fontSize: tokens.type.bodySmall, fontVariant: ['tabular-nums'] },
  usual: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, minHeight: tokens.size.touch, paddingVertical: tokens.space.xs, borderBottomWidth: tokens.border.hairline },
  dim: { opacity: tokens.opacity.dim },
});
