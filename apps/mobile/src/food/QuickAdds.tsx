import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import type { components } from '@/api/schema';
import { ListGroup, ListRow } from '@/components/ListGroup';
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

const kcalOf = (range: Schemas['KcalRange']) => `${t('format.range', { low: range.low, high: range.high })} ${t('food.budget.kcalUnit')}`;
/** Food names carry commas ("Oats, rolled"): spoken apart by a stronger pause. */
const spoken = (meal: Schemas['Meal']) => meal.items.map((item) => item.name).join('; ');

/**
 * The meal screen's one-tap part (K-980, ADR-018 Ek 1 and 3, prototype `#meal`): "Same as yesterday" for the slot being logged,
 * and the foods eaten lately ("Recent", `GET /v1/foods/recent`, K-1025), each with its range (U5) as the row's second line, in a neutral colour
 * — the number is not judged, never the warning colour. Both are grouped list rows (K-1046): a press logs, the plus says so. A tap keeps the meal on the phone (sent when it can be, K-304) and leaves the screen: "+", Meal, one
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

  // Built outside the JSX children (the raw-text guard reads them).
  const repeatGroup =
    offers.length === 0 ? null : (
      <ListGroup title={t('food.repeat.title')} testID="repeat">
        {offers.map((meal) => (
          <ListRow
            key={meal.id}
            label={meal.items.map((item) => item.name).join(' · ')}
            detail={kcalOf(meal.kcal)}
            trailing="plus.circle.fill"
            accessibilityLabel={t('food.repeat.spoken', { slot: t(`food.slot.${meal.slot}`), items: spoken(meal) })}
            onPress={() => void log(`repeat:${meal.id}`, meal.items.length, { repeatOf: meal.id })}
          />
        ))}
      </ListGroup>
    );
  return (
    <View style={styles.part}>
      {repeatGroup}
      {recent.length > 0 && (
        <ListGroup title={t('meal.quick.recent')}>
          {recent.map((food) => (
            <ListRow
              key={food.foodId}
              testID={`recent-${food.foodId}`}
              label={amountLine(food.name, food.amount)}
              detail={kcalOf(food.kcal)}
              trailing="plus.circle.fill"
              accessibilityLabel={t('food.suggestions.log', { name: food.name })}
              onPress={() => void log(`food:${food.foodId}`, 1, { items: [{ foodId: food.foodId, amount: food.amount }] })}
            />
          ))}
        </ListGroup>
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
  part: { gap: tokens.space.md },
  name: { fontSize: tokens.type.body },
});
