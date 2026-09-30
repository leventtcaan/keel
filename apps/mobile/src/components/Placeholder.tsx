import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Props = {
  /** Copy key prefix under "screens", e.g. "today". */
  screen: string;
};

/** Temporary screen body until the real screen is built (M3/M4). */
export function Placeholder({ screen }: Props) {
  const { color } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top']}>
      <View style={styles.body}>
        <ScreenTitle>{t(`screens.${screen}.title`)}</ScreenTitle>
        <Text style={[styles.note, { color: color.muted }]}>{t(`screens.${screen}.note`)}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.md, gap: tokens.space.sm },
  note: { fontSize: tokens.type.body },
});
