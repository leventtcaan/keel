import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { ProblemText } from '@/components/ProblemText';
import { t } from '@/copy';
import { useAppearance, useAppServices } from '@/services/ServicesProvider';
import type { Appearance } from '@/theme/appearance';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { Section } from './Section';
import { useAction } from './useAction';

const CHOICES: Appearance[] = ['light', 'dark', 'system'];

/** Light, Dark or System, Light until the person picks (ADR-070 #3); kept on the phone, the whole app follows at once. */
export function AppearanceSection() {
  const { appearance } = useAppServices();
  const chosen = useAppearance();
  const { color } = useTheme();
  const { problem, run } = useAction();
  const choose = (next: Appearance) => void run(() => appearance.set(next), {}, 'settings.appearance.failed');
  return (
    <Section title={t('settings.appearance.title')}>
      <View style={styles.row}>
        {CHOICES.map((choice) => (
          <Chip key={choice} label={t(`settings.appearance.${choice}`)} selected={chosen === choice} onPress={() => choose(choice)} />
        ))}
      </View>
      {problem !== null && <ProblemText style={[styles.note, { color: color.text }]}>{problem}</ProblemText>}
    </Section>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  note: { fontSize: tokens.type.bodySmall },
});
