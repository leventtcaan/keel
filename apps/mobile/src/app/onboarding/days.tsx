import { StyleSheet, Text } from 'react-native';

import { t } from '@/copy';
import { DayTiles } from '@/onboarding/DayTiles';
import { useDraft } from '@/onboarding/OnboardingContext';
import { defaultTrainingDays } from '@/onboarding/params';
import { StepFrame, useChoose } from '@/onboarding/StepFrame';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * #ob-days (ADR-072 #4): one question, how many days. The app places them (default_day_sets) and the user moves them
 * any time; last month's sessions and a usual time are no longer asked. Two days is offered as the user's own choice;
 * the engine never proposes fewer than three (ADR-071 #8).
 */
export default function DaysStep() {
  const { draft } = useDraft();
  const choose = useChoose('days');
  const { color } = useTheme();
  return (
    <StepFrame step="days" title={t('onboarding.days.title')} why={t('onboarding.days.why')} chosen>
      <DayTiles chosen={draft.trainingDays.length} onChoose={(count) => choose({ trainingDays: defaultTrainingDays(count) ?? [] })} />
      <Text style={[styles.note, { color: color.muted }]}>{t('onboarding.days.note')}</Text>
    </StepFrame>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: tokens.type.bodySmall },
});
