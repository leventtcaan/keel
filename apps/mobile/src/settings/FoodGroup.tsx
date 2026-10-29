import { useCallback } from 'react';

import { ListGroup, ListRow } from '@/components/ListGroup';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { load } from '@/today/today';
import { useReadOnFocus } from '@/today/useReadOnFocus';

import { openDetail } from './detail';

/**
 * Settings › Food (K-982, ADR-069 #3; moved here from onboarding): the foods the user does not or cannot eat, in their own
 * words. They can say something about health (an allergy), so they are kept and shown only with the health data consent
 * (FoodPreferences.avoid, K-225): without it the row says so and the profile is not asked for them, and its page offers the
 * consent. The row says what is kept and opens the page that edits it (`FoodEditor`), so the list is never long under a row.
 */
export function FoodGroup({ granted }: { granted: boolean | null }) {
  // Keyed by the consent: when it goes or comes back, what was read under the last yes is dropped with the component, so a
  // yes given again starts from a read, never from the old list (the server deleted it, K-231).
  return (
    <ListGroup title={t('settings.food.title')} testID="group-food">
      <FoodRow key={String(granted === true)} granted={granted} />
    </ListGroup>
  );
}

/** A row that cannot be opened is still a (disabled) button, so a screen reader finds it and hears why. */
const locked = () => undefined;

/** The foods on the row: up to two by name, then how many. The page behind it has them all. */
const SHOWN = 2;
const said = (foods: string[]) =>
  foods.length === 0 ? t('settings.food.none') : foods.length <= SHOWN ? foods.join(t('editProgram.listJoin')) : t('settings.food.count', { count: foods.length });

function FoodRow({ granted }: { granted: boolean | null }) {
  const { api } = useAppServices();
  const label = t('settings.food.avoid');
  // Read whenever Settings comes into view, so a list saved on its page shows on return. Not asked for without the consent.
  const read = useCallback(async () => (granted === true ? await load(() => api.GET('/v1/profile')) : null), [api, granted]);
  const { data } = useReadOnFocus(read);

  // Locked, the row still opens its page: the consent can be given there (not a dead end).
  if (granted === false) return <ListRow icon="nosign" label={label} value={t('settings.food.locked')} navigates onPress={() => openDetail('food')} />;
  if (granted !== true || data === null || data === undefined) return <ListRow icon="nosign" label={label} />;
  if (data.state !== 'ready') return <ListRow icon="nosign" label={label} value={t('settings.food.unread')} onPress={locked} disabled />;
  const foods = data.value.food?.avoid ?? [];
  return (
    <ListRow
      icon="nosign"
      label={label}
      value={said(foods)}
      navigates
      onPress={() => openDetail('food')}
    />
  );
}
