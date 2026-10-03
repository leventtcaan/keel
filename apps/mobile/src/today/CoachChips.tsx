import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { t } from '@/copy';
import { tokens } from '@/theme/tokens';

/**
 * Ways into the coach from the day's data (prototype 2.1): on Today a chip opens the coach on it (K-509); in the coach,
 * a chip is answered there (onChip).
 */
export function CoachChips({ keys, onChip }: { keys: string[]; onChip?: (key: string) => void }) {
  return (
    <View style={styles.chips}>
      {keys.map((key) => (
        <Chip key={key} label={t(key)} onPress={() => (onChip !== undefined ? onChip(key) : router.push({ pathname: '/coach', params: { chip: key } }))} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
});
