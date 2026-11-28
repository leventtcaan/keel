import { router } from 'expo-router';
import { useCallback } from 'react';

import { ListGroup, ListRow } from '@/components/ListGroup';
import { t } from '@/copy';
import { useAppServices, useRestChoice } from '@/services/ServicesProvider';
import { type Loaded, load } from '@/today/today';
import { useReadOnFocus } from '@/today/useReadOnFocus';
import { cardioLine, daysLine } from '@/train/programLines';

import { DecisionReads, WeekDays } from './DecisionReads';
import { openDetail } from './detail';
import { dayName } from './profileWords';
import { restLine } from './RestSection';

/** What a read says on a row: nothing while it is on its way, the server's words when it came, "none yet" or "couldn't load" otherwise. */
function said<T>(read: Loaded<T> | undefined, value: (found: T) => string): string {
  if (read === undefined) return '';
  if (read.state === 'ready') return value(read.value);
  return t(read.state === 'none' ? 'settings.training.none' : 'settings.training.unread');
}

/** Days open Edit program's own list (one door to the program, not the editor straight away); cardio is its page. */
const edit = (part?: 'cardio') => router.push(part === undefined ? '/edit-program' : { pathname: '/edit-program', params: { part } });

/**
 * Settings › Your week (K-1257, ADR-094 Ek 9; the rows of K-982's Training and K-1062's check-in day). At the top, what the
 * weekly call reads: the training days (the program's own weekdays, the one source, drawn as the week) and the check-in day
 * (which week a call is for, and the day it opens). Under it what the call does not read: the cardio (the server's plan; the
 * engine gives it the phase, not the other way), the rest the timer aims for (K-1214; a phone setting) and the workout import
 * (K-609). Each row opens the screen that already does the work; nothing is edited here. Read whenever the page comes into
 * view, so an edit made there shows on return.
 */
export function WeekSection() {
  const { api } = useAppServices();
  const read = useCallback(async () => {
    const [program, profile] = await Promise.all([load(() => api.GET('/v1/program')), load(() => api.GET('/v1/profile'))]);
    return { program, profile };
  }, [api]);
  const { data } = useReadOnFocus(read);
  const restChoice = useRestChoice();
  const program = data?.program.state === 'ready' ? data.program.value : undefined;
  const trained = program?.days.flatMap((day) => (day.weekday === undefined ? [] : [day.weekday])) ?? [];
  const days = program === undefined ? null : <WeekDays trained={trained} />;
  return (
    <>
      <DecisionReads above={days}>
        <ListRow label={t('settings.training.days')} value={said(data?.program, daysLine)} navigates onPress={() => edit()} />
        <ListRow
          label={t('settings.profile.checkIn')}
          value={said(data?.profile, (profile) => dayName(profile.schedule.checkInDay))}
          navigates
          onPress={() => openDetail('checkin')}
        />
      </DecisionReads>
      <ListGroup testID="group-training">
        <ListRow icon="figure.run" label={t('editProgram.cardio.title')} value={said(data?.program, cardioLine)} navigates onPress={() => edit('cardio')} />
        <ListRow icon="timer" label={t('settings.rest.title')} value={restLine(restChoice)} navigates onPress={() => openDetail('rest')} />
        <ListRow icon="square.and.arrow.down" label={t('settings.training.import')} value={t('settings.training.importFrom')} navigates onPress={() => router.push('/import')} />
      </ListGroup>
    </>
  );
}
