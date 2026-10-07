import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '@/copy';
import { useDraft } from '@/onboarding/OnboardingContext';
import { defaultTrainingDays, offeredDayCounts } from '@/onboarding/params';
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
  const chosen = draft.trainingDays.length;
  return (
    <StepFrame step="days" title={t('onboarding.days.title')} why={t('onboarding.days.why')} chosen>
      <View accessibilityRole="radiogroup" style={styles.tiles}>
        {offeredDayCounts.map((count) => {
          const selected = count === chosen;
          const ink = selected ? color.decisionText : color.text;
          return (
            <Pressable
              key={count}
              accessibilityRole="radio"
              accessibilityLabel={t('onboarding.days.label', { count })}
              accessibilityState={{ checked: selected }}
              onPress={() => choose({ trainingDays: defaultTrainingDays(count) ?? [] })}
              style={[
                styles.tile,
                selected
                  ? { backgroundColor: color.decisionBackground, borderColor: color.decisionBackground }
                  : { backgroundColor: color.background, borderColor: color.line },
              ]}>
              <Text style={[styles.count, { color: ink }]}>{count}</Text>
              <Text style={[styles.unit, { color: selected ? color.decisionMuted : color.muted }]}>{t('onboarding.days.unit')}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.note, { color: color.muted }]}>{t('onboarding.days.note')}</Text>
    </StepFrame>
  );
}

/** The prototype's box: three wide, four tall. */
const TILE_ASPECT = 3 / 4;
const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: tokens.space.sm },
  tile: {
    flex: 1,
    aspectRatio: TILE_ASPECT,
    borderRadius: tokens.radius.option,
    borderWidth: tokens.border.outline,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space.xs,
  },
  count: { fontFamily: tokens.font.display, fontSize: tokens.type.tile },
  unit: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  note: { fontSize: tokens.type.bodySmall },
});
