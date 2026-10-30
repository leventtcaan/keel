import { type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { ProblemText } from '@/components/ProblemText';
import type { components } from '@/api/schema';
import { Chip } from '@/components/Chip';
import { Stepper } from '@/components/Stepper';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { useUnits } from '@/services/ServicesProvider';
import { loadInputDecimals } from '@/units/units';
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
  /** What this set was last time ("185 lb × 8"), Hevy's PREVIOUS: the reference beside the numbers to type; null for a move never done. */
  previous?: string | null;
  /** The work sets' aim for reps left (the plan's target RIR); null outside the plan. */
  aim: number | null;
  gym: GymWeights | undefined;
  /** The plates a side for the load under way, in words; null without a gym or a load to make. */
  plates: string | null;
  entry: Entry;
  onChange: (change: Partial<Entry>) => void;
  /** "Too heavy?" (ADR-075 #3): asked of the weight, beside it; null where the server has no lighter load to offer. */
  onTooHeavy: (() => void) | null;
  problem: string | null;
  /** Which showing of the problem this is: the same failure again is said again (K-815). */
  problemOccurrence?: unknown;
  /** The card's place on the page, as it changes: the screen brings it above the dock when a small phone would hide its end. */
  onLayout?: (event: LayoutChangeEvent) => void;
};

/**
 * The one set under way (ADR-075 #1-#2, prototype `.active`): the weight and the reps, each a stepper whose number can
 * be typed too, filled with the suggestion; reps left picked from 0, 1 and 2+. A bodyweight move has no weight; a weighted
 * one steps what is added. The button that logs it is the screen's, in its dock, so it never moves.
 */
export function ActiveSet({ move, heading, range, previous = null, aim, gym, plates, entry, onChange, onTooHeavy, problem, problemOccurrence, onLayout }: Props) {
  const { color } = useTheme();
  const units = useUnits();
  const unit = t(units === 'METRIC' ? 'units.kgUnit' : 'units.lbUnit');
  const kg = parseLoad(entry.load, units, entry.loadKg);
  // No weight yet (a move never done, ADR-075 #3, Ek 8): "Pick a weight", and the button that logs waits for one. An added
  // load (BODYWEIGHT_PLUS_EXTERNAL) is never picked: empty is 0, the body alone.
  const picking = move.load === 'EXTERNAL' && entry.load.trim() === '';
  // One tap of the weight: the gym's own loads, or the empty bar from nothing (stepLoad); the kg it lands on is kept, so what
  // is logged is that load and not the rounded number shown.
  const loadStep = (direction: 1 | -1) => {
    const next = stepLoad(kg, direction, move, gym, units);
    return next === null ? null : () => onChange({ load: loadText(next, units), loadKg: next });
  };
  const repsStep = (direction: 1 | -1) => {
    const next = stepReps(entry.reps, direction);
    return next === null ? null : () => onChange({ reps: String(next) });
  };
  const loadLabel = t(move.load === 'BODYWEIGHT_PLUS_EXTERNAL' ? 'workout.addedLabel' : 'workout.loadLabel', { unit });
  // Compact steppers (prototype `.stp.c`): each names its field inside its box, so there is no label line over it.
  const load =
    move.load === 'BODYWEIGHT' ? null : (
      <Stepper
        compact
        label={loadLabel}
        value={numberOf(entry.load)}
        onChange={(number) => onChange({ load: String(number), loadKg: null })}
        onEmpty={() => onChange({ load: '', loadKg: null })}
        step={units === 'METRIC' ? workoutParams.loadStep.kg : workoutParams.loadStep.lb}
        decimals={loadInputDecimals}
        min={0}
        unit={picking ? t('workout.pick.caption') : unit}
        placeholder={t('workout.pick.placeholder')}
        steps={loadStep}
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
  // Closed, a small link on the set's own head line (no row of its own: the set stays in the first view on a small phone).
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
  // On the card's head line with the other link, far from both skips (Skip set is the dock's, Skip move the move head's):
  // "Too heavy?" where the server has a lighter load.
  const tooHeavy =
    onTooHeavy === null ? null : (
      <Pressable accessibilityRole="button" accessibilityLabel={t('workout.tooHeavy.label')} onPress={onTooHeavy} style={styles.link}>
        <Text style={[styles.small, { color: color.accent }]}>{t('workout.tooHeavy.link')}</Text>
      </Pressable>
    );
  // Under the weight it is about, as text only (a link would make it a row a touch target tall): why the button waits, or the
  // plates a side.
  const weightLine =
    !picking && plates === null ? null : <Text style={[styles.small, { color: color.muted }]}>{picking ? t('workout.pick.why') : plates}</Text>;
  // Built outside the JSX (the raw-text guard reads what is inside it).
  const previousRow =
    previous === null ? null : (
      <View testID="previous-set" accessible accessibilityLabel={t('workout.previousLabel', { set: previous })} style={styles.previous}>
        <Text style={[styles.small, { color: color.muted }]}>{t('workout.previous')}</Text>
        <Text style={[styles.small, styles.bold, { color: color.textSecondary }]}>{previous}</Text>
      </View>
    );
  return (
    <View testID="active-set" onLayout={onLayout} style={[styles.entry, { borderColor: color.text }]}>
      <View testID="set-head" style={styles.head}>
        <Text style={[styles.heading, styles.grow, { color: color.text }]}>{heading}</Text>
        {range !== null && <Text style={[styles.small, { color: color.muted }]}>{range}</Text>}
        {tooHeavy}
        {addNote}
      </View>
      {previousRow}
      <View style={styles.steppers}>
        {load}
        <Stepper
          compact
          label={t('workout.repsLabel')}
          value={numberOf(entry.reps)}
          onChange={(number) => onChange({ reps: String(number) })}
          onEmpty={() => onChange({ reps: '' })}
          step={1}
          decimals={0}
          min={0}
          steps={repsStep}
        />
      </View>
      {weightLine}
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

/** The number a field holds, null for none (the fields keep what was last heard from the Stepper: a plain number). */
function numberOf(text: string): number | null {
  const number = Number(text.trim().replace(',', '.'));
  return text.trim() === '' || Number.isNaN(number) ? null : number;
}

const styles = StyleSheet.create({
  // Tight enough for the whole set to be in the first view on an iPhone SE (K-971 simulator).
  entry: { gap: tokens.space.sm, padding: tokens.space.sm, borderWidth: tokens.border.outline, borderRadius: tokens.radius.card },
  head: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: tokens.space.md },
  grow: { flexGrow: 1 },
  link: { minHeight: tokens.size.touch, justifyContent: 'center' },
  heading: { fontSize: tokens.type.body, fontWeight: tokens.weight.bold },
  // One under the other (prototype `.setc`): the shared Stepper is wide enough for "102.5 kg" between its buttons, which two
  // side by side on a 375 pt phone are not (about 54 pt left for the number between four 48 pt buttons).
  steppers: { gap: tokens.space.sm },
  rir: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: tokens.space.sm },
  rirLabel: { flex: 1, minWidth: tokens.size.primaryButton * 2 },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
  bold: { fontWeight: tokens.weight.bold },
  previous: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
});
