import { type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

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
export type Entry = {
  load: string;
  loadKg: number | null;
  reps: string;
  /** The reps left that is logged with the set: the plan's aim until the person picks one (what was always sent). */
  rir: number;
  note: string | null;
};

type Props = {
  move: Schemas['Exercise'];
  /** The work sets' aim for reps left (the plan's target RIR); null outside the plan. Said to a screen reader, not written on the card. */
  aim: number | null;
  gym: GymWeights | undefined;
  entry: Entry;
  onChange: (change: Partial<Entry>) => void;
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
export function ActiveSet({ move, aim, gym, entry, onChange, problem, problemOccurrence, onLayout }: Props) {
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
  // A note is asked for from the "more" sheet, and closed until then: one tap stays one tap.
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
  // Reps left (RIR): one compact row with the plan's aim selected, as it always was, so what is logged when it is left alone is what the
  // person sees. The aim is said by the row's own text ("Reps left"), which a screen reader reaches, as its hint.
  const aimHint = aim === null ? undefined : t('workout.targetRir', { max: aim });
  return (
    <View testID="active-set" onLayout={onLayout} style={styles.entry}>
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
      {picking ? <Text style={[styles.small, { color: color.muted }]}>{t('workout.pick.why')}</Text> : null}
      <View testID="rir-row" style={styles.rir}>
        <Text accessibilityHint={aimHint} style={[styles.small, styles.grow, { color: color.muted }]}>
          {t('workout.rir.short')}
        </Text>
        {workoutParams.rirChoices.map((rir, i) => {
          return (
            <Chip key={rir} label={i === last ? t('workout.rir.more') : String(rir)} selected={rirChoice(entry.rir) === rir} onPress={() => onChange({ rir })} />
          );
        })}
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
  // Filled boxes on the page, no outline (K-1207: the near-white frame said "look here" about a card that is the whole screen).
  entry: { gap: tokens.space.sm },
  // One under the other (prototype `.setc`): the shared Stepper is wide enough for "102.5 kg" between its buttons, which two
  // side by side on a 375 pt phone are not (about 54 pt left for the number between four 48 pt buttons).
  steppers: { gap: tokens.space.sm },
  rir: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  grow: { flex: 1 },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
