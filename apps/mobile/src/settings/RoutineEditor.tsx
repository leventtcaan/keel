import { router } from 'expo-router';
import { useState, useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ProblemText } from '@/components/ProblemText';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { notificationParams as P } from '@/notifications/params';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { useAction } from './useAction';

/** The sentences offered to tap (copy `settings.reminders.cue.options.<id>`); the field below holds whichever is chosen or typed. */
const SUGGESTIONS = ['afterWork', 'beforeWork', 'lunch', 'morning'] as const;

/**
 * Settings › Your routine (K-410, ADR-036, I1 C3; chips, K-1062): the page behind the reminders row. One line on what the
 * words are for, a few sentences to tap, and the field they fill for anyone who would rather write their own. That sentence
 * is the training reminder's words. Saved, the page closes; the row on Settings shows the sentence.
 */
export function RoutineEditor() {
  const { reminders } = useAppServices();
  const settings = useSyncExternalStore(reminders.subscribe, reminders.current);
  const { color } = useTheme();
  const { busy, problem, run } = useAction();
  const [cue, setCue] = useState(settings.cue);
  const saveCue = () =>
    void run(
      async () => {
        await reminders.setCue(cue);
        router.back();
      },
      {},
      'settings.reminders.failed',
    );
  const suggestions = SUGGESTIONS.map((id) => {
    const words = t(`settings.reminders.cue.options.${id}`);
    return <Chip key={id} label={words} selected={cue.trim() === words} touch onPress={() => setCue(cue.trim() === words ? '' : words)} />;
  });
  return (
    <View style={styles.stack}>
      <Text style={[styles.note, { color: color.muted }]}>{t('settings.reminders.cue.hint')}</Text>
      <View style={styles.chips}>{suggestions}</View>
      <TextField label={t('settings.reminders.cue.label')} value={cue} onChangeText={setCue} maxLength={P.cueMaxChars} />
      <Button
        label={t('settings.reminders.cue.save')}
        accessibilityLabel={t('settings.reminders.cue.saveLabel')}
        disabled={busy || cue.trim() === settings.cue}
        onPress={saveCue}
      />
      {problem !== null && <ProblemText style={[styles.note, { color: color.text }]}>{problem}</ProblemText>}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  note: { fontSize: tokens.type.bodySmall },
});
