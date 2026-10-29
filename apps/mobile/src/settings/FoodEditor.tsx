import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ProblemText } from '@/components/ProblemText';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { avoidList } from '@/onboarding/draft';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { load } from '@/today/today';

import { useAction } from './useAction';
import { useHealthConsent } from './useHealthConsent';

/**
 * Settings › Foods you avoid (K-982, ADR-069 #3): the page behind the Food row. The foods are read from the profile when the
 * health data consent is given (without it the page says what it needs and asks the profile for nothing, K-225), edited as
 * one comma-separated line in the user's own words, and saved as the whole profile with the new list, the rest of it as the
 * server just gave it (the same way as the units, K-310). Saved, the page closes; Settings shows the new list on return.
 */
export function FoodEditor() {
  const { api } = useAppServices();
  const { color } = useTheme();
  const granted = useHealthConsent();
  const { busy, problem, run } = useAction();
  // null: not read yet. The line as typed; what was typed stays when a save fails, to try again.
  const [typed, setTyped] = useState<string | null>(null);
  const [unread, setUnread] = useState(false);

  useEffect(() => {
    if (granted !== true) return;
    let live = true; // an answer after the consent went, or the page closed, changes nothing
    void load(() => api.GET('/v1/profile')).then((read) => {
      if (!live) return;
      if (read.state === 'ready') setTyped((read.value.food?.avoid ?? []).join(t('editProgram.listJoin')));
      else setUnread(true);
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
        router.back();
      },
      {},
      'settings.food.failed',
    );

  if (granted === false) return <Text style={[styles.note, { color: color.muted }]}>{t('settings.food.locked')}</Text>;
  if (unread) return <Text style={[styles.note, { color: color.muted }]}>{t('settings.food.unread')}</Text>;
  if (typed === null) return null;
  return (
    <View style={styles.editor}>
      <TextField label={t('settings.food.label')} value={typed} onChangeText={setTyped} hint={t('settings.food.hint')} />
      <View style={styles.buttons}>
        <Button label={t('settings.food.save')} size="touch" disabled={busy} onPress={save} />
        <Button label={t('settings.food.cancel')} variant="secondary" size="touch" disabled={busy} onPress={() => router.back()} />
      </View>
      {problem !== null && <ProblemText style={styles.problem}>{problem}</ProblemText>}
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { gap: tokens.space.sm },
  buttons: { flexDirection: 'row', gap: tokens.space.sm },
  note: { fontSize: tokens.type.bodySmall },
  problem: { fontSize: tokens.type.bodySmall },
});
