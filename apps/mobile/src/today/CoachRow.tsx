import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Icon } from '@/components/Icon';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * The coach beside what the user looks at (ADR-092 Ek 2 #1): under the week's call on This week, under what is left on today's food
 * (K-1237). One line, in the words of the coach's own box, that opens the coach about
 * this call (or on no call, while it is locked), its box ready to write in. Not a tab, and no ready questions here: they read
 * unrelated on this screen, so the coach offers them itself (ADR-092 Ek 2 #1). A sand line with the control edge (WCAG 1.4.11); no fill, the screen's one
 * petrol fill stays today's Start.
 */
export function CoachRow({ decisionId }: { decisionId?: string }) {
  const { color } = useTheme();
  return (
    <Pressable
      testID="coach-row"
      accessibilityRole="button"
      accessibilityLabel={t('coach.input')}
      onPress={() => router.push({ pathname: '/coach', params: decisionId === undefined ? { write: '1' } : { decisionId, write: '1' } })}
      style={({ pressed }) => [styles.box, { backgroundColor: color.tintDay, borderColor: color.edge }, pressed && styles.dim]}>
      <Text style={[styles.words, { color: color.muted }]}>{t('coach.input')}</Text>
      <Icon name="arrow.up.circle" tone="muted" size="small" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    minHeight: tokens.size.touch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: tokens.border.hairline,
    borderRadius: tokens.radius.button,
    paddingHorizontal: tokens.space.md,
  },
  words: { fontSize: tokens.type.body },
  dim: { opacity: tokens.opacity.dim },
});
