import { router } from 'expo-router';
import { useState, useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ProblemText } from '@/components/ProblemText';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { notificationParams as P } from '@/notifications/params';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { useAction } from './useAction';

/**
 * Settings › Your routine (K-410, ADR-036, I1 C3): the page behind the reminders row. First what the three kinds are, said
 * in full (iOS shows its permission sheet once, and this is what the switch on Settings asks about), then the user's own
 * sentence, the training reminder's words. Saved, the page closes; the row on Settings shows the sentence.
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
  return (
    <View style={styles.stack}>
      <Text style={[styles.note, { color: color.muted }]}>{t('settings.reminders.what', { minutes: P.trainingLeadMinutes })}</Text>
      <TextField label={t('settings.reminders.cue.label')} value={cue} onChangeText={setCue} hint={t('settings.reminders.cue.hint')} maxLength={P.cueMaxChars} />
      <Button
        label={t('settings.reminders.cue.save')}
        accessibilityLabel={t('settings.reminders.cue.saveLabel')}
        size="touch"
        disabled={busy || cue.trim() === settings.cue}
        onPress={saveCue}
      />
      {problem !== null && <ProblemText style={[styles.note, { color: color.text }]}>{problem}</ProblemText>}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space.md },
  note: { fontSize: tokens.type.bodySmall },
});
