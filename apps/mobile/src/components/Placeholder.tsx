import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { CoachEntry } from '@/components/CoachEntry';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Props = {
  /** Copy key prefix under "screens", e.g. "today". */
  screen: string;
  /** The coach bar; every tab shows it, the coach screen itself does not. */
  coachEntry?: boolean;
  /** Today's way to Settings (prototype 5.2: "‹ Today"). */
  settingsEntry?: boolean;
  /** What the tab already has, under its note (Progress: the shape projection, K-606). */
  children?: ReactNode;
};

/** Temporary screen body until the real screen is built (M3/M4). */
export function Placeholder({ screen, coachEntry = true, settingsEntry = false, children }: Props) {
  const { color } = useTheme();
  // Built outside the JSX below (the raw-text guard reads JSX children).
  const settings = settingsEntry ? (
    <Button label={t('settings.entry')} variant="ghost" size="sm" onPress={() => router.push('/settings')} />
  ) : null;
  return (
    // Bottom edge too: inside native tabs the bottom inset includes the tab bar, so the coach bar sits above it.
    <SafeAreaView
      testID="screen"
      style={[styles.safe, { backgroundColor: color.background }]}
      edges={['top', 'bottom']}>
      <View style={styles.body}>
        <ScreenTitle>{t(`screens.${screen}.title`)}</ScreenTitle>
        <Text style={[styles.note, { color: color.muted }]}>{t(`screens.${screen}.note`)}</Text>
        {settings}
        {children}
      </View>
      {coachEntry && (
        <View style={styles.coach}>
          <CoachEntry />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.md, gap: tokens.space.sm },
  note: { fontSize: tokens.type.body },
  coach: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.md },
});
