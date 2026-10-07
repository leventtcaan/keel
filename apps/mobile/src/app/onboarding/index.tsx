import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { OptionCard } from '@/components/OptionCard';
import { t } from '@/copy';
import { useDraft } from '@/onboarding/OnboardingContext';
import { StepFrame, useChoose } from '@/onboarding/StepFrame';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * #ob-goal. "Decide for me" is the recommended answer (ADR-072 #2): the phase is the engine's call either way (K-222), so
 * the other two stay a tap away, never hidden.
 */
export default function GoalStep() {
  const { draft } = useDraft();
  const choose = useChoose('goal');
  const { signOut } = useAppServices();
  const { color } = useTheme();
  return (
    <StepFrame step="goal" title={t('onboarding.goal.title')} chosen>
      <OptionCard
        hero
        title={t('onboarding.goal.decide_for_me.title')}
        tag={t('onboarding.recommended')}
        body={t('onboarding.goal.decide_for_me.body')}
        selected={draft.goal === 'DECIDE_FOR_ME'}
        onPress={() => choose({ goal: 'DECIDE_FOR_ME' })}
      />
      <OptionCard
        title={t('onboarding.goal.lose_fat.title')}
        selected={draft.goal === 'LOSE_FAT'}
        onPress={() => choose({ goal: 'LOSE_FAT' })}
      />
      <OptionCard
        title={t('onboarding.goal.build_muscle.title')}
        selected={draft.goal === 'BUILD_MUSCLE'}
        onPress={() => choose({ goal: 'BUILD_MUSCLE' })}
      />
      <Text style={[styles.note, { color: color.muted }]}>{t('onboarding.goal.note')}</Text>
      {/* The way out before any answer is kept: a different Apple ID, or not now. Nothing is saved until the end. */}
      <Button label={t('onboarding.signOut')} variant="ghost" size="sm" onPress={() => void signOut()} />
    </StepFrame>
  );
}

const styles = StyleSheet.create({ note: { fontSize: tokens.type.bodySmall } });
