import { useEffect, useReducer, useState, useSyncExternalStore } from 'react';
import { AppState, StyleSheet, Text } from 'react-native';

import { ProblemText } from '@/components/ProblemText';
import { ListGroup, ListRow } from '@/components/ListGroup';
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
 * other, as iOS switches in a grouped list (K-1062). Each is off until turned on, and turning on asks iOS; if iOS does not
 * allow it, it stays off and says where to allow it. Where HealthKit is not in the build (Expo Go), it says so.
 */
export function HealthWriteSection({ bare = false }: { bare?: boolean } = {}) {
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
      <Section title={bare ? undefined : t('settings.healthWrite.title')}>
        <Text style={[styles.note, { color: color.muted }]}>{t('settings.healthWrite.unavailable')}</Text>
      </Section>
    );
  }
  return (
    <Section title={bare ? undefined : t('settings.healthWrite.title')}>
      <Text style={[styles.note, { color: color.muted }]}>{t('settings.healthWrite.note')}</Text>
      <ListGroup>
        {ROWS.map((row) => {
          const what = t(row.labelKey);
          return (
            <ListRow
              key={row.which}
              label={what}
              detail={row.hintKey === undefined ? undefined : t(row.hintKey)}
              accessibilityLabel={t('settings.healthWrite.switchLabel', { what })}
              switch={{ value: healthWriting.shown(row.which) === 'on', onValueChange: (next) => (next ? turnOn(row.which) : turnOff(row.which)) }}
              disabled={busy}
            />
          );
        })}
      </ListGroup>
      {(refused || ROWS.some((row) => healthWriting.shown(row.which) === 'refused')) && (
        <Text style={[styles.note, { color: color.text }]}>{t('settings.healthWrite.refused')}</Text>
      )}
      {problem !== null && <ProblemText style={[styles.note, { color: color.text }]}>{problem}</ProblemText>}
    </Section>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: tokens.type.bodySmall },
});
