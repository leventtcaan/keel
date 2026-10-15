import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { AccountSection } from '@/settings/AccountSection';
import { AppearanceSection } from '@/settings/AppearanceSection';
import { FoodGroup } from '@/settings/FoodGroup';
import { HealthGroup } from '@/settings/HealthGroup';
import { RemindersSection } from '@/settings/RemindersSection';
import { SubscriptionSection } from '@/settings/SubscriptionSection';
import { TrainingGroup } from '@/settings/TrainingGroup';
import { UnitsSection } from '@/settings/UnitsSection';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * Whether the health data consent is given, as the phone knows it (ADR-030 #25): null until read. Unknown reads as not given.
 * `refresh` reads again, for when a consent was just changed on this screen.
 */
function useHealthConsent() {
  const { consents } = useAppServices();
  const [granted, setGranted] = useState<boolean | null>(null);
  const refresh = useCallback(() => void consents.granted('HEALTH_DATA').then(setGranted, () => setGranted(false)), [consents]);
  useEffect(refresh, [refresh]);
  return { granted, refresh };
}

/**
 * Settings (K-309, K-982; prototype `#settings`, ADR-069 #3, ADR-070 #3), opened from This week. Seven groups in one order:
 * Appearance (the theme, and the units), Training (days, cardio, gyms, the workout import), Food (what the user avoids),
 * Reminders (ADR-036: the three kinds, on or off, and the routine sentence), Health and data (the consents, Apple Health),
 * Subscription (K-702) and Account (export, delete, sign out). Food and Health and data follow the health data consent.
 */
export default function SettingsScreen() {
  const { color } = useTheme();
  const { granted, refresh } = useHealthConsent();
  return (
    <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('settings.back')} onPress={() => router.back()} hitSlop={tokens.space.md}>
          <Text style={[styles.back, { color: color.text }]}>{`${t('settings.backMark')} ${t('settings.back')}`}</Text>
        </Pressable>
        <ScreenTitle>{t('settings.title')}</ScreenTitle>
        <AppearanceSection />
        <UnitsSection />
        <TrainingGroup />
        <FoodGroup granted={granted} />
        <RemindersSection />
        <HealthGroup granted={granted} onConsentChange={refresh} />
        <SubscriptionSection />
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
