import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { OptionCard } from '@/components/OptionCard';
import { t } from '@/copy';
import type { Profile } from '@/onboarding/draft';
import { useDraft } from '@/onboarding/OnboardingContext';
import { StepFrame } from '@/onboarding/StepFrame';
import { useAppServices } from '@/services/ServicesProvider';
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
  const { signOut } = useAppServices();
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
      {/* The way out before any answer is kept: a different Apple ID, or not now. Nothing is saved until the end. */}
      <Button label={t('onboarding.signOut')} variant="ghost" size="sm" onPress={() => void signOut()} />
    </StepFrame>
  );
}

const styles = StyleSheet.create({ note: { fontSize: tokens.type.bodySmall } });
