import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View, findNodeHandle } from 'react-native';

import { ProblemText } from '@/components/ProblemText';
import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Stepper } from '@/components/Stepper';
import { t } from '@/copy';
import { useUnits } from '@/services/ServicesProvider';
import { loadInputDecimals } from '@/units/units';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import type { GymWeights } from './loadSteps';
import { workoutParams } from './params';
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
  // Opened, VoiceOver goes to it: a set to correct is what the user just asked for.
  const title = useRef<Text>(null);
  useEffect(() => {
    const node = findNodeHandle(title.current);
    if (node !== null) AccessibilityInfo.setAccessibilityFocus(node);
  }, []);
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
        value={numberOf(load.text)}
        onChange={(number) => setLoad({ text: String(number), kg: null })}
        onEmpty={() => setLoad({ text: '', kg: null })}
        step={units === 'METRIC' ? workoutParams.loadStep.kg : workoutParams.loadStep.lb}
        decimals={loadInputDecimals}
        min={0}
        unit={unit}
        steps={loadStep}
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
      <Text ref={title} accessibilityRole="header" style={[styles.heading, { color: color.text }]}>
        {t('workout.edit.title', { number })}
      </Text>
      <View style={styles.steppers}>
        {loadStepper}
        <Stepper
          label={t('workout.repsLabel')}
          value={numberOf(reps)}
          onChange={(number) => setReps(String(number))}
          onEmpty={() => setReps('')}
          step={1}
          decimals={0}
          min={0}
          steps={repsStep}
        />
      </View>
      {problem === null ? null : (
        <ProblemText style={[styles.text, { color: color.text }]} occurrence={problemOccurrence}>
          {problem}
        </ProblemText>
      )}
      <View style={styles.actions}>
        <View style={styles.grow}>
          <Button label={t('workout.edit.delete')} variant="ghost" onPress={onDelete} disabled={busy} />
        </View>
        <View style={styles.grow}>
          <Button label={t('workout.edit.done')} onPress={done} disabled={busy || parsed === null} />
        </View>
      </View>
    </View>
  );
}

/** The number a field holds, null for none. */
function numberOf(text: string): number | null {
  const number = Number(text.trim().replace(',', '.'));
  return text.trim() === '' || Number.isNaN(number) ? null : number;
}

const styles = StyleSheet.create({
  edit: { gap: tokens.space.sm, padding: tokens.space.sm, borderWidth: tokens.border.outline, borderRadius: tokens.radius.card },
  heading: { fontSize: tokens.type.body, fontWeight: tokens.weight.bold },
  steppers: { gap: tokens.space.sm },
  actions: { flexDirection: 'row', gap: tokens.space.sm },
  grow: { flex: 1 },
  text: { fontSize: tokens.type.body },
});
