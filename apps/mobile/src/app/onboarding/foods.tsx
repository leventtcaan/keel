import { StyleSheet, Text } from 'react-native';

import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { useDraft } from '@/onboarding/OnboardingContext';
import { StepFrame } from '@/onboarding/StepFrame';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

const MAX_LENGTH = 500;

// Only in the walk with the health consent (ADR-027 #14): a food someone can't eat may be an allergy. Optional.
export default function FoodsStep() {
  const { draft, update } = useDraft();
  const { color } = useTheme();
  return (
    <StepFrame step="foods" title={t('onboarding.foods.title')}>
      <TextField
        label={t('onboarding.foods.label')}
        value={draft.avoid}
        onChangeText={(avoid) => update({ avoid })}
        hint={t('onboarding.foods.hint')}
        maxLength={MAX_LENGTH}
      />
      <Text style={[styles.note, { color: color.muted }]}>{t('onboarding.foods.note')}</Text>
    </StepFrame>
  );
}

const styles = StyleSheet.create({ note: { fontSize: tokens.type.bodySmall } });
