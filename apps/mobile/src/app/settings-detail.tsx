import { useLocalSearchParams } from 'expo-router';
import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { ConsentsSection } from '@/settings/ConsentsSection';
import { DataSourcesPage } from '@/settings/DataSources';
import { type DetailPart, detailTitle, isDetailPart } from '@/settings/detail';
import { FoodEditor } from '@/settings/FoodEditor';
import { HealthWriteSection } from '@/settings/HealthWriteSection';
import { ImportSection } from '@/settings/ImportSection';
import { RoutineEditor } from '@/settings/RoutineEditor';
import { useHealthConsent } from '@/settings/useHealthConsent';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * A page one level under Settings (ADR-070 Ek 2 #2): what a row there opens when its controls or its words do not fit a row.
 * One route, the part in `part`: foods you avoid, your routine, the two consents (with their texts, Allow and Withdraw), Add
 * to Apple Health, bringing in weigh-ins, and the data sources. The way back is the system's, in the header, named
 * "Settings". Each part is the control Settings had inline; nothing was dropped on the way here.
 */
export default function SettingsDetailScreen() {
  const { part } = useLocalSearchParams<{ part?: string }>();
  const { color } = useTheme();
  const granted = useHealthConsent();
  if (!isDetailPart(part)) return <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['bottom']} />;

  const body: Record<DetailPart, ReactNode> = {
    food: <FoodEditor />,
    routine: <RoutineEditor />,
    consent: <ConsentsSection only="HEALTH_DATA" bare />,
    apple: <ConsentsSection only="APPLE_HEALTH" bare />,
    write: <HealthWriteSection bare />,
    // The weigh-in import reads health data: without the consent it is not offered, and one line says why.
    import:
      granted === true ? (
        <ImportSection workouts={false} bare />
      ) : granted === false ? (
        <Text style={[styles.note, { color: color.muted }]}>{t('settings.health.locked')}</Text>
      ) : null,
    sources: <DataSourcesPage />,
  };
  return (
    <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <ScreenTitle>{detailTitle(part)}</ScreenTitle>
        {body[part]}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.md, gap: tokens.space.xl },
  note: { fontSize: tokens.type.bodySmall },
});
