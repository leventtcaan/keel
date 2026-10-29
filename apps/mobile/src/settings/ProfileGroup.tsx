import { useCallback } from 'react';

import { ListGroup, ListRow } from '@/components/ListGroup';
import { t } from '@/copy';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { load } from '@/today/today';
import { useReadOnFocus } from '@/today/useReadOnFocus';
import { formatHeight } from '@/units/units';

import { openDetail } from './detail';
import { activityName, dayName, goalName } from './profileWords';

/**
 * Settings › About you (K-1062; ADR-090): what onboarding asked and nothing let the user change since — the goal, the
 * check-in day, the height, the day's activity and the year of birth. Each row says the answer and opens a page of buttons
 * (a choice, or a wheel) with one Save, never a form. Read whenever Settings comes into view, so a change made on its page
 * shows on return. Training days are the program's (Training › Training days), not here.
 */
export function ProfileGroup() {
  const { api } = useAppServices();
  const system = useUnits();
  const read = useCallback(() => load(() => api.GET('/v1/profile')), [api]);
  const { data } = useReadOnFocus(read);
  const profile = data?.state === 'ready' ? data.value : undefined;
  const unread =
    data !== null && data !== undefined && data.state !== 'ready' ? <ListRow icon="exclamationmark.circle" label={t('settings.profile.unread')} /> : null;
  return (
    <ListGroup title={t('settings.profile.title')} testID="group-profile">
      <ListRow icon="target" label={t('settings.profile.goal')} value={profile ? goalName(profile.goal) : ''} navigates onPress={() => openDetail('goal')} />
      <ListRow
        icon="calendar.badge.checkmark"
        label={t('settings.profile.checkIn')}
        value={profile ? dayName(profile.schedule.checkInDay) : ''}
        navigates
        onPress={() => openDetail('checkin')}
      />
      <ListRow
        icon="ruler"
        label={t('settings.profile.height')}
        value={profile ? formatHeight(profile.heightCm, system) : ''}
        navigates
        onPress={() => openDetail('height')}
      />
      <ListRow
        icon="figure.walk"
        label={t('settings.profile.activity')}
        value={profile ? activityName(profile.activityLevel) : ''}
        navigates
        onPress={() => openDetail('activity')}
      />
      <ListRow icon="gift" label={t('settings.profile.born')} value={profile ? String(profile.birthYear) : ''} navigates onPress={() => openDetail('born')} />
      {unread}
    </ListGroup>
  );
}
