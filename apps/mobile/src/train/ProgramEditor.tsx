import { type ReactNode, useMemo, useState } from 'react';
import { ActionSheetIOS, Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { announce } from '@/components/ProblemText';
import { Icon } from '@/components/Icon';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { askFirst } from '@/settings/askFirst';

import { MovePicker } from './MovePicker';
import type { SaveOutcome } from './OwnMoveForm';
import { workoutParams as P } from './params';
import { exerciseName } from './program';
import {
  type EditedDay,
  type EditedMove,
  type Stepped,
  WEEKDAYS,
  canStep,
  newDay,
  nextDayId,
  renamed,
  stepped,
  weekdayTaken,
  withDayAt,
  movedMove,
  withMove,
  withMoveAt,
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
  /**
   * "Add a day" is the screen's, not the editor's (Edit: the server fills the day, ADR-090 Ek 1). Absent, the editor adds its own
   * empty day (a typed program in onboarding has no server program yet).
   */
  onAddDay?: () => void;
};

/**
 * What was removed last, to put back (Undo): a day where it was, or a move where it was in its day; the bar to put it back
 * is shown in that place (`where`).
 */
type Removed = { name: string; undo: Parameters<Update>[0]; where: { at: number } | { dayId: string; index: number } };

const movesWord = (count: number) => t(count === 1 ? 'programEditor.moves.one' : 'programEditor.moves.other', { count });

/**
 * The program editor (K-968 "Type it in"; K-970's Edit reuses it; prototype `#ob-type`, sheet `addmove`): every day a
 * card, one open at a time — its header the day's name (wrapped, never cut: accessibility.test.ts), its weekday or "Any
 * day" and its moves, or "No moves yet"; open, the name and "Remove this day", a weekday if the user wants one (a weekday
 * another day has is off), its moves each with its sets and the fewest and the most reps, and "Add a move": a sheet that
 * finds a move in the catalog and the user's own (not one the day has), or makes the user's own. A move or a day removed
 * can be put back (Undo). A new day opens; under the cards, "Add a day" while there are fewer than a program has. The
 * rules are programEdit.ts; what is done with the program, and with an own move, is the screen's.
 */
export function ProgramEditor({ days, onChange, moves, makeOwn, onAddDay }: Props) {
  const { color } = useTheme();
  const byId = useMemo(() => new Map(moves.map((m) => [m.id, m])), [moves]);
  const [open, setOpen] = useState<string | null>(days[0]?.id ?? null);
  const [adding, setAdding] = useState<EditedDay | null>(null);
  const [removed, setRemoved] = useState<Removed | null>(null);

  const addDay = () => {
    // Where the screen has a better way (Edit: the server fills the day, ADR-090 Ek 1), it is the screen's; the editor's own empty
    // day is the way for a typed program that has no server yet (onboarding's "Type it in").
    if (onAddDay !== undefined) return onAddDay();
    const id = nextDayId();
    onChange((all) => newDay(all, id));
    setOpen(id);
  };
  // Said to VoiceOver as well (it hears only what it is on): what went, and that the bar to put it back is there.
  const gone = (what: Removed) => {
    setRemoved(what);
    announce(t('programEditor.removed', { name: what.name }));
  };
  const removeDay = (day: EditedDay, at: number) => {
    onChange((all) => withoutDay(all, at));
    gone({ name: day.name, undo: (all) => withDayAt(all, day, at), where: { at } });
  };
  const removeMove = (day: EditedDay, index: number) => {
    const move = day.moves[index];
    onChange((all) => {
      const at = all.findIndex((d) => d.id === day.id);
      return at < 0 ? all : withoutMove(all, at, index);
    });
    gone({ name: exerciseName(move.exerciseId, byId), undo: (all) => withMoveAt(all, day.id, move, index), where: { dayId: day.id, index } });
  };
  const reorder = (day: EditedDay, from: number, to: number) => onChange((all) => {
    const at = all.findIndex((d) => d.id === day.id);
    return at < 0 ? all : movedMove(all, at, from, to);
  });
  // The bar goes only once the thing is back: put back where it cannot be (the move is in the day again), it stays.
  const undo = () => {
    if (removed === null || removed.undo(days) === days) return;
    onChange(removed.undo);
    setRemoved(null);
  };
  const bar = removed === null ? null : <UndoBar key="undo" name={removed.name} onUndo={undo} />;
  const dayBar = (at: number) => (removed !== null && 'at' in removed.where && removed.where.at === at ? bar : null);
  const moveBar = (dayId: string) => (removed !== null && 'dayId' in removed.where && removed.where.dayId === dayId ? { index: removed.where.index, bar } : null);

  const count = days.reduce((n, day) => n + day.moves.length, 0);
  const dayWords = t(days.length === 1 ? 'programEditor.days.one' : 'programEditor.days.other', { count: days.length });
  const summary = t('programEditor.summary', { days: dayWords, moves: movesWord(count) });
  const more = days.length < P.programDaysMax ? <Button label={t('programEditor.addDay')} variant="ghost" onPress={addDay} /> : null;
  // The day as it is now (not as it was when the picker opened): the moves it has are not offered again.
  const pickerDay = adding === null ? null : (days.find((d) => d.id === adding.id) ?? adding);
  const sheet =
    adding === null || pickerDay === null ? null : (
      <MovePicker
        day={pickerDay}
        moves={moves}
        byId={byId}
        makeOwn={makeOwn}
        onAdd={(move) => {
          onChange((all) => {
            const at = all.findIndex((d) => d.id === adding.id);
            return at < 0 ? all : withMove(all, at, move);
          });
          setAdding(null);
        }}
        onClose={() => setAdding(null)}
      />
    );
  return (
    <View style={styles.editor}>
      <Text style={[styles.small, { color: color.muted }]}>{summary}</Text>
      {days.map((day, at) => [
        dayBar(at),
        <DayCard
          key={day.id}
          day={day}
          at={at}
          open={open === day.id}
          onOpen={() => setOpen(open === day.id ? null : day.id)}
          alone={days.length === 1}
          taken={(w) => weekdayTaken(days, at, w)}
          byId={byId}
          onChange={onChange}
          onRemoveDay={() => removeDay(day, at)}
          onRemoveMove={(index) => removeMove(day, index)}
          onReorder={(from, to) => reorder(day, from, to)}
          onAddMove={() => setAdding(day)}
          undo={moveBar(day.id)}
        />,
      ])}
      {dayBar(days.length)}
      {more}
      {sheet}
    </View>
  );
}

type DayProps = {
  day: EditedDay;
  at: number;
  open: boolean;
  onOpen: () => void;
  /** The only day: it stays. */
  alone: boolean;
  taken: (weekday: Schemas['Weekday']) => boolean;
  byId: ReadonlyMap<string, Move>;
  onChange: Update;
  onRemoveDay: () => void;
  onRemoveMove: (index: number) => void;
  onReorder: (from: number, to: number) => void;
  onAddMove: () => void;
  /** The bar to put back a move removed from this day, where the move was. */
  undo: { index: number; bar: ReactNode } | null;
};

function DayCard({ day, at, open, onOpen, alone, taken, byId, onChange, onRemoveDay, onRemoveMove, onReorder, onAddMove, undo }: DayProps) {
  const { color } = useTheme();
  const weekday = day.weekday === undefined ? t('programEditor.anyDay') : t(`programEditor.weekdayName.${day.weekday}`);
  const moveWords = day.moves.length === 0 ? t('programEditor.noMovesMeta') : movesWord(day.moves.length);
  const head = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('programEditor.dayHeader', { day: day.name, weekday, moves: moveWords })}
      accessibilityState={{ expanded: open }}
      onPress={onOpen}
      style={styles.dayHead}>
      <Text style={[styles.dayName, { color: color.text }]}>{day.name}</Text>
      <Text style={[styles.small, { color: color.muted }]}>{t('programEditor.dayMeta', { weekday, moves: moveWords })}</Text>
    </Pressable>
  );
  if (!open) {
    return (
      <View testID={`day-card-${at}`} style={[styles.day, { borderColor: color.line }]}>
        {head}
        {undo?.bar}
      </View>
    );
  }

  const toggle = (w: Schemas['Weekday']) => onChange((all) => withWeekday(all, at, all[at].weekday === w ? undefined : w));
  // Removing a day is asked first, by the system's own alert (ADR-087 #1): the day and its moves go, with Undo after.
  const remove = alone ? null : (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('programEditor.removeDayLabel', { day: day.name })}
      onPress={() =>
        askFirst({
          title: t('programEditor.removeDayAsk', { day: day.name }),
          body: t('programEditor.removeDayBody', { moves: moveWords }),
          confirmLabel: t('programEditor.removeDayConfirm'),
          keepLabel: t('programEditor.keep'),
          onConfirm: onRemoveDay,
        })
      }
      style={({ pressed }) => [styles.remove, pressed && styles.dim]}>
      <Icon name="trash" size="small" tone="warn" />
      <Text style={[styles.removeText, { color: color.warn }]}>{t('programEditor.removeDay')}</Text>
    </Pressable>
  );
  // One row of captions over the moves' steppers (each stepper also says its own name to VoiceOver).
  const captions =
    day.moves.length === 0 ? (
      <Text style={[styles.small, { color: color.text }]}>{t('programEditor.noMoves')}</Text>
    ) : (
      <View style={styles.captions} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {(['sets', 'repsMin', 'repsMax'] as const).map((key) => (
          <Text key={key} style={[styles.caption, { color: color.muted }]}>
            {t(`programEditor.${key}`)}
          </Text>
        ))}
      </View>
    );
  const undoAt = (index: number) => (undo !== null && undo.index === index ? undo.bar : null);
  return (
    <View testID={`day-card-${at}`} style={[styles.day, { borderColor: color.line }]}>
      {head}
      <TextField label={t('programEditor.dayName')} value={day.name} onChangeText={(name) => onChange((all) => renamed(all, at, name))} maxLength={P.programDayNameMaxChars} />
      {remove}
      <View style={styles.row}>
        {WEEKDAYS.map((w) => (
          <Chip
            key={w}
            label={t(`programEditor.weekdayShort.${w}`)}
            accessibilityLabel={t(`programEditor.weekdayName.${w}`)}
            selected={day.weekday === w}
            disabled={taken(w)}
            touch
            onPress={() => toggle(w)}
          />
        ))}
      </View>
      {captions}
      {day.moves.map((move, index) => [
        undoAt(index),
        <MoveRow
          key={move.exerciseId}
          move={move}
          name={exerciseName(move.exerciseId, byId)}
          onStep={(field, by) => onChange((all) => stepped(all, at, index, field, by))}
          first={index === 0}
          last={index === day.moves.length - 1}
          dayName={day.name}
          onRemove={() => onRemoveMove(index)}
          onMove={(by) => onReorder(index, index + by)}
        />,
      ])}
      {undoAt(day.moves.length)}
      <Button label={t('programEditor.addMove')} variant="ghost" size="touch" disabled={day.moves.length >= P.programDayMovesMax} onPress={onAddMove} />
    </View>
  );
}

