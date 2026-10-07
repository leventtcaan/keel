import { router } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { programToday } from '@/today/today';
import { useReadOnFocus } from '@/today/useReadOnFocus';
import { dayName } from '@/train/program';
import { activeWorkout } from '@/train/workout';

type Schemas = components['schemas'];
type Tile = { key: string; detail: string | null; onPress: () => void; waiting?: boolean };

/**
 * The "+" sheet (K-953, ADR-069 #4, prototype #plus): log a weigh-in, a meal, today's workout, or say life got in the way.
 * Each choice takes the sheet's place. The workout is today's session by name, a workout under way is continued, and with
 * nothing planned today the Train tab opens to pick a day. Cardio joins with its log (K-980).
 */
export default function PlusScreen() {
  const { api, training, workoutRecords } = useAppServices();
  const { color } = useTheme();
  const { day, data } = useReadOnFocus(
    useCallback(async () => {
      const [read, records] = await Promise.all([training.read(api), workoutRecords()]);
      return { program: read.program.state === 'ready' ? read.program.value : null, active: activeWorkout(records) };
    }, [api, training, workoutRecords]),
  );

  const today = data?.program == null ? null : programToday(data.program, day);
  const session: Schemas['ProgramDay'] | null = today?.kind === 'session' ? today.day : null;
  // A workout under way is the one the tile opens, so it is the one the tile names (it may be another day's).
  const active = data?.active ?? null;
  const shown = active !== null ? (data?.program?.days.find((d) => d.id === active.programDayId) ?? null) : session;
  const workout = () => {
    if (data === null) return; // not read yet: which workout is not known
    if (active !== null) router.replace('/workout');
    else if (session !== null) router.replace({ pathname: '/workout', params: { day: session.id } });
    else router.dismissTo('/train');
  };

  const tiles: Tile[] = [
    { key: 'plus.weighIn', detail: null, onPress: () => router.replace('/weigh-in') },
    { key: 'plus.meal', detail: null, onPress: () => router.replace('/meal') },
    { key: 'plus.workout', detail: shown === null ? null : dayName(shown), onPress: workout, waiting: data === null },
  ];

  return (
    <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: color.background }]}>
      <ScreenTitle>{t('plus.title')}</ScreenTitle>
      <View style={styles.tiles}>
        {tiles.map((tile) => (
          <Pressable
            key={tile.key}
            accessibilityRole="button"
            accessibilityLabel={tile.detail === null ? t(tile.key) : `${t(tile.key)}, ${tile.detail}`}
            accessibilityState={{ disabled: tile.waiting === true }}
            disabled={tile.waiting === true}
            onPress={tile.onPress}
            style={({ pressed }) => [styles.tile, { backgroundColor: color.surface }, pressed && styles.pressed]}>
            <Text style={[styles.tileLabel, { color: color.text }]}>{t(tile.key)}</Text>
            {tile.detail !== null && (
              <Text style={[styles.detail, { color: color.muted }]}>{tile.detail}</Text>
            )}
          </Pressable>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('plus.life')}
        onPress={() => router.replace('/state')}
        style={({ pressed }) => [styles.row, { borderColor: color.line }, pressed && styles.pressed]}>
        <Text style={[styles.rowLabel, { color: color.text }]}>{t('plus.life')}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sheet: { padding: tokens.space.lg, gap: tokens.space.md },
  tiles: { flexDirection: 'row', gap: tokens.space.sm },
  tile: {
    flex: 1,
    minHeight: tokens.size.primaryButton * 2,
    borderRadius: tokens.radius.card,
    padding: tokens.space.md,
    justifyContent: 'flex-end',
    gap: tokens.space.xs,
  },
  tileLabel: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  detail: { fontSize: tokens.type.label },
  row: { minHeight: tokens.size.touch, justifyContent: 'center', borderTopWidth: tokens.border.hairline },
  rowLabel: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  pressed: { opacity: tokens.opacity.dim },
});
