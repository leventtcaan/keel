import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
};

/** Temporary screen body until the real screen is built (M3/M4). */
export function Placeholder({ screen, coachEntry = true }: Props) {
  const { color } = useTheme();
  return (
    // Bottom edge too: inside native tabs the bottom inset includes the tab bar, so the coach bar sits above it.
    <SafeAreaView
      testID="screen"
      style={[styles.safe, { backgroundColor: color.background }]}
      edges={['top', 'bottom']}>
      <View style={styles.body}>
        <ScreenTitle>{t(`screens.${screen}.title`)}</ScreenTitle>
        <Text style={[styles.note, { color: color.muted }]}>{t(`screens.${screen}.note`)}</Text>
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
