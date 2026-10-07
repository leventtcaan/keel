import { OptionCard } from '@/components/OptionCard';
import { t } from '@/copy';
import { useDraft } from '@/onboarding/OnboardingContext';
import { StepFrame, useChoose } from '@/onboarding/StepFrame';

/**
 * #ob-program: a program built for them is recommended (ADR-072 #2); bringing their own opens the own-program branch,
 * where it is brought in and reviewed (ADR-073, flow.ts). Both are supported (K-205).
 */
export default function ProgramStep() {
  const { draft } = useDraft();
  const choose = useChoose('program');
  return (
    <StepFrame step="program" title={t('onboarding.program.title')} chosen>
      <OptionCard
        hero
        title={t('onboarding.program.build_one_for_me.title')}
        tag={t('onboarding.recommended')}
        body={t('onboarding.program.build_one_for_me.body')}
        selected={draft.programChoice === 'BUILD_ONE_FOR_ME'}
        onPress={() => choose({ programChoice: 'BUILD_ONE_FOR_ME' })}
      />
      <OptionCard
        title={t('onboarding.program.bring_my_own.title')}
        body={t('onboarding.program.bring_my_own.body')}
        selected={draft.programChoice === 'BRING_MY_OWN'}
        onPress={() => choose({ programChoice: 'BRING_MY_OWN' })}
      />
    </StepFrame>
  );
}
