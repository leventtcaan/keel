import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { AccountSection } from '@/settings/AccountSection';
import { ConsentsSection } from '@/settings/ConsentsSection';
import { UnitsSection } from '@/settings/UnitsSection';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * Settings (K-309, prototype 5.2), opened from Today. Notifications (K-410) and the subscription (K-702) join when
 * those exist.
 */
export default function SettingsScreen() {
  const { color } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('settings.back')} onPress={() => router.back()} hitSlop={tokens.space.md}>
          <Text style={[styles.back, { color: color.text }]}>{`${t('settings.backMark')} ${t('settings.back')}`}</Text>
        </Pressable>
        <ScreenTitle>{t('settings.title')}</ScreenTitle>
        <UnitsSection />
        <ConsentsSection />
        <AccountSection />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  back: { fontSize: tokens.type.body },
  body: { paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.md, gap: tokens.space.xl },
});
