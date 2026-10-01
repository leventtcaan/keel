import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { workoutParams } from './params';

type Schemas = components['schemas'];
export type Entry = { load: string; reps: string; rir: number };

type Props = {
  move: Schemas['Exercise'];
  /** The row under way (a one-sided move's two rows are one set, a side each). */
  index: number;
  side: Schemas['Side'];
  entry: Entry;
  onChange: (change: Partial<Entry>) => void;
  onLog: () => void;
  problem: string | null;
  busy: boolean;
};

/**
 * The row under way (B §6.5: one tap per set): the weight and the reps, filled with the suggestion; the RIR picked
 * (0, 1, 2, 3+); one button logs it. A bodyweight move has no weight to type; a weighted one types what is added.
 */
export function SetEntry({ move, index, side, entry, onChange, onLog, problem, busy }: Props) {
  const { color } = useTheme();
  const units = useUnits();
  const unit = t(units === 'METRIC' ? 'units.kgUnit' : 'units.lbUnit');
  const number = Math.floor(index / (move.unilateral ? 2 : 1)) + 1;
  const loadKey = move.load === 'BODYWEIGHT_PLUS_EXTERNAL' ? 'workout.addedLabel' : 'workout.loadLabel';
  const load =
    move.load === 'BODYWEIGHT' ? null : (
      <View style={styles.grow}>
        <TextField
          label={t(loadKey, { unit })}
          value={entry.load}
          onChangeText={(text) => onChange({ load: text })}
          keyboardType="decimal-pad"
          maxLength={7}
        />
      </View>
    );
  const last = workoutParams.rirChoices.length - 1;
  const label = side === 'BOTH' ? t('workout.log', { number }) : t('workout.logSide', { number, side: t(`workout.sideName.${side}`) });
  const said = problem === null ? null : <Text style={[styles.text, { color: color.text }]}>{problem}</Text>;
  return (
    <View style={styles.entry}>
      <View style={styles.fields}>
        {load}
        <View style={styles.grow}>
          <TextField
            label={t('workout.repsLabel')}
            value={entry.reps}
            onChangeText={(text) => onChange({ reps: text })}
            keyboardType="number-pad"
            maxLength={3}
          />
        </View>
      </View>
      <Text style={[styles.small, { color: color.muted }]}>{t('workout.rir.label', { number })}</Text>
      <View style={styles.rir}>
        {workoutParams.rirChoices.map((rir, i) => (
          <Chip key={rir} label={i === last ? t('workout.rir.more') : String(rir)} selected={entry.rir === rir} onPress={() => onChange({ rir })} />
        ))}
      </View>
      {said}
      <Button label={label} onPress={onLog} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  entry: { gap: tokens.space.sm },
  fields: { flexDirection: 'row', gap: tokens.space.sm },
  rir: { flexDirection: 'row', gap: tokens.space.sm },
  grow: { flex: 1 },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