/** "{name} removed." and Undo, in the place of what went. */
function UndoBar({ name, onUndo }: { name: string; onUndo: () => void }) {
  const { color } = useTheme();
  return (
    <View testID="undo" style={[styles.snackbar, { backgroundColor: color.surface }]}>
      <Text style={[styles.text, { color: color.text }]}>{t('programEditor.removed', { name })}</Text>
      <Button label={t('programEditor.undo')} accessibilityLabel={t('programEditor.undoLabel', { name })} variant="ghost" size="touch" onPress={onUndo} />
    </View>
  );
}

type MoveProps = {
  move: EditedMove;
  name: string;
  dayName: string;
  first: boolean;
  last: boolean;
  onStep: (field: Stepped, by: number) => void;
  onRemove: () => void;
  onMove: (by: number) => void;
};

/** A move of the day: its name, remove, and three steppers: the sets, the fewest and the most reps. */
function MoveRow({ move, name, dayName, first, last, onStep, onRemove, onMove }: MoveProps) {
  const { color } = useTheme();
  // The system's action sheet: move it up or down the day, or take it out (the red one; Undo follows).
  const options = () => {
    const labels = [
      ...(first ? [] : [t('programEditor.moveUp')]),
      ...(last ? [] : [t('programEditor.moveDown')]),
      t('programEditor.removeFrom', { day: dayName }),
      t('programEditor.cancel'),
    ];
    const destructiveButtonIndex = labels.length - 2;
    ActionSheetIOS.showActionSheetWithOptions({ title: name, options: labels, destructiveButtonIndex, cancelButtonIndex: labels.length - 1 }, (picked) => {
      if (picked === destructiveButtonIndex) return onRemove();
      const chosen = labels[picked];
      if (chosen === t('programEditor.moveUp')) onMove(-1);
      else if (chosen === t('programEditor.moveDown')) onMove(1);
    });
  };
  const stepper = (field: Stepped, label: string, value: number) => (
    <Stepper
      label={t(label, { move: name })}
      value={String(value)}
      less={canStep(move, field, -1)}
      more={canStep(move, field, 1)}
      onStep={(by) => onStep(field, by)}
    />
  );
  return (
    <View style={styles.move}>
      <View style={styles.moveHead}>
        <Text style={[styles.name, { color: color.text }]}>{name}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('programEditor.moveOptionsLabel', { move: name })}
          onPress={options}
          hitSlop={tokens.space.xs}
          style={({ pressed }) => [styles.more, pressed && styles.dim]}>
          <Icon name="ellipsis.circle" />
        </Pressable>
      </View>
      <View style={styles.steppers}>
        {stepper('sets', 'programEditor.setsLabel', move.sets)}
        {stepper('min', 'programEditor.minLabel', move.reps.min)}
        {stepper('max', 'programEditor.maxLabel', move.reps.max)}
      </View>
    </View>
  );
}

