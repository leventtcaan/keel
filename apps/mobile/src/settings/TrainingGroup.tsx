import { router } from 'expo-router';
import { useCallback } from 'react';

import type { components } from '@/api/schema';
import { ListGroup, ListRow } from '@/components/ListGroup';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { type Loaded, load } from '@/today/today';
import { useReadOnFocus } from '@/today/useReadOnFocus';
import { cardioLine, daysLine } from '@/train/programLines';

type Schemas = components['schemas'];

/** What a read says on a row: nothing while it is on its way, the server's words when it came, "none yet" or "couldn't load" otherwise. */
function said<T>(read: Loaded<T> | undefined, value: (found: T) => string): string {
  if (read === undefined) return '';
  if (read.state === 'ready') return value(read.value);
  return t(read.state === 'none' ? 'settings.training.none' : 'settings.training.unread');
}

const edit = (part: 'days' | 'cardio') => router.push({ pathname: '/edit-program', params: { part } });

/**
 * Settings › Training (K-982, ADR-074 #4, ADR-073; a grouped list, ADR-070 Ek 2 #2): the days (the program's own weekdays,
 * the one source), the cardio (the server's plan), the gyms (K-421), and the workout import (K-609). Each row says what it
 * holds and opens the screen that already does the work; nothing is edited here, so nothing here can disagree with Edit
 * program. Read whenever Settings comes into view, so an edit made there shows on return.
 */
export function TrainingGroup() {
  const { api } = useAppServices();
  const read = useCallback(
    async () => ({ program: await load(() => api.GET('/v1/program')), gyms: await load<Schemas['Gym'][]>(() => api.GET('/v1/gyms')) }),
    [api],
  );
  const { data } = useReadOnFocus(read);
  const gym = (gyms: Schemas['Gym'][]) => gyms.find((g) => g.current)?.name ?? (gyms.length === 0 ? t('settings.training.noGym') : '');
  return (
    <ListGroup title={t('settings.training.title')} testID="group-training">
      <ListRow icon="calendar" label={t('settings.training.days')} value={said(data?.program, daysLine)} navigates onPress={() => edit('days')} />
      <ListRow icon="figure.run" label={t('editProgram.cardio.title')} value={said(data?.program, cardioLine)} navigates onPress={() => edit('cardio')} />
      <ListRow icon="mappin.and.ellipse" label={t('settings.gyms')} value={said(data?.gyms, gym)} navigates onPress={() => router.push('/gyms')} />
      <ListRow icon="square.and.arrow.down" label={t('settings.training.import')} value={t('settings.training.importFrom')} navigates onPress={() => router.push('/import')} />
    </ListGroup>
  );
}
