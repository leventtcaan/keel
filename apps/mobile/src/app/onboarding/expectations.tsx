import { useRef, useState } from 'react';

import { t } from '@/copy';
import { toProfile } from '@/onboarding/draft';
import { InfoList } from '@/onboarding/InfoList';
import { onboardingParams } from '@/onboarding/params';
import { useDraft } from '@/onboarding/OnboardingContext';
import { StepFrame } from '@/onboarding/StepFrame';
import { useAppServices } from '@/services/ServicesProvider';

/**
 * What to expect (U8, U15): the trend is shown but not read for two weeks, the call comes on Mondays, visible change
 * takes weeks. The last step: its button saves the profile. Once the server holds it, the root layout's guard swaps
 * onboarding for the tabs; a save that fails keeps every answer here to try again.
 */
export default function ExpectationsStep() {
  const { draft } = useDraft();
  const { profile, units } = useAppServices();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // A ref, not state: two taps in the same moment both see state from before either ran, a ref they share.
  const saving = useRef(false);

  async function finish() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setProblem(null);
    try {
      await profile.save(
        toProfile(draft, {
          units: units.current(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          thisYear: new Date().getFullYear(),
        }),
      );
    } catch {
      setProblem(t('onboarding.saveFailed'));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <StepFrame
      step="expectations"
      title={t('onboarding.expectations.title')}
      finish={{ label: t('onboarding.expectations.action'), onPress: finish, busy, problem }}>
      <InfoList
        prefix="onboarding.expectations"
        items={['weigh', 'monday', 'change']}
        vars={{
          days: onboardingParams.noInterpretationDays,
          day: t(`onboarding.schedule.dayName.${onboardingParams.checkInDay}`),
        }}
      />
    </StepFrame>
  );
}
