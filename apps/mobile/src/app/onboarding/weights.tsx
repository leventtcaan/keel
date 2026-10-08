import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { t } from '@/copy';
import { LoadStepper } from '@/onboarding/LoadStepper';
import { useDraft } from '@/onboarding/OnboardingContext';
import { onboardingParams as P } from '@/onboarding/params';
import { startingWeightMoves } from '@/onboarding/flow';
import { StepFrame, routeAfter } from '@/onboarding/StepFrame';
import { stepWeight } from '@/onboarding/weights';
import { useUnits } from '@/services/ServicesProvider';
import { tokens } from '@/theme/tokens';
import { exerciseName } from '@/train/program';

/**
 * #ob-weights (ADR-072 #3, #5): the experienced lifter's working weights, the load lifted about `starting_weight_reps`
 * times, for three moves (on a program brought in, those of them it has). Each is skippable: one left unset finds its load in session 1, none is derived from another.
 * Only for the experienced and an own program (flow.ts); the last question, so Continue prepares the plan. "Skip" goes on
 * with none.
 */
export default function WeightsStep() {
  const { draft, update } = useDraft();
  const units = useUnits();
  const step = (move: string, direction: 1 | -1) => {
    const kg = stepWeight(draft.startingWeights[move], direction, units);
    const { [move]: _, ...others } = draft.startingWeights;
    update({ startingWeights: kg === undefined ? others : { ...others, [move]: kg } });
  };
  const skip = () => {
    update({ startingWeights: {} });
    router.push(routeAfter(null));
  };
  return (
    <StepFrame
      step="weights"
      title={t('onboarding.weights.title')}
      why={t('onboarding.weights.why', { reps: P.startingWeightReps })}>
      <View>
        {startingWeightMoves(draft).map((move) => (
          <LoadStepper
            key={move}
            name={exerciseName(move)}
            kg={draft.startingWeights[move]}
            units={units}
            onStep={(direction) => step(move, direction)}
          />
        ))}
      </View>
      <View style={styles.skip}>
        <Button label={t('onboarding.weights.skip')} variant="ghost" size="sm" onPress={skip} />
      </View>
    </StepFrame>
  );
}

const styles = StyleSheet.create({
  skip: { alignItems: 'center', paddingTop: tokens.space.sm },
});
