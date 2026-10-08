/**
 * The Monday morning offer on the plan (ADR-072 #6, K-434's place): one switch for the check-in morning reminder alone
 * (K-410, ADR-036; the other two kinds stay off, Settings turns them on), through
 * the same service as Settings — iOS is asked on the switch, never before. iOS saying no for good is said (only iOS
 * Settings can allow them then); a failure is said and reported, and never holds the plan up. Already on: shown on.
 */
import { useRef, useState, useSyncExternalStore } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

const nameOf = (error: unknown) => (error instanceof Error ? error.name : 'Unknown');

export function MondayReminder({ day }: { day: string }) {
  const { reminders, report } = useAppServices();
  const settings = useSyncExternalStore(reminders.subscribe, reminders.current);
  const { color } = useTheme();
  const [note, setNote] = useState<'refused' | 'failed' | null>(null);
  const [busy, setBusy] = useState(false);
  // A ref, not state: two flips in the same moment both see state from before either ran, a ref they share.
  const working = useRef(false);

  async function flip(on: boolean) {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setNote(null);
    try {
      if (!on) await reminders.turnOff();
      else {
        const answer = await reminders.turnOn({ only: 'check_in' });
        if (!answer.granted && !answer.canAskAgain) setNote('refused');
      }
    } catch (error) {
      report({ name: nameOf(error) });
      setNote('failed');
    } finally {
      working.current = false;
      setBusy(false);
    }
  }

  const label = t('onboarding.plan.remind', { day });
  const said = note === null ? null : (
    <Text style={[styles.note, { color: color.muted }]}>{t(note === 'refused' ? 'onboarding.reminders.refused' : 'settings.reminders.failed')}</Text>
  );
  return (
    <View style={styles.block}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: color.text }]}>{label}</Text>
        <Switch accessibilityLabel={label} value={settings.enabled} disabled={busy} onValueChange={(on) => void flip(on)} />
      </View>
      {said}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: tokens.space.xs },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: tokens.size.touch, gap: tokens.space.sm },
  label: { flex: 1, fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  note: { fontSize: tokens.type.bodySmall },
});
