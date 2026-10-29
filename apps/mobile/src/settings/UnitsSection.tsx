import { StyleSheet, Text } from 'react-native';

import { ProblemText } from '@/components/ProblemText';
import { Segmented } from '@/components/Segmented';
import { t } from '@/copy';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import type { UnitSystem } from '@/units/units';

import { Section } from './Section';
import { useAction } from './useAction';

const SYSTEMS: { value: UnitSystem; key: string }[] = [
  { value: 'METRIC', key: 'settings.units.metric' },
  { value: 'IMPERIAL', key: 'settings.units.imperial' },
];

/** The unit system, stored on the profile (K-310): a choice that does not reach the server is not half-made. */
export function UnitsSection() {
  const { units } = useAppServices();
  const system = useUnits();
  const { color } = useTheme();
  const { problem, run } = useAction();
  const choose = (next: UnitSystem) => void run(() => units.set(next).then(() => undefined), {}, 'settings.units.failed');
  return (
    <Section title={t('settings.units.title')}>
      <Segmented options={SYSTEMS.map((s) => ({ value: s.value, label: t(s.key) }))} value={system} onChange={choose} />
      {problem === null ? (
        <Text style={[styles.note, { color: color.muted }]}>{t('settings.units.note')}</Text>
      ) : (
        <ProblemText style={[styles.note, { color: color.text }]}>{problem}</ProblemText>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  note: { marginHorizontal: tokens.space.xs, fontSize: tokens.type.label },
});
