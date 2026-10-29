import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ProblemText } from '@/components/ProblemText';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { avoidList } from '@/onboarding/draft';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { load } from '@/today/today';

import { ConsentsSection } from './ConsentsSection';
import { COMMON_AVOIDS, has, toggled } from './foodChoices';
import { useProfileEdit } from './profileEdit';
import { useAction } from './useAction';
import { useHealthConsent } from './useHealthConsent';

/**
 * Settings › Foods you avoid (K-982, ADR-069 #3; chips, K-1062): the page behind the Food row. The foods are read from the
 * profile when the health data consent is given, and each is a chip to tap: the common ones to switch on or off, the user's
 * own beside them, and "Add your own" for one that is not there. Without the consent the page offers the consent right here
 * (a button, not a dead end) and asks the profile for nothing (K-225). One Save writes the list into the profile as it
 * stands on the server now (profileEdit.ts); saved, the page closes and Settings shows the new list on return.
 */
export function FoodEditor() {
  const { api } = useAppServices();
  const { color } = useTheme();
  const edit = useProfileEdit();
  // Counts up when the consent is given on this page, so the answer is read again.
  const [asked, setAsked] = useState(0);
  const granted = useHealthConsent(asked);
  const { busy, problem, run } = useAction();
  // null: not read yet. What stays when a save fails, to try again.
  const [kept, setKept] = useState<string[] | null>(null);
  const [start, setStart] = useState<string[]>([]);
  const [unread, setUnread] = useState(false);
  const [adding, setAdding] = useState(false);
  const [own, setOwn] = useState('');

  useEffect(() => {
    if (granted !== true) return;
    let live = true; // an answer after the consent went, or the page closed, changes nothing
    void load(() => api.GET('/v1/profile')).then((read) => {
      if (!live) return;
      if (read.state === 'ready') {
        const found = read.value.food?.avoid ?? [];
        setKept(found);
        setStart(found);
      } else setUnread(true);
    });
    return () => {
      live = false;
    };
  }, [api, granted]);

  const save = () =>
    void run(
      async () => {
        await edit((p) => ({ ...p, food: { ...p.food, avoid: kept ?? [] } }));
        router.back();
      },
      {},
      'settings.food.failed',
    );
  const addOwn = () => {
    const words = avoidList(own);
    setKept((now) => words.reduce((list, word) => (has(list, word) ? list : [...list, word]), now ?? []));
    setOwn('');
    setAdding(false);
  };

  if (granted === false) {
    return (
      <View style={styles.editor}>
        <Text style={[styles.note, { color: color.muted }]}>{t('settings.food.locked')}</Text>
        <ConsentsSection only="HEALTH_DATA" bare onChanged={() => setAsked((n) => n + 1)} />
      </View>
    );
  }
  if (unread) return <Text style={[styles.note, { color: color.muted }]}>{t('settings.food.unread')}</Text>;
  if (kept === null) return null;
  const common = COMMON_AVOIDS.map((food) => (
    <Chip key={food} label={t(`settings.food.common.${food}`)} selected={has(kept, food)} touch onPress={() => setKept(toggled(kept, food))} />
  ));
  // The user's own: every kept food that is not one of the common chips, tapped to take off.
  const mine = kept
    .filter((food) => !COMMON_AVOIDS.some((common) => common === food.toLowerCase()))
    .map((food) => <Chip key={food} label={food} selected touch onPress={() => setKept(toggled(kept, food))} />);
  const addField = adding ? (
    <View style={styles.add}>
      <TextField label={t('settings.food.label')} value={own} onChangeText={setOwn} maxLength={60} />
      <Button label={t('settings.food.add')} variant="secondary" size="touch" disabled={avoidList(own).length === 0} onPress={addOwn} />
    </View>
  ) : (
    <Chip label={t('settings.food.addOwn')} touch onPress={() => setAdding(true)} />
  );
  const changed = JSON.stringify([...kept].sort()) !== JSON.stringify([...start].sort());
  return (
    <View style={styles.editor}>
      <View style={styles.chips}>
        {common}
        {mine}
        {adding ? null : addField}
      </View>
      {adding ? addField : null}
      <Button label={t('settings.food.save')} disabled={busy || !changed} onPress={save} />
      {problem !== null && <ProblemText style={styles.note}>{problem}</ProblemText>}
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { gap: tokens.space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  add: { gap: tokens.space.sm },
  note: { fontSize: tokens.type.bodySmall },
});
