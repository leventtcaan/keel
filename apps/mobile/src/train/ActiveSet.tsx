import { type KeyboardTypeOptions, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ProblemText } from '@/components/ProblemText';
import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { loadValue } from '@/units/units';

import type { GymWeights } from './loadSteps';
import { workoutParams } from './params';
import { parseLoad, rirChoice, stepLoad, stepReps } from './session';

type Schemas = components['schemas'];
/** As the edit screen's SetEntry: `note` null is the note field closed (one tap stays one tap); a string, open with what is typed. */
export type Entry = { load: string; reps: string; rir: number; note: string | null };

type Props = {
  move: Schemas['Exercise'];
  /** "Set 2 of 3", or "Set 2" for a move outside the plan. */
  heading: string;
  /** The reps to aim for ("6-10 reps"); null outside the plan. */
  range: string | null;
  /** The work sets' aim for reps left (the plan's target RIR); null outside the plan. */
  aim: number | null;
  /** The row's suggestion, in kg: a load left as shown is logged as the server set it. */
  suggestedKg: number | null;
  gym: GymWeights | undefined;
  /** The plates a side for the load under way, in words; null without a gym or a load to make. */
  plates: string | null;
  entry: Entry;
  onChange: (change: Partial<Entry>) => void;
  problem: string | null;
  /** Which showing of the problem this is: the same failure again is said again (K-815). */
  problemOccurrence?: unknown;
};

/**
 * The one set under way (ADR-075 #1-#2, prototype `.active`): the weight and the reps, each a stepper whose number can
 * be typed too, filled with the suggestion; reps left picked from 0, 1 and 2+. A bodyweight move has no weight; a weighted
 * one steps what is added. The button that logs it is the screen's, in its dock, so it never moves.
 */
export function ActiveSet({ move, heading, range, aim, suggestedKg, gym, plates, entry, onChange, problem, problemOccurrence }: Props) {
  const { color } = useTheme();
  const units = useUnits();
  const unit = t(units === 'METRIC' ? 'units.kgUnit' : 'units.lbUnit');
  const kg = parseLoad(entry.load, units, suggestedKg);
  const loadStep = (direction: 1 | -1) => {
    const next = stepLoad(kg, direction, move, gym, units);
    return next === null ? null : () => onChange({ load: String(loadValue(next, units)) });
  };
  const repsStep = (direction: 1 | -1) => {
    const next = stepReps(entry.reps, direction);
    return next === null ? null : () => onChange({ reps: String(next) });
  };
  const load =
    move.load === 'BODYWEIGHT' ? null : (
      <Stepper
        label={t(move.load === 'BODYWEIGHT_PLUS_EXTERNAL' ? 'workout.addedLabel' : 'workout.loadLabel', { unit })}
        caption={unit}
        value={entry.load}
        onChangeText={(text) => onChange({ load: text })}
        keyboardType="decimal-pad"
        maxLength={7}
        less={loadStep(-1)}
        more={loadStep(1)}
        lessLabel={t('workout.stepper.lessLoad')}
        moreLabel={t('workout.stepper.moreLoad')}
      />
    );
  const last = workoutParams.rirChoices.length - 1;
  const said =
    problem === null ? null : (
      <ProblemText style={[styles.text, { color: color.text }]} occurrence={problemOccurrence}>
        {problem}
      </ProblemText>
    );
  // Closed until asked for: one tap stays one tap.
  const noteField =
    entry.note === null ? (
      <Button label={t('workout.note.add')} variant="ghost" size="sm" onPress={() => onChange({ note: '' })} />
    ) : (
      <TextField
        label={t('workout.note.label')}
        value={entry.note}
        onChangeText={(text) => onChange({ note: text })}
        maxLength={workoutParams.noteMaxChars}
        multiline
      />
    );
  return (
    <View style={[styles.entry, { borderColor: color.text }]}>
      <View style={styles.head}>
        <Text style={[styles.heading, { color: color.text }]}>{heading}</Text>
        {range !== null && <Text style={[styles.small, { color: color.muted }]}>{range}</Text>}
      </View>
      <View style={styles.steppers}>
        {load}
        <Stepper
          label={t('workout.repsLabel')}
          caption={t('workout.repsLabel')}
          value={entry.reps}
          onChangeText={(text) => onChange({ reps: text })}
          keyboardType="number-pad"
          maxLength={3}
          less={repsStep(-1)}
          more={repsStep(1)}
          lessLabel={t('workout.stepper.lessReps')}
          moreLabel={t('workout.stepper.moreReps')}
        />
      </View>
      {plates !== null && <Text style={[styles.small, { color: color.muted }]}>{plates}</Text>}
      <View style={styles.rir}>
        <View style={styles.rirLabel}>
          <Text style={[styles.small, { color: color.textSecondary }]}>{t('workout.rir.short')}</Text>
          {aim !== null && <Text style={[styles.small, { color: color.muted }]}>{t('workout.targetRir', { max: aim })}</Text>}
        </View>
        {workoutParams.rirChoices.map((rir, i) => (
          <Chip key={rir} label={i === last ? t('workout.rir.more') : String(rir)} selected={rirChoice(entry.rir) === rir} onPress={() => onChange({ rir })} />
        ))}
      </View>
      {noteField}
      {said}
    </View>
  );
}

