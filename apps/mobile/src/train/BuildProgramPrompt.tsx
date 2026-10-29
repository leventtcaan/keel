import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * The way out for an account with a profile and no program (K-1037, ADR-084): what to do, and the one action, which opens
 * the days question (build-program). Shown where the program would be: the Train tab, This week's training card, Edit program.
 */
export function BuildProgramPrompt() {
  const { color } = useTheme();
  return (
    <View style={styles.prompt}>
      <Text style={[styles.text, { color: color.textSecondary }]}>{t('buildProgram.line')}</Text>
      <Button label={t('buildProgram.action')} onPress={() => router.push('/build-program')} />
    </View>
  );
}

const styles = StyleSheet.create({
  prompt: { gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
});
