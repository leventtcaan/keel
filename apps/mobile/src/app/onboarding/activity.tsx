import { StyleSheet, Text } from 'react-native';

import type { components } from '@/api/schema';
import { OptionCard } from '@/components/OptionCard';
import { t } from '@/copy';
import { useDraft } from '@/onboarding/OnboardingContext';
import { StepFrame } from '@/onboarding/StepFrame';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

// The four NASEM 2023 levels (H6 A3-c), each with a day people recognise (ADR-027 #6). It only sets the starting
// calories; the weight trend corrects them (NASEM's own step 2, K-114).
const LEVELS: components['schemas']['ActivityLevel'][] = ['INACTIVE', 'LOW_ACTIVE', 'ACTIVE', 'VERY_ACTIVE'];

export default function ActivityStep() {
  const { draft, update } = useDraft();
  const { color } = useTheme();
  return (
    <StepFrame step="activity" title={t('onboarding.activity.title')}>
      <Text style={[styles.note, { color: color.muted }]}>{t('onboarding.activity.note')}</Text>
      {LEVELS.map((level) => (
        <OptionCard
          key={level}
          title={t(`onboarding.activity.${level}.title`)}
          body={t(`onboarding.activity.${level}.body`)}
          selected={draft.activityLevel === level}
          onPress={() => update({ activityLevel: level })}
        />
      ))}
    </StepFrame>
  );
}

const styles = StyleSheet.create({ note: { fontSize: tokens.type.bodySmall } });
