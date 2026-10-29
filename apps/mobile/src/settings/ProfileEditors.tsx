import { router } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { OptionCard } from '@/components/OptionCard';
import { ProblemText } from '@/components/ProblemText';
import { t } from '@/copy';
import { Wheel } from '@/onboarding/Wheel';
import { heightCm } from '@/onboarding/draft';
import { heightFromWheel, heightOnWheel, heightValues, yearValues } from '@/onboarding/wheels';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { load } from '@/today/today';
import { CM_PER_IN, INCHES_PER_FOOT, type UnitSystem } from '@/units/units';

import { type Profile, useProfileEdit } from './profileEdit';
import { ACTIVITY_VALUES, DAY_VALUES, GOAL_VALUES, activityName, dayName, goalName } from './profileWords';
import { useAction } from './useAction';

type Schemas = components['schemas'];

/**
 * The pages behind Settings › About you (K-1062): the goal, the check-in day, the height, the day's activity and the year of
 * birth. Each is buttons: the choice (or a wheel) is made, then one Save writes it (profileEdit.ts: the profile read now, this
 * answer changed, the rest as it is) and the page closes on the row that shows it. Save stays off until something is different.
 */
function useProfilePage() {
  const { api } = useAppServices();
  const edit = useProfileEdit();
  const { busy, problem, run } = useAction();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [unread, setUnread] = useState(false);

  useEffect(() => {
    let live = true; // an answer after the page closed changes nothing
    void load(() => api.GET('/v1/profile')).then((read) => {
      if (!live) return;
      if (read.state === 'ready') setProfile(read.value);
      else setUnread(true);
    });
    return () => {
      live = false;
    };
  }, [api]);

  const save = (change: (current: Profile) => Profile) =>
    void run(
      async () => {
        await edit(change);
        router.back();
      },
      {},
      'settings.profile.failed',
    );
  return { profile, unread, busy, problem, save };
}

/** The page's frame: what is not read yet says so; the choice, then Save, and what went wrong under it. */
function Page({ page, changed, onSave, children }: { page: ReturnType<typeof useProfilePage>; changed: boolean; onSave: () => void; children: ReactNode }) {
  const { color } = useTheme();
  if (page.unread) return <Text style={[styles.note, { color: color.muted }]}>{t('settings.profile.unread')}</Text>;
  if (page.profile === null) return null;
  return (
    <View style={styles.stack}>
      {children}
      <Button label={t('settings.profile.save')} size="touch" disabled={page.busy || !changed} onPress={onSave} />
      {page.problem !== null && <ProblemText style={[styles.note, { color: color.text }]}>{page.problem}</ProblemText>}
    </View>
  );
}

export function GoalEditor() {
  const page = useProfilePage();
  const [chosen, setChosen] = useState<Schemas['Profile']['goal'] | null>(null);
  const current = page.profile?.goal;
  const picked = chosen ?? current;
  return (
    <Page page={page} changed={picked !== current} onSave={() => picked !== undefined && page.save((p) => ({ ...p, goal: picked }))}>
      {GOAL_VALUES.map((goal) => (
        <OptionCard
          key={goal}
          title={goalName(goal)}
          body={goal === 'DECIDE_FOR_ME' ? t('onboarding.goal.decide_for_me.body') : undefined}
          selected={picked === goal}
          onPress={() => setChosen(goal)}
        />
      ))}
    </Page>
  );
}

export function CheckInEditor() {
  const page = useProfilePage();
  const { color } = useTheme();
  const [chosen, setChosen] = useState<Schemas['Weekday'] | null>(null);
  const current = page.profile?.schedule.checkInDay;
  const picked = chosen ?? current;
  return (
    <Page
      page={page}
      changed={picked !== current}
      onSave={() => picked !== undefined && page.save((p) => ({ ...p, schedule: { ...p.schedule, checkInDay: picked } }))}>
      <Text style={[styles.note, { color: color.muted }]}>{t('settings.profile.checkInNote')}</Text>
      <View style={styles.chips}>
        {DAY_VALUES.map((day) => (
          <Chip key={day} label={dayName(day)} selected={picked === day} touch onPress={() => setChosen(day)} />
        ))}
      </View>
    </Page>
  );
}

export function ActivityEditor() {
  const page = useProfilePage();
  const [chosen, setChosen] = useState<Schemas['ActivityLevel'] | null>(null);
  const current = page.profile?.activityLevel;
  const picked = chosen ?? current;
  return (
    <Page
      page={page}
      changed={chosen !== null && chosen !== current}
      onSave={() => picked !== undefined && page.save((p) => ({ ...p, activityLevel: picked }))}>
      {ACTIVITY_VALUES.map((level) => (
        <OptionCard key={level} title={activityName(level)} selected={picked === level} onPress={() => setChosen(level)} />
      ))}
    </Page>
  );
}

/** The wheel's height fields for a height the profile keeps in whole centimetres: the centimetres, or the nearest whole inches. */
export function heightFields(cm: number, system: UnitSystem) {
  const none = { cm: '', feet: '', inches: '' };
  if (system === 'METRIC') return { ...none, cm: String(cm) };
  return heightFromWheel(Math.round(cm / CM_PER_IN), 'IMPERIAL', none);
}

export function HeightEditor() {
  const page = useProfilePage();
  const system = useUnits();
  const [fields, setFields] = useState<ReturnType<typeof heightFields> | null>(null);
  const metric = system === 'METRIC';
  const shown = fields ?? (page.profile === null ? null : heightFields(page.profile.heightCm, system));
  const picked = shown === null ? null : heightCm(shown, system);
  const format = (value: number) =>
    metric ? String(value) : t('units.feetInches', { feet: Math.floor(value / INCHES_PER_FOOT), inches: value % INCHES_PER_FOOT });
  return (
    <Page page={page} changed={fields !== null && picked !== null && picked !== page.profile?.heightCm} onSave={() => picked !== null && page.save((p) => ({ ...p, heightCm: picked }))}>
      {shown !== null && (
        <View style={styles.wheels}>
          <Wheel
            label={t('settings.profile.height')}
            unit={metric ? t('units.cmUnit') : undefined}
            values={heightValues(system)}
            value={heightOnWheel(shown, system)}
            format={format}
            onChange={(value) => setFields(heightFromWheel(value, system, shown))}
            quiet
          />
        </View>
      )}
    </Page>
  );
}

export function BornEditor() {
  const page = useProfilePage();
  const [chosen, setChosen] = useState<number | null>(null);
  const years = yearValues(new Date().getFullYear());
  const current = page.profile?.birthYear;
  const picked = chosen ?? (current !== undefined && years.includes(current) ? current : years[years.length - 1]);
  return (
    <Page page={page} changed={chosen !== null && chosen !== current} onSave={() => page.save((p) => ({ ...p, birthYear: picked }))}>
      <View style={styles.wheels}>
        <Wheel label={t('settings.profile.born')} unit={t('onboarding.about.year')} values={years} value={picked} format={String} onChange={setChosen} quiet />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  wheels: { flexDirection: 'row' },
  note: { fontSize: tokens.type.bodySmall },
});
