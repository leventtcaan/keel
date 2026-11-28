import { useCallback } from 'react';

import { ListRow } from '@/components/ListGroup';
import { t } from '@/copy';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { load } from '@/today/today';
import { useReadOnFocus } from '@/today/useReadOnFocus';
import { formatHeight } from '@/units/units';

import { DecisionReads } from './DecisionReads';
import { openDetail } from './detail';
import { FoodGroup } from './FoodGroup';
import { activityName, goalName } from './profileWords';

/**
 * Settings › You (K-1257, ADR-094 Ek 9; the answers of K-1062's About you). At the top, what the weekly call reads of what
 * onboarding asked: the goal (the first plan's phase), the height, the day's activity and the year of birth (the resting energy
 * and the age). Each row says the answer and opens a page of buttons (a choice, or a wheel) with one Save, never a form. Under it
 * the foods you avoid, which only the meal suggestions read, behind the health data consent. Read whenever the page comes into
 * view, so a change made on a page shows on return. The check-in day is in Your week.
 */
export function YouSection({ granted }: { granted: boolean | null }) {
  const { api } = useAppServices();
  const system = useUnits();
  const read = useCallback(() => load(() => api.GET('/v1/profile')), [api]);
  const { data } = useReadOnFocus(read);
  const profile = data?.state === 'ready' ? data.value : undefined;
  const unread = data !== null && data !== undefined && data.state !== 'ready' ? <ListRow label={t('settings.profile.unread')} /> : null;
  return (
    <>
      <DecisionReads>
        <ListRow label={t('settings.profile.goal')} value={profile ? goalName(profile.goal) : ''} navigates onPress={() => openDetail('goal')} />
        <ListRow label={t('settings.profile.height')} value={profile ? formatHeight(profile.heightCm, system) : ''} navigates onPress={() => openDetail('height')} />
        <ListRow label={t('settings.profile.activity')} value={profile ? activityName(profile.activityLevel) : ''} navigates onPress={() => openDetail('activity')} />
        <ListRow label={t('settings.profile.born')} value={profile ? String(profile.birthYear) : ''} navigates onPress={() => openDetail('born')} />
        {unread}
      </DecisionReads>
      <FoodGroup granted={granted} />
    </>
  );
}
