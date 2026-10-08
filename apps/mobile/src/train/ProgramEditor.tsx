import { type ReactNode, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { findMoves } from './moves';
import { OwnMoveForm, type SaveOutcome } from './OwnMoveForm';
import { workoutParams as P } from './params';
import { exerciseName } from './program';
import {
  type EditedDay,
  type EditedMove,
  WEEKDAYS,
  canStep,
  newDay,
  renamed,
  stepped,
  weekdayTaken,
  withMove,
  withoutDay,
  withoutMove,
  withWeekday,
} from './programEdit';
import type { Move } from './trainData';

type Schemas = components['schemas'];
type Update = (change: (days: EditedDay[]) => EditedDay[]) => void;

type Props = {
  days: EditedDay[];
  /** Each change is a function of the days as they are then: two in one frame both count. */
  onChange: Update;
  /** The catalog's moves and the user's own (pending ones too): what a day's moves are found among, and named by. */
  moves: Move[];
  /**
   * An own move answered with the engine's questions (OwnMoveForm, U1): the screen makes it a move (onboarding keeps it
   * pending until the program is sent; ADR-073 Ek 2), or says why it could not.
   */
  makeOwn: (body: Schemas['NewCustomExercise']) => Promise<Move | Exclude<SaveOutcome, 'saved'>>;
};

/**
 * The program editor (K-968 "Type it in"; K-970's Edit reuses it): each day with its name, a weekday if the user wants
 * one (a weekday another day has is off), its moves with sets and the rep range, removed or added — found by name in the
 * catalog and the user's own moves (not one the day has), or made their own. The rules are programEdit.ts; what is done
 * with the program, and with an own move, is the screen's.
 */
export function ProgramEditor({ days, onChange, moves, makeOwn }: Props) {
  const byId = useMemo(() => new Map(moves.map((m) => [m.id, m])), [moves]);
  return (
    <View style={styles.editor}>
      {days.map((day, at) => (
        <DayEditor key={day.id} day={day} at={at} alone={days.length === 1} taken={(w) => weekdayTaken(days, at, w)} moves={moves} byId={byId} onChange={onChange} makeOwn={makeOwn} />
      ))}
      <Button label={t('programEditor.addDay')} variant="ghost" disabled={days.length >= P.programDaysMax} onPress={() => onChange(newDay)} />
    </View>
  );
}

type DayProps = Omit<Props, 'days'> & {
  day: EditedDay;
  at: number;
  /** The only day: it stays. */
  alone: boolean;
  taken: (weekday: Schemas['Weekday']) => boolean;
  byId: ReadonlyMap<string, Move>;
};

function DayEditor({ day, at, alone, taken, moves, byId, onChange, makeOwn }: DayProps) {
  const { color } = useTheme();
  const toggle = (weekday: Schemas['Weekday']) => onChange((all) => withWeekday(all, at, all[at].weekday === weekday ? undefined : weekday));
  const remove = alone ? null : (
    <Button
      label={t('programEditor.removeDay')}
      accessibilityLabel={t('programEditor.removeDayLabel', { day: day.name })}
      variant="ghost"
      size="sm"
      onPress={() => onChange((all) => withoutDay(all, at))}
    />
  );
  const none = day.moves.length === 0 ? <Text style={[styles.small, { color: color.muted }]}>{t('programEditor.noMoves')}</Text> : null;
  return (
    <View style={[styles.day, { borderColor: color.line }]}>
      <TextField
        label={t('programEditor.dayName')}
        value={day.name}
        onChangeText={(name) => onChange((all) => renamed(all, at, name))}
        maxLength={P.programDayNameMaxChars}
      />
      <Text style={[styles.small, { color: color.muted }]}>{t('programEditor.weekday')}</Text>
      <View style={styles.row}>
        {WEEKDAYS.map((weekday) => (
          <Chip
            key={weekday}
            label={t(`programEditor.weekdayShort.${weekday}`)}
            accessibilityLabel={t(`programEditor.weekdayName.${weekday}`)}
            selected={day.weekday === weekday}
            disabled={taken(weekday)}
            onPress={() => toggle(weekday)}
          />
        ))}
      </View>
      {none}
      {day.moves.map((move, index) => (
        <MoveEditor key={move.exerciseId} move={move} name={exerciseName(move.exerciseId, byId)} onChange={(change) => onChange((all) => change(all, at, index))} />
      ))}
      <AddMove day={day} moves={moves} byId={byId} onAdd={(added) => onChange((all) => withMove(all, at, added))} makeOwn={makeOwn} />
      {remove}
    </View>
  );
}

type MoveProps = {
  move: EditedMove;
  name: string;
  onChange: (change: (all: EditedDay[], at: number, index: number) => EditedDay[]) => void;
};

/** A move of the day: its name, remove, and two steppers, the sets and the rep range (moved as a window). */
function MoveEditor({ move, name, onChange }: MoveProps) {
  const { color } = useTheme();
  const step = (field: 'sets' | 'reps') => (by: number) => onChange((all, at, index) => stepped(all, at, index, field, by));
  return (
    <View style={styles.move}>
      <View style={styles.moveHead}>
        <Text style={[styles.name, { color: color.text }]}>{name}</Text>
        <Button
          label={t('programEditor.removeMove')}
          accessibilityLabel={t('programEditor.removeMoveLabel', { move: name })}
          variant="ghost"
          size="sm"
          onPress={() => onChange(withoutMove)}
        />
      </View>
      <View style={styles.row}>
        <Stepper
          caption={t('programEditor.sets')}
          label={t('programEditor.setsLabel', { move: name })}
          value={String(move.sets)}
          less={canStep(move, 'sets', -1)}
          more={canStep(move, 'sets', 1)}
          onStep={step('sets')}
        />
        <Stepper
          caption={t('programEditor.reps')}
          label={t('programEditor.repsLabel', { move: name })}
          value={t('programEditor.range', { min: move.reps.min, max: move.reps.max })}
          less={canStep(move, 'reps', -1)}
          more={canStep(move, 'reps', 1)}
          onStep={step('reps')}
        />
      </View>
    </View>
  );
}

type StepperProps = { caption: string; label: string; value: string; less: boolean; more: boolean; onStep: (by: number) => void };

/** A value stepped one at a time: a button each way (off where it would not change), and the value adjustable for VoiceOver. */
function Stepper({ caption, label, value, less, more, onStep }: StepperProps) {
  const { color } = useTheme();
  const button = (by: number, key: 'less' | 'more', on: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(`programEditor.${key}Label`, { what: label })}
      accessibilityState={{ disabled: !on }}
      disabled={!on}
      onPress={() => onStep(by)}
      hitSlop={tokens.space.xs}
      style={[styles.stepButton, !on && styles.dim]}>
      <Text style={[styles.name, { color: color.text }]}>{t(`programEditor.${key}`)}</Text>
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      <Text style={[styles.small, { color: color.muted }]}>{caption}</Text>
      <View style={[styles.steps, { backgroundColor: color.surface }]}>
        {button(-1, 'less', less)}
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ text: value }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) => {
            const by = event.nativeEvent.actionName === 'increment' ? 1 : -1;
            if (by > 0 ? more : less) onStep(by);
          }}>
          <Text style={[styles.name, { color: color.text }]}>{value}</Text>
        </View>
        {button(1, 'more', more)}
      </View>
    </View>
  );
}

