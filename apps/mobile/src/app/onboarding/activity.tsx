import type { components } from '@/api/schema';
import { OptionCard } from '@/components/OptionCard';
import { t } from '@/copy';
import { useDraft } from '@/onboarding/OnboardingContext';
import { StepFrame, useChoose } from '@/onboarding/StepFrame';

// The four NASEM 2023 levels (H6 A3-c), each a day people recognise (ADR-027 #6), in the prototype's few words. It only
// sets the starting calories; the weight trend corrects them (NASEM's own step 2, K-114).
const LEVELS: components['schemas']['ActivityLevel'][] = ['INACTIVE', 'LOW_ACTIVE', 'ACTIVE', 'VERY_ACTIVE'];

/**
 * #ob-activity: the last question of the new lifter's walk, before the starting weights for the others. The answer moves
 * on; after the last question the plan is prepared (K-967), where the profile is saved.
 */
export default function ActivityStep() {
  const { draft } = useDraft();
  const choose = useChoose('activity');
  return (
    <StepFrame step="activity" title={t('onboarding.activity.title')} why={t('onboarding.activity.why')} chosen>
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
