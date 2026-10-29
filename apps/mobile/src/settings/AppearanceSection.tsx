import { StyleSheet } from 'react-native';

import { ProblemText } from '@/components/ProblemText';
import { Segmented } from '@/components/Segmented';
import { t } from '@/copy';
import { useAppearance, useAppServices } from '@/services/ServicesProvider';
import type { Appearance } from '@/theme/appearance';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { Section } from './Section';
import { useAction } from './useAction';

const CHOICES: Appearance[] = ['light', 'dark', 'system'];

/**
 * Light, Dark or System as one segmented control, Light until the person picks (ADR-070 #3, Ek 2 #2); kept on the phone, the
 * whole app follows at once.
 */
export function AppearanceSection() {
  const { appearance } = useAppServices();
  const chosen = useAppearance();
  const { color } = useTheme();
  const { problem, run } = useAction();
  const choose = (next: Appearance) => void run(() => appearance.set(next), {}, 'settings.appearance.failed');
  return (
    <Section title={t('settings.appearance.title')}>
      <Segmented options={CHOICES.map((choice) => ({ value: choice, label: t(`settings.appearance.${choice}`) }))} value={chosen} onChange={choose} />
      {problem !== null && <ProblemText style={[styles.note, { color: color.text }]}>{problem}</ProblemText>}
    </Section>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: tokens.type.bodySmall },
});
