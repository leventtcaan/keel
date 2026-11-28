import { useLocalSearchParams } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnPaper } from '@/components/ListGroup';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { CoachSettings } from '@/settings/CoachSettings';
import { ConsentsSection } from '@/settings/ConsentsSection';
import { DataSourcesPage } from '@/settings/DataSources';
import { type DetailPart, detailTitle, isDetailPart } from '@/settings/detail';
import { FoodEditor } from '@/settings/FoodEditor';
import { ActivityEditor, BornEditor, CheckInEditor, GoalEditor, HeightEditor } from '@/settings/ProfileEditors';
import { HealthWriteSection } from '@/settings/HealthWriteSection';
import { ImportSection } from '@/settings/ImportSection';
import { RestSection } from '@/settings/RestSection';
import { RoutineEditor } from '@/settings/RoutineEditor';
import { WalksEditor } from '@/settings/WalksEditor';
import { useHealthConsent } from '@/settings/useHealthConsent';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * A page one level under Settings (ADR-070 Ek 2 #2): what a row there opens when its controls or its words do not fit a row.
 * One route, the part in `part`: the profile's answers (goal, check-in day, height, activity, birth year), foods you avoid,
 * your routine, the two consents (with their texts, Allow and Withdraw), Add to Apple Health, importing weigh-ins, and the
 * data sources. The way back is the system's, in the header, named
 * "Settings". Each part is the control Settings had inline; nothing was dropped on the way here.
 */
export default function SettingsDetailScreen() {
  const { part } = useLocalSearchParams<{ part?: string }>();
  const { color } = useTheme();
  // Counts up when the consent is given on this page, so the import below opens at once.
  const [asked, setAsked] = useState(0);
  const granted = useHealthConsent(asked);
  if (!isDetailPart(part)) return <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['bottom']} />;

  const body: Record<DetailPart, ReactNode> = {
    goal: <GoalEditor />,
    checkin: <CheckInEditor />,
    height: <HeightEditor />,
    // My walks left Settings (K-1251, ADR-094 Ek 6): they are reached from Today's walk.
    activity: <ActivityEditor />,
    walks: <WalksEditor />,
    born: <BornEditor />,
    food: <FoodEditor />,
    routine: <RoutineEditor />,
    consent: <ConsentsSection only="HEALTH_DATA" bare />,
    apple: <ConsentsSection only="APPLE_HEALTH" bare why />,
    write: <HealthWriteSection bare />,
    // The weigh-in import reads health data: without the consent it says so in one line and gives the consent right here.
    import:
      granted === true ? (
        <ImportSection bare />
      ) : granted === false ? (
        <View style={styles.locked}>
          <Text style={[styles.note, { color: color.muted }]}>{t('settings.health.locked')}</Text>
          <ConsentsSection only="HEALTH_DATA" bare onChanged={() => setAsked((n) => n + 1)} />
        </View>
      ) : null,
    rest: <RestSection />,
    sources: <DataSourcesPage />,
    coach: <CoachSettings />,
  };
  return (
    <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <ScreenTitle>{detailTitle(part)}</ScreenTitle>
        {/* On the paper, as the chapter pages (ADR-094 Ek 9, K-1258). */}
        <OnPaper.Provider value>{body[part]}</OnPaper.Provider>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.md, gap: tokens.space.xl },
  note: { fontSize: tokens.type.bodySmall },
  locked: { gap: tokens.space.md },
});
