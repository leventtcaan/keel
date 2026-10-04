import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Card } from '@/components/Card';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/** The way to the shape projection from Progress (K-606, prototype 4.5); it is off until turned on there. */
export function ProjectionEntry() {
  const { color } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t('projection.view.title')} onPress={() => router.push('/projection')}>
      <Card>
        <Text style={[styles.title, { color: color.text }]}>{t('projection.view.title')}</Text>
        <Text style={[styles.line, { color: color.muted }]}>{t('projection.view.entry')}</Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  line: { fontSize: tokens.type.bodySmall },
});
