import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ProblemText } from '@/components/ProblemText';
import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { t } from '@/copy';
import { useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { Stepper } from './ActiveSet';
import type { GymWeights } from './loadSteps';
import { loadText, parseEntry, parseLoad, stepLoad, stepReps } from './session';

type Schemas = components['schemas'];

type Props = {
  move: Schemas['Exercise'];
  set: Schemas['NewSet'];
  /** The set's number (and side) as shown. */
  number: string;
  gym: GymWeights | undefined;
  /** The weight and reps as corrected; called only when they changed. */
  onSave: (loadKg: number, reps: number) => void;
  onDelete: () => void;
  onClose: () => void;
  problem: string | null;
  problemOccurrence?: unknown;
  busy: boolean;
};

/**
 * A set done in this session, corrected or deleted (K-972, prototype `#editset`): its weight and reps on the same
 * steppers as the set under way, typed too; Delete; Done keeps a change, or closes when there is none.
 */
export function EditSet({ move, set, number, gym, onSave, onDelete, onClose, problem, problemOccurrence, busy }: Props) {
  const { color } = useTheme();
  const units = useUnits();
  const unit = t(units === 'METRIC' ? 'units.kgUnit' : 'units.lbUnit');
  const [load, setLoad] = useState({ text: loadText(set.loadKg, units), kg: set.loadKg as number | null });
  const [reps, setReps] = useState(String(set.reps));
  const kg = parseLoad(load.text, units, load.kg);
  const loadStep = (direction: 1 | -1) => {
    const next = stepLoad(kg, direction, move, gym, units);
    return next === null ? null : () => setLoad({ text: loadText(next, units), kg: next });
  };
  const repsStep = (direction: 1 | -1) => {
    const next = stepReps(reps, direction);
    return next === null ? null : () => setReps(String(next));
  };
  const loadStepper =
    move.load === 'BODYWEIGHT' ? null : (
        <Stepper
          label={t(move.load === 'BODYWEIGHT_PLUS_EXTERNAL' ? 'workout.addedLabel' : 'workout.loadLabel', { unit })}
          caption={unit}
          value={load.text}
          onChangeText={(text) => setLoad({ text, kg: null })}
          keyboardType="decimal-pad"
          maxLength={7}
          less={loadStep(-1)}
          more={loadStep(1)}
          lessLabel={t('workout.stepper.lessLoad')}
          moreLabel={t('workout.stepper.moreLoad')}
        />
    );
  const parsed = parseEntry(load.text, reps, move, units, load.kg);
  const done = () => {
    if (parsed === null) return;
    if (parsed.loadKg === set.loadKg && parsed.reps === set.reps) onClose();
    else onSave(parsed.loadKg, parsed.reps);
  };
  return (
    <View testID="edit-set" style={[styles.edit, { borderColor: color.text }]}>
      <Text style={[styles.heading, { color: color.text }]}>{t('workout.edit.title', { number })}</Text>
      <View style={styles.steppers}>
        {loadStepper}
        <Stepper
          label={t('workout.repsLabel')}
          caption={t('workout.repsLabel')}
          value={reps}
          onChangeText={setReps}
          keyboardType="number-pad"
          maxLength={3}
          less={repsStep(-1)}
          more={repsStep(1)}
          lessLabel={t('workout.stepper.lessReps')}
          moreLabel={t('workout.stepper.moreReps')}
        />
      </View>
      {problem === null ? null : (
        <ProblemText style={[styles.text, { color: color.text }]} occurrence={problemOccurrence}>
          {problem}
        </ProblemText>
      )}
      <View style={styles.actions}>
        <Button label={t('workout.edit.delete')} variant="ghost" size="sm" onPress={onDelete} disabled={busy} />
        <Button label={t('workout.edit.done')} size="sm" onPress={done} disabled={busy || parsed === null} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  edit: { gap: tokens.space.sm, padding: tokens.space.sm, borderWidth: tokens.border.outline, borderRadius: tokens.radius.card },
  heading: { fontSize: tokens.type.body, fontWeight: tokens.weight.bold },
  steppers: { flexDirection: 'row', gap: tokens.space.sm },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
});
