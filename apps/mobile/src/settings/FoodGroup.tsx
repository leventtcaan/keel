import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ProblemText } from '@/components/ProblemText';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { avoidList } from '@/onboarding/draft';
import { useAppServices } from '@/services/ServicesProvider';
import { tokens } from '@/theme/tokens';
import { load } from '@/today/today';

import { Section } from './Section';
import { SettingsRow } from './SettingsRow';
import { useAction } from './useAction';

/** The list as the profile holds it, or why there is none to show. Never "none" for a list that was not read. */
type Foods = 'loading' | 'failed' | string[];

/**
 * Settings › Food (K-982, ADR-069 #3; moved here from onboarding): the foods the user does not or cannot eat, in their own
 * words. They can say something about health (an allergy), so they are kept and shown only with the health data consent
 * (FoodPreferences.avoid, K-225): without it the row is locked and the profile is not asked for them. Saved as the whole
 * profile with the new list, the rest of it as the server just gave it (the same way as the units, K-310).
 */
export function FoodGroup({ granted }: { granted: boolean | null }) {
  // Keyed by the consent: when it goes or comes back, what was read and typed under the last yes is dropped with the
  // component, so a yes given again starts from a read, never from the old list (the server deleted it, K-231).
  return (
    <Section title={t('settings.food.title')}>
      <FoodRows key={String(granted === true)} granted={granted} />
    </Section>
  );
}

function FoodRows({ granted }: { granted: boolean | null }) {
  const { api } = useAppServices();
  const { busy, problem, run } = useAction();
  const [foods, setFoods] = useState<Foods>('loading');
  const [typed, setTyped] = useState<string | null>(null); // null: the editor is closed

  useEffect(() => {
    if (granted !== true) return;
    let live = true; // an answer after the consent went, or Settings closed, changes nothing
    void load(() => api.GET('/v1/profile')).then((read) => {
      if (live) setFoods(read.state === 'ready' ? (read.value.food?.avoid ?? []) : 'failed');
    });
    return () => {
      live = false;
    };
  }, [api, granted]);

  const save = () =>
    void run(
      async () => {
        const read = await api.GET('/v1/profile');
        if (read.data === undefined) throw new Error(`profile read failed with HTTP ${read.response.status}`);
        const put = await api.PUT('/v1/profile', { body: { ...read.data, food: { ...read.data.food, avoid: avoidList(typed ?? '') } } });
        if (put.data === undefined) throw new Error(`profile update failed with HTTP ${put.response.status}`);
        setFoods(put.data.food?.avoid ?? []);
        setTyped(null);
      },
      {},
      'settings.food.failed',
    );

  const label = t('settings.food.avoid');
  let row = null;
  if (granted === false) row = <SettingsRow label={label} value={t('settings.food.locked')} disabled />;
  else if (granted === true && foods === 'failed') row = <SettingsRow label={label} value={t('settings.food.unread')} disabled />;
  else if (granted === true && typeof foods !== 'string') {
    const list = foods.join(t('editProgram.listJoin'));
    row = <SettingsRow label={label} value={foods.length === 0 ? t('settings.food.none') : list} onPress={() => setTyped(typed === null ? list : null)} />;
  }
  const editor =
    granted === true && typed !== null ? (
      <View style={styles.editor}>
        <TextField label={t('settings.food.label')} value={typed} onChangeText={setTyped} hint={t('settings.food.hint')} />
        <View style={styles.buttons}>
          <Button label={t('settings.food.save')} size="touch" disabled={busy} onPress={save} />
          <Button label={t('settings.food.cancel')} variant="ghost" size="touch" disabled={busy} onPress={() => setTyped(null)} />
        </View>
        {problem !== null && <ProblemText style={styles.problem}>{problem}</ProblemText>}
      </View>
    ) : null;
  return (
    <>
      {row}
      {editor}
    </>
  );
}

const styles = StyleSheet.create({
  editor: { gap: tokens.space.sm },
  buttons: { flexDirection: 'row', gap: tokens.space.sm },
  problem: { fontSize: tokens.type.bodySmall },
});
