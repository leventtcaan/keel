import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { t } from '@/copy';
import { tokens } from '@/theme/tokens';

/** Ways into the coach from the day's data (prototype 2.1); the coach itself answers in M5. */
export function CoachChips({ keys }: { keys: string[] }) {
  return (
    <View style={styles.chips}>
      {keys.map((key) => (
        <Chip key={key} label={t(key)} onPress={() => router.push('/coach')} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
});
