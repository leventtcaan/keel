import { useState, useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { t } from '@/copy';
import type { HealthWriteSettings } from '@/health/healthWrite';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { Section } from './Section';
import { useAction } from './useAction';

type Switch = keyof HealthWriteSettings;
const ROWS: { which: Switch; labelKey: string; hintKey?: string }[] = [
  { which: 'workouts', labelKey: 'settings.healthWrite.workouts', hintKey: 'settings.healthWrite.workoutsHint' },
  { which: 'weighIns', labelKey: 'settings.healthWrite.weighIns' },
];

/**
 * Add to Apple Health (K-412, ADR-018 §1, ADR-031): the write switches, apart from the read consent and from each
 * other. Each is off until turned on, and turning on asks iOS; if iOS does not allow it, it stays off and says where to
 * allow it. Where HealthKit is not in the build (Expo Go), it says so.
 */
export function HealthWriteSection() {
  const { health, healthWriting } = useAppServices();
  const settings = useSyncExternalStore(healthWriting.subscribe, healthWriting.current);
  const { color } = useTheme();
  const { busy, problem, run } = useAction();
  const [refused, setRefused] = useState(false);

  const turnOn = (which: Switch) =>
    void run(async () => setRefused(!(await healthWriting.turnOn(which))), {}, 'settings.healthWrite.failed');
  const turnOff = (which: Switch) =>
    void run(
      async () => {
        setRefused(false);
        await healthWriting.turnOff(which);
      },
      {},
      'settings.healthWrite.failed',
    );

  if (!health.available) {
    return (
      <Section title={t('settings.healthWrite.title')}>
        <Text style={[styles.note, { color: color.muted }]}>{t('settings.healthWrite.unavailable')}</Text>
      </Section>
    );
  }
  return (
    <Section title={t('settings.healthWrite.title')}>
      <Text style={[styles.note, { color: color.muted }]}>{t('settings.healthWrite.note')}</Text>
      {ROWS.map((row) => (
        <WriteRow key={row.which} {...row} on={settings[row.which]} busy={busy} onTurnOn={() => turnOn(row.which)} onTurnOff={() => turnOff(row.which)} />
      ))}
      {refused && <Text style={[styles.note, { color: color.text }]}>{t('settings.healthWrite.refused')}</Text>}
      {problem !== null && <Text style={[styles.note, { color: color.text }]}>{problem}</Text>}
    </Section>
  );
}

type RowProps = { labelKey: string; hintKey?: string; on: boolean; busy: boolean; onTurnOn: () => void; onTurnOff: () => void };

function WriteRow({ labelKey, hintKey, on, busy, onTurnOn, onTurnOff }: RowProps) {
  const { color } = useTheme();
  const what = t(labelKey);
  return (
    <View style={styles.row}>
      <View style={styles.words}>
        <Text style={[styles.label, { color: color.text }]}>{what}</Text>
        {hintKey !== undefined && <Text style={[styles.note, { color: color.muted }]}>{t(hintKey)}</Text>}
        {on && <Text style={[styles.note, { color: color.muted }]}>{t('settings.healthWrite.on')}</Text>}
      </View>
      {on ? <OffButton what={what} busy={busy} onPress={onTurnOff} /> : <OnButton what={what} busy={busy} onPress={onTurnOn} />}
    </View>
  );
}

function OnButton({ what, busy, onPress }: { what: string; busy: boolean; onPress: () => void }) {
  return (
    <Button
      label={t('settings.healthWrite.turnOn')}
      accessibilityLabel={t('settings.healthWrite.turnOnLabel', { what })}
      size="sm"
      disabled={busy}
      onPress={onPress}
    />
  );
}

function OffButton({ what, busy, onPress }: { what: string; busy: boolean; onPress: () => void }) {
  return (
    <Button
      label={t('settings.healthWrite.turnOff')}
      accessibilityLabel={t('settings.healthWrite.turnOffLabel', { what })}
      variant="ghost"
      size="sm"
      disabled={busy}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space.md },
  words: { flex: 1, gap: tokens.space.xs },
  label: { fontSize: tokens.type.body },
  note: { fontSize: tokens.type.bodySmall },
});
