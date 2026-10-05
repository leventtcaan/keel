import { useEffect, useReducer, useState, useSyncExternalStore } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

import { ProblemText } from '@/components/ProblemText';
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
  // iOS's answer can change in the Health app: what each switch shows is read again when the app comes to the front.
  const [, recheck] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && recheck());
    return () => subscription.remove();
  }, []);
  void settings; // re-rendered on every switch change; `shown` reads the switch and iOS together

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
        <WriteRow
          key={row.which}
          {...row}
          shown={healthWriting.shown(row.which)}
          busy={busy}
          onTurnOn={() => turnOn(row.which)}
          onTurnOff={() => turnOff(row.which)}
        />
      ))}
      {(refused || ROWS.some((row) => healthWriting.shown(row.which) === 'refused')) && (
        <Text style={[styles.note, { color: color.text }]}>{t('settings.healthWrite.refused')}</Text>
      )}
      {problem !== null && <ProblemText style={[styles.note, { color: color.text }]}>{problem}</ProblemText>}
    </Section>
  );
}

type RowProps = {
  labelKey: string;
  hintKey?: string;
  shown: 'off' | 'on' | 'refused';
  busy: boolean;
  onTurnOn: () => void;
  onTurnOff: () => void;
};

/** Off: "Turn on". On: "On" and "Turn off". On but refused by iOS since: no "On", and "Turn off" to clear it. */
function WriteRow({ labelKey, hintKey, shown, busy, onTurnOn, onTurnOff }: RowProps) {
  const on = shown === 'on';
  const off = shown === 'off';
  const { color } = useTheme();
  const what = t(labelKey);
  return (
    <View style={styles.row}>
      <View style={styles.words}>
        <Text style={[styles.label, { color: color.text }]}>{what}</Text>
        {hintKey !== undefined && <Text style={[styles.note, { color: color.muted }]}>{t(hintKey)}</Text>}
        {on && <Text style={[styles.note, { color: color.muted }]}>{t('settings.healthWrite.on')}</Text>}
      </View>
      {off ? <OnButton what={what} busy={busy} onPress={onTurnOn} /> : <OffButton what={what} busy={busy} onPress={onTurnOff} />}
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
