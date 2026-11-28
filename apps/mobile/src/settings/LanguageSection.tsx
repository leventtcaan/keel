import { StyleSheet } from 'react-native';

import { t } from '@/copy';
import { LANGUAGES, type Language } from '@/copy/locales';
import { ProblemText } from '@/components/ProblemText';
import { WordChoice } from '@/components/WordChoice';
import { useAppServices, useLanguage } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { Section } from './Section';
import { useAction } from './useAction';

/**
 * System, English or Türkçe as one segmented control, System until the person picks (K-1211, ADR-091); kept on the phone,
 * the whole app follows at once. The names of the languages are their own, whatever language shows.
 */
export function LanguageSection() {
  const { language } = useAppServices();
  const chosen = useLanguage();
  const { color } = useTheme();
  const { problem, run } = useAction();
  const choose = (next: Language) => void run(() => language.set(next), {}, 'settings.language.failed');
  return (
    <Section title={t('settings.language.title')}>
      <WordChoice options={LANGUAGES.map((choice) => ({ value: choice, label: t(`settings.language.${choice}`) }))} value={chosen} onChange={choose} />
      {problem !== null && <ProblemText style={[styles.note, { color: color.text }]}>{problem}</ProblemText>}
    </Section>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: tokens.type.bodySmall },
});
