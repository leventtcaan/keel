import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { AccountSection } from '@/settings/AccountSection';
import { AppearanceSection } from '@/settings/AppearanceSection';
import { DataSourcesGroup } from '@/settings/DataSources';
import { FoodGroup } from '@/settings/FoodGroup';
import { HealthGroup } from '@/settings/HealthGroup';
import { LegalGroup } from '@/settings/LegalGroup';
import { ProfileGroup } from '@/settings/ProfileGroup';
import { RemindersSection } from '@/settings/RemindersSection';
import { SubscriptionSection } from '@/settings/SubscriptionSection';
import { TrainingGroup } from '@/settings/TrainingGroup';
import { UnitsSection } from '@/settings/UnitsSection';
import { useHealthConsent } from '@/settings/useHealthConsent';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * Settings (K-309, K-982, K-1043, K-1062; prototype `yeniden-yapim.html` › 2, ADR-069 #3, ADR-070 Ek 2), opened from This week.
 * Eleven groups in one order, each a titled card of rows with the value on the right and a chevron only where a row opens a
 * page: Appearance and Units (segmented), Training (days, cardio, the workout import), Food (what the user avoids: chips),
 * About you (goal, check-in day, height, activity, birth year: buttons and wheels), Reminders (ADR-036: a switch, the routine,
 * the trial's), Health and data (the consents, Apple Health, the import), Subscription (K-702), Data sources (ADR-088 #3),
 * Legal (the privacy policy and the terms) and Account (export, sign out, delete). Under a row there is one line at most;
 * whatever is longer is on the page the row opens (`settings-detail`). The way back is the system's, in the header. Food and
 * Health and data follow the health data consent.
 */
export default function SettingsScreen() {
  const { color } = useTheme();
  const granted = useHealthConsent();
  return (
    <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{t('settings.title')}</ScreenTitle>
        <AppearanceSection />
        <UnitsSection />
        <TrainingGroup />
        <FoodGroup granted={granted} />
        <ProfileGroup />
        <RemindersSection />
        <HealthGroup granted={granted} />
        <SubscriptionSection />
        <DataSourcesGroup />
        <LegalGroup />
        <AccountSection title={t('settings.account.title')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.md, gap: tokens.space.xl },
});
