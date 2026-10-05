import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, Linking, StyleSheet, Text, View } from 'react-native';

import { ProblemText } from '@/components/ProblemText';
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

  // iOS's answer, read on arrival and each time the app comes back to the front — the way back from iOS Settings. An
  // older, slower read never overwrites a newer one; a read that fails leaves what is shown.
  const reads = useRef(0);
  useEffect(() => {
    const read = () => {
      const mine = ++reads.current;
      reminders.permission().then(
        (answer) => mine === reads.current && setPermission(answer),
        () => undefined,
      );
    };
    read();
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && read());
    return () => {
      reads.current += 1; // a read still on its way lands on nothing
      subscription.remove();
    };
  }, [reminders]);

  const turnOn = () =>
    void run(
      async () => {
        const answer = await reminders.turnOn();
        reads.current += 1; // the sheet's answer is the newest
        setPermission(answer);
      },
      {},
      'settings.reminders.failed',
    );
  const turnOff = () => void run(() => reminders.turnOff(), {}, 'settings.reminders.failed');
  const saveCue = () => void run(() => reminders.setCue(cue), {}, 'settings.reminders.failed');

  const on = settings.enabled && permission?.granted === true;
  const blocked = permission !== null && !permission.granted && !permission.canAskAgain;
  const muted = { color: color.muted };

  return (
    <Section title={t('settings.reminders.title')}>
      <Text style={[styles.note, muted]}>{t('settings.reminders.what', { minutes: P.trainingLeadMinutes })}</Text>
      {on ? <OnRow busy={busy} onTurnOff={turnOff} /> : blocked ? <Blocked /> : <Button label={t('settings.reminders.turnOn')} disabled={busy} onPress={turnOn} />}
      <TextField
        label={t('settings.reminders.cue.label')}
        value={cue}
        onChangeText={setCue}
        hint={t('settings.reminders.cue.hint')}
        maxLength={P.cueMaxChars}
      />
      <Button
        label={t('settings.reminders.cue.save')}
        accessibilityLabel={t('settings.reminders.cue.saveLabel')}
        variant="ghost"
        size="sm"
        disabled={busy || cue.trim() === settings.cue}
        onPress={saveCue}
      />
      {problem !== null && <ProblemText style={[styles.note, { color: color.text }]}>{problem}</ProblemText>}
    </Section>
  );
}

function OnRow({ busy, onTurnOff }: { busy: boolean; onTurnOff: () => void }) {
  const { color } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.state, { color: color.text }]}>{t('settings.reminders.on')}</Text>
      <Button
        label={t('settings.reminders.turnOff')}
        accessibilityLabel={t('settings.reminders.turnOffLabel')}
        variant="ghost"
        size="sm"
        disabled={busy}
        onPress={onTurnOff}
      />
    </View>
  );
}

/** iOS will not show its sheet again: only iOS Settings can allow notifications now. */
function Blocked() {
  const { color } = useTheme();
  return (
    <>
      <Text style={[styles.note, { color: color.text }]}>{t('settings.reminders.blocked')}</Text>
      <Button label={t('settings.reminders.openSettings')} variant="ghost" onPress={() => void Linking.openSettings()} />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  state: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  note: { fontSize: tokens.type.bodySmall },
});