type StepperProps = {
  /** What VoiceOver calls the number ("Weight (kg)"). */
  label: string;
  /** The unit under the number. */
  caption: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType: KeyboardTypeOptions;
  maxLength: number;
  /** A tap each way; null where it would not move the number (the button is off). */
  less: (() => void) | null;
  more: (() => void) | null;
  lessLabel: string;
  moreLabel: string;
};

/** Less, the number (typed in place: a weight no step reaches), more (prototype `.stepper`). */
function Stepper({ label, caption, value, onChangeText, keyboardType, maxLength, less, more, lessLabel, moreLabel }: StepperProps) {
  const { color } = useTheme();
  const button = (onPress: (() => void) | null, name: string, mark: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityState={{ disabled: onPress === null }}
      disabled={onPress === null}
      onPress={onPress ?? undefined}
      style={({ pressed }) => [styles.step, { backgroundColor: color.background }, (pressed || onPress === null) && styles.dim]}>
      <Text style={[styles.mark, { color: color.text }]}>{mark}</Text>
    </Pressable>
  );
  return (
    <View style={[styles.stepper, { backgroundColor: color.surface }]}>
      {button(less, lessLabel, t('workout.stepper.minus'))}
      <View style={styles.value}>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          maxLength={maxLength}
          selectTextOnFocus
          style={[styles.number, { color: color.text }]}
        />
        <Text style={[styles.caption, { color: color.muted }]}>{caption}</Text>
      </View>
      {button(more, moreLabel, t('workout.stepper.plus'))}
    </View>
  );
}

const styles = StyleSheet.create({
  entry: { gap: tokens.space.md, padding: tokens.space.md, borderWidth: tokens.border.outline, borderRadius: tokens.radius.card },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: tokens.space.sm },
  heading: { fontSize: tokens.type.body, fontWeight: tokens.weight.bold },
  steppers: { flexDirection: 'row', gap: tokens.space.sm },
  stepper: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: tokens.space.xs, borderRadius: tokens.radius.card },
  step: { width: tokens.size.touch, height: tokens.size.touch, borderRadius: tokens.radius.button, alignItems: 'center', justifyContent: 'center' },
  mark: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  value: { flex: 1, alignItems: 'center' },
  number: { alignSelf: 'stretch', textAlign: 'center', fontFamily: tokens.font.display, fontSize: tokens.type.decisionTitle, padding: 0 },
  caption: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  rir: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: tokens.space.sm },
  rirLabel: { flex: 1, minWidth: tokens.size.primaryButton * 2 },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
  dim: { opacity: tokens.opacity.dim },
});
