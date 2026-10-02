import { useRef, useState, useSyncExternalStore } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { notificationParams as P } from '@/notifications/params';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

const nameOf = (error: unknown) => (error instanceof Error ? error.name : 'Unknown');

/** What came of "Turn on": on; iOS saying no for good (only iOS Settings can allow them now); or not kept. */
type Outcome = 'on' | 'refused' | 'failed';
const SAID: Record<Outcome, string> = { on: 'onboarding.reminders.on', refused: 'onboarding.reminders.refused', failed: 'settings.reminders.failed' };

/**
 * The reminders, offered once in onboarding (K-434, ADR-037 #51, ADR-036): the three kinds said before iOS asks (its
 * sheet shows once), and the user's own routine sentence — set where the rhythm of the week is told (I1 C3, F1 step
 * 10). On What to expect, not a screen of its own: the walk stays within 12 screens with the look and the AI consent
 * still to come (I1 F1). "Turn on" keeps the sentence and asks iOS through the same service as Settings; going on
 * without it asks nothing and keeps nothing — a sentence typed says so. Reminders already on (the step opened again)
 * are said, not offered. iOS saying no for good leaves the way to iOS Settings, never a button that does nothing; iOS
 * not deciding yet (its sheet can still show) leaves the button. Nothing here holds onboarding up: a failure is said
 * and reported.
 */
export function RemindersOffer() {
  const { reminders, report } = useAppServices();
  const settings = useSyncExternalStore(reminders.subscribe, reminders.current);
  const { color } = useTheme();
  const [cue, setCue] = useState('');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // A ref, not state: two taps in the same moment both see state from before either ran, a ref they share.
  const working = useRef(false);

  async function turnOn() {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    try {
      if (cue.trim() !== '') await reminders.setCue(cue);
      const answer = await reminders.turnOn();
      setOutcome(answer.granted ? 'on' : answer.canAskAgain ? null : 'refused');
    } catch (error) {
      report({ name: nameOf(error) });
      setOutcome('failed');
    } finally {
      working.current = false;
      setBusy(false);
    }
  }

  const shown: Outcome | null = settings.enabled ? 'on' : outcome;
  const said = shown === null ? null : <Text style={[styles.text, { color: color.text }]}>{t(SAID[shown])}</Text>;
  const keptOnlyOn = cue.trim() === '' ? null : <Text style={[styles.note, { color: color.muted }]}>{t('onboarding.reminders.cueKeptOnlyOn')}</Text>;
  const offer =
    shown === 'on' ? null : shown === 'refused' ? (
      <Button label={t('settings.reminders.openSettings')} variant="ghost" onPress={() => void Linking.openSettings()} />
    ) : (
      <>
        <TextField
          label={t('settings.reminders.cue.label')}
          value={cue}
          onChangeText={setCue}
          hint={t('settings.reminders.cue.hint')}
          maxLength={P.cueMaxChars}
        />
        {keptOnlyOn}
        <Button label={t('settings.reminders.turnOn')} variant="ghost" onPress={() => void turnOn()} disabled={busy} />
      </>
    );
  return (
    <View style={[styles.block, { borderTopColor: color.line }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: color.text }]}>
        {t('onboarding.reminders.title')}
      </Text>
      <Text style={[styles.note, { color: color.muted }]}>{t('settings.reminders.what', { minutes: P.trainingLeadMinutes })}</Text>
      {said}
      {offer}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { borderTopWidth: tokens.border.hairline, paddingTop: tokens.space.md, gap: tokens.space.sm },
  title: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  text: { fontSize: tokens.type.body },
  note: { fontSize: tokens.type.bodySmall },
});
