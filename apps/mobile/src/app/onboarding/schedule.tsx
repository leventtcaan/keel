import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { type SessionsLastMonth, WEEK, lighterThanLastMonth, toggleDay, usualTime } from '@/onboarding/draft';
import { useDraft } from '@/onboarding/OnboardingContext';
import { onboardingParams } from '@/onboarding/params';
import { StepFrame } from '@/onboarding/StepFrame';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

const SESSIONS: SessionsLastMonth[] = ['NONE_OR_ONE', 'TWO_TO_THREE', 'FOUR', 'FIVE_OR_MORE'];
const TIME_LENGTH = 'HH:mm'.length;

/** The plan in the user's own days (I1 A2: give back an inference from their answers), and what last month says of it. */
function PlanNote({ days, last }: { days: number; last: SessionsLastMonth | null }) {
  const { color } = useTheme();
  if (days === 0) return null;
  const lighter = last !== null && lighterThanLastMonth(last, days);
  return (
    <Card>
      <Text style={[styles.label, { color: color.muted }]}>{t('onboarding.schedule.planTitle')}</Text>
      <Text style={[styles.plan, { color: color.text }]}>
        {days === 1 ? t('onboarding.schedule.planOne') : t('onboarding.schedule.plan', { days })}
      </Text>
      {lighter && <Text style={[styles.note, { color: color.textSecondary }]}>{t('onboarding.schedule.lighter')}</Text>}
      {!lighter && days < onboardingParams.maxTrainingDays && (
        <Text style={[styles.note, { color: color.textSecondary }]}>{t('onboarding.schedule.addLater', { days })}</Text>
      )}
    </Card>
  );
}

export default function ScheduleStep() {
  const { draft, update } = useDraft();
  const { color } = useTheme();
  const full = draft.trainingDays.length >= onboardingParams.maxTrainingDays;
  const timeProblem = usualTime(draft.usualTrainingTime) === undefined ? t('onboarding.schedule.timeInvalid') : null;
  return (
    <StepFrame step="schedule" title={t('onboarding.schedule.title')}>
      <Text style={[styles.label, { color: color.muted }]}>{t('onboarding.schedule.days')}</Text>
      <View style={styles.row}>
        {WEEK.map((day) => {
          const chosen = draft.trainingDays.includes(day);
          return (
            <Chip
              key={day}
              label={t(`onboarding.schedule.dayShort.${day}`)}
              accessibilityLabel={t(`onboarding.schedule.dayName.${day}`)}
              selected={chosen}
              disabled={full && !chosen}
              onPress={() => update({ trainingDays: toggleDay(draft.trainingDays, day) })}
            />
          );
        })}
      </View>
      {full && (
        <Text style={[styles.note, { color: color.muted }]}>
          {t('onboarding.schedule.restDay', { max: onboardingParams.maxTrainingDays })}
        </Text>
      )}
      <Text style={[styles.label, { color: color.muted }]}>{t('onboarding.schedule.lastMonth')}</Text>
      <View style={styles.row}>
        {SESSIONS.map((value) => (
          <Chip
            key={value}
            label={t(`onboarding.schedule.sessions.${value}`)}
            selected={draft.sessionsLastMonth === value}
            onPress={() => update({ sessionsLastMonth: value })}
          />
        ))}
      </View>
      <TextField
        label={t('onboarding.schedule.time')}
        value={draft.usualTrainingTime}
        onChangeText={(text) => update({ usualTrainingTime: text })}
        keyboardType="numbers-and-punctuation"
        maxLength={TIME_LENGTH}
        hint={t('onboarding.schedule.timeHint')}
        problem={timeProblem}
      />
      <PlanNote days={draft.trainingDays.length} last={draft.sessionsLastMonth} />
    </StepFrame>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
  plan: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  note: { fontSize: tokens.type.bodySmall },
});
