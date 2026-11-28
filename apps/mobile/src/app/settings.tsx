import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { SettingsContents } from '@/settings/SettingsContents';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * Settings (K-309, K-982, K-1062; ADR-094 Ek 9, K-1257), opened from This week: the contents of nine chapters, each a page of
 * its own (`settings-section`): Your week, You, Reminders, Health and data, Coach, Subscription, App, About and Account. Each
 * row is the chapter's name over what it holds today. The way back is the system's, in the header.
 */
export default function SettingsScreen() {
  const { color } = useTheme();
  return (
    <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{t('settings.title')}</ScreenTitle>
        <SettingsContents />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.md, gap: tokens.space.lg },
});
