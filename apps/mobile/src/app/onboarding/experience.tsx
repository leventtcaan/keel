import { OptionCard } from '@/components/OptionCard';
import { t } from '@/copy';
import { useDraft } from '@/onboarding/OnboardingContext';
import { StepFrame, useChoose } from '@/onboarding/StepFrame';

/**
 * #ob-exp (ADR-072 #3): how long they have trained. It changes the walk, never an engine rule: the experienced are asked
 * their starting weights, a new lifter's are found in the first session (flow.ts). Years are only the question's words;
 * the level itself is being able to push hard (G1 K-73), which the sessions show.
 */
export default function ExperienceStep() {
  const { draft } = useDraft();
  const choose = useChoose('experience');
  return (
    <StepFrame step="experience" title={t('onboarding.experience.title')} why={t('onboarding.experience.why')} chosen>
      <OptionCard
        title={t('onboarding.experience.NEW')}
        selected={draft.experience === 'NEW'}
        onPress={() => choose({ experience: 'NEW' })}
      />
      <OptionCard
        title={t('onboarding.experience.UNDER_1Y')}
        selected={draft.experience === 'UNDER_1Y'}
        onPress={() => choose({ experience: 'UNDER_1Y' })}
      />
      <OptionCard
        title={t('onboarding.experience.Y1_3')}
        selected={draft.experience === 'Y1_3'}
        onPress={() => choose({ experience: 'Y1_3' })}
      />
      <OptionCard
        title={t('onboarding.experience.Y3_PLUS')}
        selected={draft.experience === 'Y3_PLUS'}
        onPress={() => choose({ experience: 'Y3_PLUS' })}
      />
    </StepFrame>
  );
}
