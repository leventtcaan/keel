import { router } from 'expo-router';
import { useCallback } from 'react';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { type Loaded, load } from '@/today/today';
import { useReadOnFocus } from '@/today/useReadOnFocus';
import { cardioLine, daysLine } from '@/train/programLines';

import { Section } from './Section';
import { SettingsRow } from './SettingsRow';

type Schemas = components['schemas'];

/** What a read says on a row: nothing while it is on its way, the server's words when it came, "none yet" or "couldn't load" otherwise. */
function said<T>(read: Loaded<T> | undefined, value: (found: T) => string): string {
  if (read === undefined) return '';
  if (read.state === 'ready') return value(read.value);
  return t(read.state === 'none' ? 'settings.training.none' : 'settings.training.unread');
}

const edit = (part: 'days' | 'cardio') => router.push({ pathname: '/edit-program', params: { part } });

/**
 * Settings › Training (K-982, ADR-074 #4, ADR-073): the days (the program's own weekdays, the one source), the cardio (the
 * server's plan), the gyms (K-421), and the workout import (K-609). Each row says what it holds and opens the screen that
 * already does the work; nothing is edited here, so nothing here can disagree with Edit program. Read whenever Settings
 * comes into view, so an edit made there shows on return.
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
    <Section title={t('settings.training.title')}>
      <SettingsRow label={t('settings.training.days')} value={said(data?.program, daysLine)} onPress={() => edit('days')} />
      <SettingsRow label={t('editProgram.cardio.title')} value={said(data?.program, cardioLine)} onPress={() => edit('cardio')} />
      <SettingsRow label={t('settings.gyms')} value={said(data?.gyms, gym)} onPress={() => router.push('/gyms')} />
      <SettingsRow label={t('settings.training.import')} value={t('settings.training.importFrom')} onPress={() => router.push('/import')} />
    </Section>
  );
}