type StepperProps = { label: string; value: string; less: boolean; more: boolean; onStep: (by: number) => void };

/** A value stepped one at a time: a button each way (off where it would not change), and the value adjustable for VoiceOver. */
function Stepper({ label, value, less, more, onStep }: StepperProps) {
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
  );
}

const styles = StyleSheet.create({
  editor: { gap: tokens.space.lg },
  day: { gap: tokens.space.sm, paddingTop: tokens.space.md, borderTopWidth: tokens.border.hairline },
  dayHead: { gap: tokens.space.xs, minHeight: tokens.size.touch, justifyContent: 'center' },
  dayName: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  captions: { flexDirection: 'row', gap: tokens.space.sm },
  caption: { flex: 1, fontSize: tokens.type.bodySmall },
  move: { gap: tokens.space.xs },
  moveHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space.sm },
  steppers: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  steps: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: tokens.radius.button },
  stepButton: { minWidth: tokens.size.touch, minHeight: tokens.size.touch, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: tokens.opacity.dim },
  remove: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, minHeight: tokens.size.touch },
  removeText: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  more: { minWidth: tokens.size.touch, minHeight: tokens.size.touch, alignItems: 'center', justifyContent: 'center' },
  snackbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space.sm, padding: tokens.space.sm, borderRadius: tokens.radius.card },
  name: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold, flexShrink: 1 },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
