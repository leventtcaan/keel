import { StyleSheet, Text } from 'react-native';

import { OptionCard } from '@/components/OptionCard';
import { t } from '@/copy';
import type { Profile } from '@/onboarding/draft';
import { useDraft } from '@/onboarding/OnboardingContext';
import { StepFrame } from '@/onboarding/StepFrame';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

// Both are supported, chosen here (product decision, 29 Sep; K-205).
const CHOICES: { value: Profile['programChoice']; key: string }[] = [
  { value: 'BRING_MY_OWN', key: 'bring_my_own' },
  { value: 'BUILD_ONE_FOR_ME', key: 'build_one_for_me' },
];

export default function ProgramStep() {
  const { draft, update } = useDraft();
  const { color } = useTheme();
  return (
    <StepFrame step="program" title={t('onboarding.program.title')}>
      {CHOICES.map(({ value, key }) => (
        <OptionCard
          key={value}
          title={t(`onboarding.program.${key}.title`)}
          body={t(`onboarding.program.${key}.body`)}
          selected={draft.programChoice === value}
          onPress={() => update({ programChoice: value })}
        />
      ))}
      <Text style={[styles.note, { color: color.muted }]}>{t('onboarding.program.note')}</Text>
    </StepFrame>
  );
}

const styles = StyleSheet.create({ note: { fontSize: tokens.type.bodySmall } });
