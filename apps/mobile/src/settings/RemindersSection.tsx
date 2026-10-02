import { useEffect, useState, useSyncExternalStore } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { notificationParams as P } from '@/notifications/params';
import type { NotificationPermission } from '@/notifications/reminders';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { Section } from './Section';
import { useAction } from './useAction';

/**
 * The reminders (K-410, ADR-036): what the three kinds are, said before iOS asks (iOS shows its sheet once); on and off;
 * the way to iOS Settings when iOS has said no for good; and the user's own routine sentence, the training reminder's
 * words (I1 C3). "On" is shown only when iOS allows it too — never a switch that does nothing.
 */
export function RemindersSection() {
  const { reminders } = useAppServices();
  const settings = useSyncExternalStore(reminders.subscribe, reminders.current);
  const { color } = useTheme();
  const { busy, problem, run } = useAction();
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [cue, setCue] = useState(settings.cue);

  useEffect(() => {
    let alive = true;
    reminders.permission().then(
      (answer) => alive && setPermission(answer),
      () => undefined, // unknown: shown as not allowed until a tap asks again
    );
    return () => {
      alive = false;
    };
  }, [reminders]);

  const turnOn = () => void run(async () => setPermission(await reminders.turnOn()), {}, 'settings.reminders.failed');
  const turnOff = () => void run(() => reminders.turnOff(), {}, 'settings.reminders.failed');
  const saveCue = () => void run(() => reminders.setCue(cue), {}, 'settings.reminders.failed');

  const on = settings.enabled && permission?.granted === true;
  // iOS will not show its sheet again: only iOS Settings can allow it now.
  const blocked = permission !== null && !permission.granted && !permission.canAskAgain;
  const muted = { color: color.muted };

  return (
    <Section title={t('settings.reminders.title')}>
      <Text style={[styles.note, muted]}>{t('settings.reminders.what', { minutes: P.trainingLeadMinutes })}</Text>
      {on ? (
        <View style={styles.row}>
          <Text style={[styles.state, { color: color.text }]}>{t('settings.reminders.on')}</Text>
          <Button label={t('settings.reminders.turnOff')} variant="ghost" size="sm" disabled={busy} onPress={turnOff} />
        </View>
      ) : blocked ? (
        <>
          <Text style={[styles.note, { color: color.text }]}>{t('settings.reminders.blocked')}</Text>
          <Button label={t('settings.reminders.openSettings')} variant="ghost" onPress={() => void Linking.openSettings()} />
        </>
      ) : (
        <Button label={t('settings.reminders.turnOn')} disabled={busy} onPress={turnOn} />
      )}
      <TextField
        label={t('settings.reminders.cue.label')}
        value={cue}
        onChangeText={setCue}
        hint={t('settings.reminders.cue.hint')}
        maxLength={P.cueMaxChars}
      />
      <Button
        label={t('settings.reminders.cue.save')}
        variant="ghost"
        size="sm"
        disabled={busy || cue.trim() === settings.cue}
        onPress={saveCue}
      />
      {problem !== null && <Text style={[styles.note, { color: color.text }]}>{problem}</Text>}
    </Section>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  state: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  note: { fontSize: tokens.type.bodySmall },
});
