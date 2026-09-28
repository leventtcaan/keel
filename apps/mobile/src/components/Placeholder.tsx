import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t } from '@/copy';
import { tokens } from '@/theme/tokens';

type Props = {
  /** Copy key prefix under "screens", e.g. "today". */
  screen: string;
};

/** Temporary screen body until the real screen is built (M3/M4). */
export function Placeholder({ screen }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.body}>
        <Text style={styles.title}>{t(`screens.${screen}.title`)}</Text>
        <Text style={styles.note}>{t(`screens.${screen}.note`)}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.color.background },
  body: { paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.md, gap: tokens.space.sm },
  title: {
    color: tokens.color.text,
    fontSize: tokens.type.displaySize,
    fontWeight: tokens.type.displayWeight,
    textTransform: 'uppercase',
  },
  note: { color: tokens.color.muted, fontSize: tokens.type.bodySize },
});
