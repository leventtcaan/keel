import { t } from '@/copy';
import { InfoList } from '@/onboarding/InfoList';
import { onboardingParams } from '@/onboarding/params';
import { RemindersOffer } from '@/onboarding/RemindersOffer';
import { StepFrame } from '@/onboarding/StepFrame';

// What to expect (U8, U15): the trend is shown but not read for the first days, the call comes on the check-in day,
// visible change takes weeks. The numbers are the parameters', filled in. Then the reminders, offered once (K-434);
// going on is "not now".
export default function ExpectationsStep() {
  return (
    <StepFrame step="expectations" title={t('onboarding.expectations.title')} continueLabel={t('onboarding.expectations.action')}>
      <InfoList
        prefix="onboarding.expectations"
        items={['weigh', 'monday', 'change']}
        vars={{
          days: onboardingParams.noInterpretationDays,
          day: t(`onboarding.schedule.dayName.${onboardingParams.checkInDay}`),
        }}
      />
      <RemindersOffer />
    </StepFrame>
  );
}
