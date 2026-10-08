import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

import { OptionCard } from '@/components/OptionCard';
import { t } from '@/copy';
import { useDraft } from '@/onboarding/OnboardingContext';
import { StepFrame } from '@/onboarding/StepFrame';

/**
 * #ob-own (ADR-073 #1, ADR-072 #2): the program the user brings comes in from another app's export, read on this phone
 * into a draft they confirm (program-import). Once it is kept on the server, Continue goes on with it; until then the
 * way on is bringing it in.
 */
export default function OwnProgramStep() {
  const { draft } = useDraft();
  // One screen per tap: a second tap before the import is up must not stack a second one.
  const opening = useRef(false);
  useFocusEffect(
    useCallback(() => {
      opening.current = false;
    }, []),
  );
  const open = () => {
    if (opening.current) return;
    opening.current = true;
    router.push('/onboarding/program-import');
  };
  return (
    <StepFrame step="ownProgram" title={t('onboarding.own.title')} why={t('onboarding.own.why')} chosen={draft.ownProgram === null}>
      <OptionCard
        title={t('onboarding.own.import.title')}
        tag={t('onboarding.own.import.tag')}
        body={t('onboarding.own.import.body')}
        selected={draft.ownProgram !== null}
        onPress={open}
      />
    </StepFrame>
  );
}
