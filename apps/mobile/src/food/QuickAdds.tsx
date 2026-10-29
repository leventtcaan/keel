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

import { eatenAtFor } from './dayLabel';
import type { MealStart } from './mealStart';
import { savedMeal } from './savedMeal';
import { kcalText, mid } from './single';

type Schemas = components['schemas'];

/** Food names carry commas ("Oats, rolled"): spoken apart by a stronger pause. */
const spoken = (meal: Schemas['Meal']) => meal.items.map((item) => item.name).join('; ');

/**
 * "Same as yesterday" on the meal screen (K-980, ADR-018 Ek 1 and 3, prototype `#meal`; K-1063): yesterday's meals for the slot being
 * logged, a row each, the kcal as one number (ADR-090 #5); a press logs the meal again as it was (`repeatOf`) into today and
 * leaves the sheet — "+", Meal, one tap. The app's one banner says "Saved" with Undo (K-1044, K-1029). The foods eaten lately are
 * FoodBrowse's now. Nothing here estimates (U1). No yesterday, nothing is drawn.
 */
export function QuickAdds({
  slot,
  day,
  start,
  onDone,
}: {
  slot: Schemas['MealSlot'];
  /** The day being logged into (today: the offers are only for today). */
  day: string;
  start: MealStart;
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
  if (offers.length === 0) return null;

  const log = async (meal: Schemas['Meal']) => {
    if (working.current) return;
    working.current = true;
    setProblem(null);
    const id = `${slot}:repeat:${meal.id}`;
    if (attempt.current === null || attempt.current.what !== id) attempt.current = { what: id, clientId: newClientId() };
    const { clientId } = attempt.current;
    try {
      await queue.record({ kind: 'meal', body: { clientId, eatenAt: eatenAtFor(day, slot, new Date()), slot, repeatOf: meal.id } });
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setProblem(t('food.repeat.failed'));
      working.current = false;
      return;
    }
    onDone();
    saved(savedMeal({ clientId, slot, items: meal.items.length }, { api, takeBack, report }));
  };

  return (
    <View style={styles.part}>
      <ListGroup title={t('food.repeat.title')} testID="repeat">
        {offers.map((meal) => (
          <ListRow
            key={meal.id}
            label={meal.items.map((item) => item.name).join(' · ')}
            detail={kcalText(mid(meal.kcal))}
            trailing="plus.circle.fill"
            accessibilityLabel={t('food.repeat.spoken', { slot: t(`food.slot.${meal.slot}`), items: spoken(meal) })}
            onPress={() => void log(meal)}
          />
        ))}
      </ListGroup>
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
