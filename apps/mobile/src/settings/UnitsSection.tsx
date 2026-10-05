import { StyleSheet, Text, View } from 'react-native';

import { ProblemText } from '@/components/ProblemText';
import { Chip } from '@/components/Chip';
import { t } from '@/copy';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import type { UnitSystem } from '@/units/units';

import { Section } from './Section';
import { useAction } from './useAction';

/** The unit system, stored on the profile (K-310): a choice that does not reach the server is not half-made. */
export function UnitsSection() {
  const { units } = useAppServices();
  const system = useUnits();
  const { color } = useTheme();
  const { problem, run } = useAction();
  const choose = (next: UnitSystem) => void run(() => units.set(next).then(() => undefined), {}, 'settings.units.failed');
  return (
    <Section title={t('settings.units.title')}>
      <View style={styles.row}>
        <Chip label={t('settings.units.metric')} selected={system === 'METRIC'} onPress={() => choose('METRIC')} />
        <Chip label={t('settings.units.imperial')} selected={system === 'IMPERIAL'} onPress={() => choose('IMPERIAL')} />
      </View>
      {problem === null ? (
        <Text style={[styles.note, { color: color.muted }]}>{t('settings.units.note')}</Text>
      ) : (
        <ProblemText style={[styles.note, { color: color.text }]}>{problem}</ProblemText>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  note: { fontSize: tokens.type.bodySmall },
});
