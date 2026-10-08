import { type ReactNode, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { findMoves } from './moves';
import { OwnMoveForm, type SaveOutcome } from './OwnMoveForm';
import { workoutParams as P } from './params';
import { exerciseName } from './program';
import { type EditedDay, WEEKDAYS, newDay, renamed, stepped, weekdayTaken, withMove, withoutDay, withoutMove, withWeekday } from './programEdit';
import { type Move, ownMove } from './trainData';

type Schemas = components['schemas'];

type Props = {
  days: EditedDay[];
  onChange: (days: EditedDay[]) => void;
  /** The catalog's moves and the user's own: what a day's moves are found among, and named by. */
  moves: Move[];
  /** An own move just made (saved on the server and kept on the phone): the screen adds it to what it knows. */
  onSavedOwn: (own: Move) => void;
};

/**
 * The program editor (K-968 "Type it in"; K-970's Edit reuses it): each day with its name, a weekday if the user wants
 * one (a weekday another day has is off), its moves with sets and the rep range, removed or added — found by name in the
 * catalog and the user's own moves, or made their own (OwnMoveForm, the engine's questions asked, U1). The rules are
 * programEdit.ts; what is done with the program is the screen's.
 */
export function ProgramEditor({ days, onChange, moves, onSavedOwn }: Props) {
  const byId = useMemo(() => new Map(moves.map((m) => [m.id, m])), [moves]);
  return (
    <View style={styles.editor}>
      {days.map((day, at) => (
        <DayEditor key={at} days={days} at={at} moves={moves} byId={byId} onChange={onChange} onSavedOwn={onSavedOwn} />
      ))}
      <Button label={t('programEditor.addDay')} variant="ghost" disabled={days.length >= P.programDaysMax} onPress={() => onChange(newDay(days))} />
    </View>
  );
}

type DayProps = Omit<Props, 'days'> & { days: EditedDay[]; at: number; byId: ReadonlyMap<string, Move> };

function DayEditor({ days, at, moves, byId, onChange, onSavedOwn }: DayProps) {
  const { color } = useTheme();
  const day = days[at];
  const toggle = (weekday: Schemas['Weekday']) => onChange(withWeekday(days, at, day.weekday === weekday ? undefined : weekday));
  const remove =
    days.length > 1 ? (
      <Button
        label={t('programEditor.removeDay')}
        accessibilityLabel={t('programEditor.removeDayLabel', { day: day.name })}
        variant="ghost"
        size="sm"
        onPress={() => onChange(withoutDay(days, at))}
      />
    ) : null;
  const none = day.moves.length === 0 ? <Text style={[styles.small, { color: color.muted }]}>{t('programEditor.noMoves')}</Text> : null;
  return (
    <View style={[styles.day, { borderColor: color.line }]}>
      <TextField label={t('programEditor.dayName')} value={day.name} onChangeText={(name) => onChange(renamed(days, at, name))} maxLength={P.programDayNameMaxChars} />
      <Text style={[styles.small, { color: color.muted }]}>{t('programEditor.weekday')}</Text>
      <View style={styles.row}>
        {WEEKDAYS.map((weekday) => (
          <Chip
            key={weekday}
            label={t(`programEditor.weekdayShort.${weekday}`)}
            accessibilityLabel={t(`onboarding.schedule.dayName.${weekday}`)}
            selected={day.weekday === weekday}
            disabled={weekdayTaken(days, at, weekday)}
            onPress={() => toggle(weekday)}
          />
        ))}
      </View>
      {none}
      {day.moves.map((move, index) => {
        const name = exerciseName(move.exerciseId, byId);
        const step = (field: 'sets' | 'min' | 'max') => (by: number) => onChange(stepped(days, at, index, field, by));
        return (
          <View key={`${move.exerciseId}-${index}`} style={styles.move}>
            <View style={styles.moveHead}>
              <Text style={[styles.name, { color: color.text }]}>{name}</Text>
              <Button
                label={t('programEditor.removeMove')}
                accessibilityLabel={t('programEditor.removeMoveLabel', { move: name })}
                variant="ghost"
                size="sm"
                onPress={() => onChange(withoutMove(days, at, index))}
              />
            </View>
            <View style={styles.row}>
              <Stepper caption={t('programEditor.sets')} label={t('programEditor.setsLabel', { move: name })} value={move.sets} onStep={step('sets')} />
              <Stepper caption={t('programEditor.repsMin')} label={t('programEditor.minLabel', { move: name })} value={move.reps.min} onStep={step('min')} />
              <Stepper caption={t('programEditor.repsMax')} label={t('programEditor.maxLabel', { move: name })} value={move.reps.max} onStep={step('max')} />
            </View>
          </View>
        );
      })}
      <AddMove day={day} moves={moves} byId={byId} onAdd={(move) => onChange(withMove(days, at, move))} onSavedOwn={onSavedOwn} />
      {remove}
    </View>
  );
}

type StepperProps = { caption: string; label: string; value: number; onStep: (by: number) => void };

/** A number stepped one at a time: a button each way, and the value itself adjustable for VoiceOver (swipe up or down). */
function Stepper({ caption, label, value, onStep }: StepperProps) {
  const { color } = useTheme();
  const button = (by: number, key: 'less' | 'more') => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(`programEditor.${key}Label`, { what: label })}
      onPress={() => onStep(by)}
      hitSlop={tokens.space.xs}
      style={styles.stepButton}>
      <Text style={[styles.name, { color: color.text }]}>{t(`programEditor.${key}`)}</Text>
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      <Text style={[styles.small, { color: color.muted }]}>{caption}</Text>
      <View style={[styles.steps, { backgroundColor: color.surface }]}>
        {button(-1, 'less')}
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ now: value }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) => onStep(event.nativeEvent.actionName === 'increment' ? 1 : -1)}>
          <Text style={[styles.name, { color: color.text }]}>{value}</Text>
        </View>
        {button(1, 'more')}
      </View>
    </View>
  );
}