type AddProps = Pick<Props, 'moves' | 'makeOwn'> & { day: EditedDay; byId: ReadonlyMap<string, Move>; onAdd: (move: Move) => void };

/** "Add a move": found by name (not one the day has), or made the user's own; one search open at a time per day. */
function AddMove({ day, moves, byId, onAdd, makeOwn }: AddProps) {
  const { color } = useTheme();
  const [query, setQuery] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const full = day.moves.length >= P.programDayMovesMax;
  // The moves the day does not have: what is offered, in the search and in the own-move form's "Is it one of these?".
  const offered = useMemo(() => {
    const has = new Set(day.moves.map((m) => m.exerciseId));
    return moves.filter((m) => !has.has(m.id));
  }, [day.moves, moves]);
  const add = (move: Move | undefined) => {
    if (move !== undefined) onAdd(move);
    setQuery(null);
    setCreating(null);
  };
  const save = async (body: Schemas['NewCustomExercise']): Promise<SaveOutcome> => {
    const made = await makeOwn(body);
    if (typeof made === 'string') return made;
    add(made);
    return 'saved';
  };

  if (creating !== null) {
    return <OwnMoveForm name={creating} catalog={offered} onPick={(id) => add(byId.get(id))} onSave={save} onBack={() => setCreating(null)} />;
  }
  if (query === null) return <Button label={t('workout.add.open')} variant="ghost" size="sm" disabled={full} onPress={() => setQuery('')} />;
  const found = findMoves(query, offered);
  const typed = query.trim();
  let after: ReactNode = null;
  if (typed !== '' && found.length === 0) after = <Text style={[styles.small, { color: color.muted }]}>{t('workout.add.none')}</Text>;
  const create =
    typed === '' ? null : (
      <Button label={t('workout.add.create', { name: typed })} variant="ghost" size="sm" onPress={() => setCreating([...typed].slice(0, P.ownMoveNameMaxChars).join(''))} />
    );
  return (
    <View style={styles.add}>
      <TextField label={t('workout.add.search')} value={query} onChangeText={setQuery} onSearch={() => undefined} />
      {found.map((m) => (
        <Pressable key={m.id} accessibilityRole="button" accessibilityLabel={t('workout.add.pick', { name: exerciseName(m.id, byId) })} onPress={() => add(m)} style={styles.found}>
          <Text style={[styles.name, { color: color.text }]}>{exerciseName(m.id, byId)}</Text>
        </Pressable>
      ))}
      {after}
      {create}
      <Button label={t('workout.add.close')} variant="ghost" size="sm" onPress={() => setQuery(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { gap: tokens.space.lg },
  day: { gap: tokens.space.sm, paddingTop: tokens.space.md, borderTopWidth: tokens.border.hairline },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  move: { gap: tokens.space.xs },
  moveHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space.sm },
  stepper: { gap: tokens.space.xs },
  steps: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, borderRadius: tokens.radius.button, paddingHorizontal: tokens.space.sm },
  stepButton: { minWidth: tokens.size.touch, minHeight: tokens.size.touch, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: tokens.opacity.dim },
  add: { gap: tokens.space.sm },
  found: { padding: tokens.space.sm, borderRadius: tokens.radius.button },
  name: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold, flexShrink: 1 },
  small: { fontSize: tokens.type.bodySmall },
});
