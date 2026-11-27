/**
 * The paywall's hero right after onboarding (K-1058, prototype section 11 frame 8): the user's own plan, tagged YOURS where the
 * example card says EXAMPLE — the food it starts on, today's workout and the first call, the three things the plan screen
 * just showed. Every figure is the plan's (the server's starting target and first call, the program's first workout):
 * kept as the plan showed it, never worked out here (U1). Only with calls: without the health data consent there are none,
 * and the paywall keeps the example card.
 */
import { formatNumber } from '@/copy/format';
import { View } from 'react-native';

import { DecisionBlock } from '@/components/DecisionBlock';
import { t } from '@/copy';
import { CallRow, type StartingCallRow } from '@/onboarding/StartingCall';
import { FramedTag } from '@/subscription/PaywallParts';
import type { PlanPreview } from '@/subscription/planPreview';
import { weekdayDate } from '@/today/today';

// "2,440": a whole number of kcal as the app writes it, in English like every word of the app.
const KCAL = (n: number) => formatNumber(n);

/** The rows of the card: the food (when the plan had a starting target), the first workout, the first call (a day). */
export function yourPlanRows(preview: PlanPreview & { firstCall: string }): StartingCallRow[] {
  const rows: StartingCallRow[] = [];
  if (preview.startingKcal !== null) {
    rows.push({ label: t('onboarding.plan.food'), value: t('onboarding.plan.foodKcal', { kcal: KCAL(preview.startingKcal) }) });
  }
  const label = preview.workoutToday
    ? t('onboarding.plan.today')
    : preview.firstWorkout === null
      ? t('subscription.yours.workoutDay')
      : t(`onboarding.schedule.dayName.${preview.firstWorkout}`);
  rows.push({
    label,
    value:
      preview.workoutMoves === 1
        ? t('subscription.yours.workoutOne', { name: preview.workoutName })
        : t('subscription.yours.workout', { name: preview.workoutName, count: preview.workoutMoves }),
  });
  rows.push({
    label: t('onboarding.plan.firstCall'),
    value: weekdayDate(preview.firstCall),
    note: t('subscription.yours.callNote', { day: t(`onboarding.schedule.dayName.${preview.checkInDay}`) }),
  });
  return rows;
}

export function YourPlanCard({ preview }: { preview: PlanPreview & { firstCall: string } }) {
  const tag = <FramedTag label={t('subscription.yours.tag')} />;
  return (
    <View accessibilityLabel={t('subscription.yours.label')}>
      <DecisionBlock aside={tag} title={t('subscription.yours.title')}>
        {yourPlanRows(preview).map((row) => (
          <CallRow key={row.label} {...row} />
        ))}
      </DecisionBlock>
    </View>
  );
}
