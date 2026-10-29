import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ListGroup, ListRow } from '@/components/ListGroup';
import { ProblemText } from '@/components/ProblemText';
import { t } from '@/copy';
import type { NotificationPermission } from '@/notifications/reminders';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { openDetail } from './detail';
import { useAction } from './useAction';

/**
 * The reminders (K-410, ADR-036) as a grouped list: one switch, "Reminders", and the row "Your routine", which opens the page
 * with what the three kinds are and the user's own sentence (RoutineEditor). The line under the switch names the three kinds
 * in one line; the paragraph is on the routine page, in front of the sentence. When iOS has said no for good, or the
 * check-in morning is on alone, that line says so instead, with the step that fixes it. "On" is shown only when iOS allows
 * it too: never a switch that does nothing.
 */
export function RemindersSection() {
  const { reminders } = useAppServices();
  const settings = useSyncExternalStore(reminders.subscribe, reminders.current);
  const { color } = useTheme();
  const { busy, problem, run } = useAction();
  const [permission, setPermission] = useState<NotificationPermission | null>(null);

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

  // The check-in morning alone while the server makes no calls (K-992): nothing rings, so it is never shown as on.
  const waiting = settings.enabled && settings.only === 'check_in' && settings.noCalls === true;
  const on = settings.enabled && permission?.granted === true && !waiting;
  const blocked = permission !== null && !permission.granted && !permission.canAskAgain;

  // What the line under the switch says, and the one step that goes with it. The switch cannot do these two things.
  let footer = t('settings.reminders.kinds');
  let step: { label: string; opensSettings: boolean } | null = null;
  if (waiting && permission?.granted === true) {
    footer = t('settings.reminders.noCalls');
    step = { label: t('settings.reminders.turnOnAll'), opensSettings: false };
  } else if (blocked) {
    footer = t('settings.reminders.blocked');
    step = { label: t('settings.reminders.openSettings'), opensSettings: true };
  } else if (on && settings.only !== undefined) {
    // Turned on from the plan for the check-in morning alone (K-967): said, and the other two a tap away.
    footer = t('settings.reminders.onlyCheckIn');
    step = { label: t('settings.reminders.turnOnAll'), opensSettings: false };
  }

  // Built before the JSX: a literal inside a JSX child is read as text by the copy guard (copy-literals.test.ts).
  const stepButton =
    step === null ? null : (
      <Button label={step.label} variant="text" size="sm" disabled={busy} onPress={step.opensSettings ? () => void Linking.openSettings() : turnOn} />
    );
  return (
    <View style={styles.stack}>
      <ListGroup title={t('settings.reminders.title')} footer={footer} testID="group-reminders">
        <ListRow
          icon="bell"
          label={t('settings.reminders.title')}
          switch={{ value: on, onValueChange: (next) => (next ? turnOn() : turnOff()) }}
          disabled={busy}
        />
        <ListRow icon="clock" label={t('settings.reminders.routine')} value={settings.cue} navigates onPress={() => openDetail('routine')} />
      </ListGroup>
      {stepButton}
      {problem !== null && <ProblemText style={[styles.note, { color: color.text }]}>{problem}</ProblemText>}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space.sm },
  note: { fontSize: tokens.type.bodySmall },
});
