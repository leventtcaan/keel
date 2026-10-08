import { StyleSheet, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { OptionCard } from '@/components/OptionCard';
import { ProblemText } from '@/components/ProblemText';
import { t } from '@/copy';
import { useDraft } from '@/onboarding/OnboardingContext';
import { StepFrame, useChoose } from '@/onboarding/StepFrame';
import { useFinish } from '@/onboarding/useFinish';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

// The four NASEM 2023 levels (H6 A3-c), each a day people recognise (ADR-027 #6), in the prototype's few words. It only
// sets the starting calories; the weight trend corrects them (NASEM's own step 2, K-114).
const LEVELS: components['schemas']['ActivityLevel'][] = ['INACTIVE', 'LOW_ACTIVE', 'ACTIVE', 'VERY_ACTIVE'];

/**
 * #ob-activity, the last question of the walk: the answer ends it and the profile is saved (until K-967 puts the starting
 * weights and the plan after it). A save that fails is said, with a way to try again.
 */
export default function ActivityStep() {
  const { draft } = useDraft();
  const { color } = useTheme();
  const finish = useFinish();
  const choose = useChoose('activity', finish.run);
  const actions =
    finish.problem === null ? undefined : (
      <View style={styles.actions}>
        <ProblemText occurrence={finish.occurrence} style={[styles.text, { color: color.text }]}>
          {finish.problem}
        </ProblemText>
        <Button label={t('onboarding.tryAgain')} onPress={() => void finish.run(draft)} disabled={finish.busy} />
      </View>
    );
  return (
    <StepFrame
      step="activity"
      title={t('onboarding.activity.title')}
      why={t('onboarding.activity.why')}
      chosen
      actions={actions}
      backDisabled={finish.busy}>
      {LEVELS.map((level) => (
        <OptionCard
          key={level}
          title={t(`onboarding.activity.${level}`)}
          selected={draft.activityLevel === level}
          onPress={() => choose({ activityLevel: level })}
        />
      ))}
    </StepFrame>
  );
}

const styles = StyleSheet.create({
  actions: { gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
});
