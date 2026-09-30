import { StyleSheet, Text } from 'react-native';

import { OptionCard } from '@/components/OptionCard';
import { t } from '@/copy';
import type { Profile } from '@/onboarding/draft';
import { useDraft } from '@/onboarding/OnboardingContext';
import { StepFrame } from '@/onboarding/StepFrame';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

// "Decide for me" is one of three equal answers (K-222): the phase is the engine's call either way.
const GOALS: { value: Profile['goal']; key: string }[] = [
  { value: 'LOSE_FAT', key: 'lose_fat' },
  { value: 'BUILD_MUSCLE', key: 'build_muscle' },
  { value: 'DECIDE_FOR_ME', key: 'decide_for_me' },
];

export default function GoalStep() {
  const { draft, update } = useDraft();
  const { color } = useTheme();
  return (
    <StepFrame step="goal" title={t('onboarding.goal.title')}>
      {GOALS.map(({ value, key }) => (
        <OptionCard
          key={value}
          title={t(`onboarding.goal.${key}.title`)}
          body={t(`onboarding.goal.${key}.body`)}
          selected={draft.goal === value}
          onPress={() => update({ goal: value })}
        />
      ))}
      <Text style={[styles.note, { color: color.muted }]}>{t('onboarding.goal.note')}</Text>
    </StepFrame>
  );
}

const styles = StyleSheet.create({ note: { fontSize: tokens.type.bodySmall } });