type AddProps = { day: EditedDay; moves: Move[]; byId: ReadonlyMap<string, Move>; onAdd: (move: Move) => void; onSavedOwn: (own: Move) => void };

/** "Add a move": found by name (not one the day has), or made the user's own; one search open at a time per day. */
function AddMove({ day, moves, byId, onAdd, onSavedOwn }: AddProps) {
  const { api, training, report } = useAppServices();
  const { color } = useTheme();
  const [query, setQuery] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const full = day.moves.length >= P.programDayMovesMax;
  const add = (move: Move | undefined) => {
    if (move !== undefined) onAdd(move);
    setQuery(null);
    setCreating(null);
  };

  // Saved online, as in a session (K-416): kept on the phone from the server's answer at once.
  const save = async (body: Schemas['NewCustomExercise']): Promise<SaveOutcome> => {
    try {
      const { data: kept, error } = await api.POST('/v1/custom-exercises', { body });
      if (kept === undefined) {
        report({ name: error?.code ?? 'Unknown' });
        return 'refused';
      }
      await training.saved(kept);
      const own = ownMove(kept);
      onSavedOwn(own);
      add(own);
      return 'saved';
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      return 'offline';
    }
  };

  if (creating !== null) {
    return <OwnMoveForm name={creating} catalog={moves} onPick={(id) => add(byId.get(id))} onSave={save} onBack={() => setCreating(null)} />;
  }
  if (query === null) return <Button label={t('workout.add.open')} variant="ghost" size="sm" disabled={full} onPress={() => setQuery('')} />;
  const found = findMoves(query, moves, new Set(day.moves.map((m) => m.exerciseId)));
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
  add: { gap: tokens.space.sm },
  found: { padding: tokens.space.sm, borderRadius: tokens.radius.button },
  name: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold, flexShrink: 1 },
  small: { fontSize: tokens.type.bodySmall },
});
