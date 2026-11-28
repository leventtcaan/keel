import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenTitle } from '@/components/ScreenTitle';
import { isSection, sectionTitle } from '@/settings/sections';
import { SettingsSection } from '@/settings/SettingsSection';
import { useHealthConsent } from '@/settings/useHealthConsent';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * A chapter of Settings (K-1257, ADR-094 Ek 9): the page a row of the contents opens, named by the chapter in the serif title,
 * the chapter's groups under it. The way back is the system's, in the header, named "Settings"; a page opened from here names
 * this chapter on its way back (navigation/pushed.ts).
 */
export default function SettingsSectionScreen() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const { color } = useTheme();
  const granted = useHealthConsent();
  return (
    <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['bottom']}>
      {isSection(section) && (
        <ScrollView contentContainerStyle={styles.body}>
          <ScreenTitle>{sectionTitle(section)}</ScreenTitle>
          <SettingsSection section={section} granted={granted} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.md, gap: tokens.space.xl },
});
