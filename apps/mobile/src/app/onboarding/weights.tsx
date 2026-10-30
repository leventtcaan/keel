import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { t } from '@/copy';
import { LoadRow } from '@/onboarding/LoadRow';
import { useDraft } from '@/onboarding/OnboardingContext';
import { onboardingParams as P } from '@/onboarding/params';
import { startingWeightMoves } from '@/onboarding/flow';
import { StepFrame, routeAfter } from '@/onboarding/StepFrame';
import { useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { exerciseName } from '@/train/program';

/**
 * #ob-weights (ADR-072 #3, #5; prototype section 11 frame 7, K-1058): the experienced lifter's working weights, the load lifted
 * about `starting_weight_reps` times, for three moves (on a program brought in, those of them it has). A tap on a lift opens its
 * wheel under the row, one at a time; flicked to a number, the load reaches the draft in kg as the stepper's taps did. Each is
 * skippable: one left unset finds its load in session 1, none is derived from another (the wheel starts on the empty bar, a
 * place, not a suggestion). Only for the experienced and an own program (flow.ts); the last question, so Continue prepares the
 * plan. The dock has one button: "Skip for now" while nothing is set (none is sent), "Continue" once a lift is.
 */
export default function WeightsStep() {
  const { draft, update } = useDraft();
  const units = useUnits();
  const { color } = useTheme();
  // The lift whose wheel is open: one at a time.
  const [open, setOpen] = useState<string | null>(null);
  const set = (move: string, kg: number) => update({ startingWeights: { ...draft.startingWeights, [move]: kg } });
  // Back to "Not set": the move leaves the draft, so nothing is sent for it.
  const clear = (move: string) => {
    const { [move]: _cleared, ...rest } = draft.startingWeights;
    update({ startingWeights: rest });
  };
  const skip = () => {
    update({ startingWeights: {} });
    router.push(routeAfter(null));
  };
  const anySet = Object.keys(draft.startingWeights).length > 0;
  return (
    <StepFrame
      step="weights"
      title={t('onboarding.weights.title')}
      why={t('onboarding.weights.why', { reps: P.startingWeightReps })}
      // One exit in the dock: Skip while nothing is set (it sends none), Continue once a lift is (it sends those).
      actions={
        anySet ? (
          <Button label={t('onboarding.continue')} onPress={() => router.push(routeAfter(null))} />
        ) : (
          <Button label={t('onboarding.weights.skip')} onPress={skip} />
        )
      }>
      <View>
        {startingWeightMoves(draft).map((move) => (
          <LoadRow
            key={move}
            name={exerciseName(move)}
            kg={draft.startingWeights[move]}
            units={units}
            open={open === move}
            onToggle={() => setOpen(open === move ? null : move)}
            onChange={(kg) => set(move, kg)}
            onClear={() => clear(move)}
          />
        ))}
      </View>
      <Text style={[styles.tap, { color: color.muted }]}>{t('onboarding.weights.tap')}</Text>
    </StepFrame>
  );
}

const styles = StyleSheet.create({
  tap: { fontSize: tokens.type.bodySmall },
});
