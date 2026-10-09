import { SymbolView } from 'expo-symbols';
import { type KeyboardTypeOptions, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ProblemText } from '@/components/ProblemText';
import type { components } from '@/api/schema';
import { Chip } from '@/components/Chip';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import type { GymWeights } from './loadSteps';
import { workoutParams } from './params';
import { loadText, parseLoad, rirChoice, stepLoad, stepReps } from './session';

type Schemas = components['schemas'];
/**
 * As the edit screen's SetEntry: `note` null is the note field closed (one tap stays one tap); a string, open with what
 * is typed. `loadKg`: the kg the shown weight stands for when the phone set it (the suggestion, or a step to a load the
 * gym makes), so it is stepped from and logged as that load and not as the rounded number read back (11.34 kg shows as
 * 11.3); null once the user types.
 */
export type Entry = { load: string; loadKg: number | null; reps: string; rir: number; note: string | null };

type Props = {
  move: Schemas['Exercise'];
  /** "Set 2 of 3", or "Set 2" for a move outside the plan. */
  heading: string;
  /** The reps to aim for ("6-10 reps"); null outside the plan. */
  range: string | null;
  /** The work sets' aim for reps left (the plan's target RIR); null outside the plan. */
  aim: number | null;
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
export function ActiveSet({ move, heading, range, aim, gym, plates, entry, onChange, problem, problemOccurrence }: Props) {
  const { color } = useTheme();
  const units = useUnits();
  const unit = t(units === 'METRIC' ? 'units.kgUnit' : 'units.lbUnit');
  const kg = parseLoad(entry.load, units, entry.loadKg);
  const loadStep = (direction: 1 | -1) => {
    const next = stepLoad(kg, direction, move, gym, units);
    return next === null ? null : () => onChange({ load: loadText(next, units), loadKg: next });
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
        onChangeText={(text) => onChange({ load: text, loadKg: null })}
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
  // Closed, a small link on the set's own line (no row of its own: the set stays in the first view on a small phone).
  const addNote =
    entry.note === null ? (
      <Pressable accessibilityRole="button" onPress={() => onChange({ note: '' })} style={styles.link}>
        <Text style={[styles.small, { color: color.accent }]}>{t('workout.note.add')}</Text>
      </Pressable>
    ) : null;
  const noteField =
    entry.note === null ? null : (
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
        <Text style={[styles.heading, styles.grow, { color: color.text }]}>{heading}</Text>
        {range !== null && <Text style={[styles.small, { color: color.muted }]}>{range}</Text>}
        {addNote}
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

export type StepperProps = {
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
export function Stepper({ label, caption, value, onChangeText, keyboardType, maxLength, less, more, lessLabel, moreLabel }: StepperProps) {
  const { color } = useTheme();
  // Drawn, not a typed hyphen (prototype: the minus and plus icons); VoiceOver says the label.
  const button = (onPress: (() => void) | null, name: string, symbol: 'minus' | 'plus') => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityState={{ disabled: onPress === null }}
      disabled={onPress === null}
      onPress={onPress ?? undefined}
      style={({ pressed }) => [styles.step, { backgroundColor: color.background }, (pressed || onPress === null) && styles.dim]}>
      <SymbolView name={symbol} size={tokens.type.number} tintColor={color.text} />
    </Pressable>
  );
  return (
    <View style={[styles.stepper, { backgroundColor: color.surface }]}>
      {button(less, lessLabel, 'minus')}
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
      {button(more, moreLabel, 'plus')}
    </View>
  );
}

const styles = StyleSheet.create({
  // Tight enough for the whole set to be in the first view on an iPhone SE (K-971 simulator).
  entry: { gap: tokens.space.sm, padding: tokens.space.sm, borderWidth: tokens.border.outline, borderRadius: tokens.radius.card },
  head: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: tokens.space.md },
  grow: { flexGrow: 1 },
  link: { minHeight: tokens.size.touch, justifyContent: 'center' },
  heading: { fontSize: tokens.type.body, fontWeight: tokens.weight.bold },
  steppers: { flexDirection: 'row', gap: tokens.space.sm },
  stepper: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: tokens.radius.card },
  step: { width: tokens.size.touch, height: tokens.size.touch, borderRadius: tokens.radius.button, alignItems: 'center', justifyContent: 'center' },
  value: { flex: 1, minWidth: 0, alignItems: 'center' },
  // Heading size: "102.5" (and "226.5" lb) fits between the two buttons on a 375 pt wide phone.
  number: { alignSelf: 'stretch', textAlign: 'center', fontFamily: tokens.font.display, fontSize: tokens.type.heading, padding: 0 },
  caption: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  rir: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: tokens.space.sm },
  rirLabel: { flex: 1, minWidth: tokens.size.primaryButton * 2 },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
  dim: { opacity: tokens.opacity.dim },
});
