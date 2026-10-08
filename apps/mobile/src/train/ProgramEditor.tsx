import { type ReactNode, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { announce } from '@/components/ProblemText';
import { ScreenTitle } from '@/components/ScreenTitle';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { useReduceMotion } from '@/theme/useReduceMotion';

import { findMoves } from './moves';
import { OwnMoveForm, type SaveOutcome } from './OwnMoveForm';
import { workoutParams as P } from './params';
import { exerciseName } from './program';
import { repsText } from './reps';
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
export function ProgramEditor({ days, onChange, moves, makeOwn }: Props) {
  const { color } = useTheme();
  const byId = useMemo(() => new Map(moves.map((m) => [m.id, m])), [moves]);
  const [open, setOpen] = useState<string | null>(days[0]?.id ?? null);
  const [adding, setAdding] = useState<EditedDay | null>(null);
  const [removed, setRemoved] = useState<Removed | null>(null);

  const addDay = () => {
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
  const sheet =
    adding === null ? null : (
      <AddMoveSheet
        day={adding}
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
  onAddMove: () => void;
  /** The bar to put back a move removed from this day, where the move was. */
  undo: { index: number; bar: ReactNode } | null;
};

function DayCard({ day, at, open, onOpen, alone, taken, byId, onChange, onRemoveDay, onRemoveMove, onAddMove, undo }: DayProps) {
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
  const remove = alone ? null : (
    <Button label={t('programEditor.removeDay')} accessibilityLabel={t('programEditor.removeDayLabel', { day: day.name })} variant="ghost" size="sm" onPress={onRemoveDay} />
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
          onRemove={() => onRemoveMove(index)}
        />,
      ])}
      {undoAt(day.moves.length)}
      <Button label={t('programEditor.addMove')} variant="ghost" size="sm" disabled={day.moves.length >= P.programDayMovesMax} onPress={onAddMove} />
    </View>
  );
}

/** "{name} removed." and Undo, in the place of what went. */
function UndoBar({ name, onUndo }: { name: string; onUndo: () => void }) {
  const { color } = useTheme();
  return (
    <View testID="undo" style={[styles.snackbar, { backgroundColor: color.surface }]}>
      <Text style={[styles.text, { color: color.text }]}>{t('programEditor.removed', { name })}</Text>
      <Button label={t('programEditor.undo')} accessibilityLabel={t('programEditor.undoLabel', { name })} variant="ghost" size="sm" onPress={onUndo} />
    </View>
  );
}

type MoveProps = { move: EditedMove; name: string; onStep: (field: Stepped, by: number) => void; onRemove: () => void };

/** A move of the day: its name, remove, and three steppers: the sets, the fewest and the most reps. */
function MoveRow({ move, name, onStep, onRemove }: MoveProps) {
  const { color } = useTheme();
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
        <Button label={t('programEditor.removeMove')} accessibilityLabel={t('programEditor.removeMoveLabel', { move: name })} variant="ghost" size="sm" onPress={onRemove} />
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

type SheetProps = Pick<Props, 'moves' | 'makeOwn'> & {
  day: EditedDay;
  byId: ReadonlyMap<string, Move>;
  onAdd: (move: Move) => void;
  onClose: () => void;
};

/**
 * "Add a move" (prototype sheet `addmove`): to the open day, a move found by name in the catalog and the user's own (not
 * one the day has), each with the range it starts from; or "Add my own move", the engine's questions (OwnMoveForm).
 */
function AddMoveSheet({ day, moves, byId, makeOwn, onAdd, onClose }: SheetProps) {
  const { color } = useTheme();
  const reduceMotion = useReduceMotion();
  const [query, setQuery] = useState('');
  const [own, setOwn] = useState(false);
  // The moves the day does not have: what is offered, in the search and in the own-move form's "Is it one of these?".
  const offered = useMemo(() => {
    const has = new Set(day.moves.map((m) => m.exerciseId));
    return moves.filter((m) => !has.has(m.id));
  }, [day.moves, moves]);
  const save = async (body: Schemas['NewCustomExercise']): Promise<SaveOutcome> => {
    const made = await makeOwn(body);
    if (typeof made === 'string') return made;
    onAdd(made);
    return 'saved';
  };
  const found = findMoves(query, offered);
  const none = query.trim() !== '' && found.length === 0 ? <Text style={[styles.small, { color: color.muted }]}>{t('programEditor.none')}</Text> : null;
  const body = own ? (
    <OwnMoveForm
      name={[...query.trim()].slice(0, P.ownMoveNameMaxChars).join('')}
      catalog={offered}
      onPick={(id) => {
        const move = byId.get(id);
        if (move !== undefined) onAdd(move);
      }}
      onSave={save}
      onBack={() => setOwn(false)}
    />
  ) : (
    <View style={styles.add}>
      <TextField label={t('programEditor.search')} value={query} onChangeText={setQuery} onSearch={() => undefined} />
      {found.map((m) => (
        <Pressable
          key={m.id}
          accessibilityRole="button"
          accessibilityLabel={t('programEditor.pickLabel', { name: exerciseName(m.id, byId), range: repsText(P.programNewMoveReps[m.kind]) })}
          onPress={() => onAdd(m)}
          style={styles.found}>
          <Text style={[styles.name, { color: color.text }]}>{exerciseName(m.id, byId)}</Text>
          <Text style={[styles.small, { color: color.muted }]}>{repsText(P.programNewMoveReps[m.kind])}</Text>
        </Pressable>
      ))}
      {none}
      <Button label={t('programEditor.addOwn')} variant="ghost" onPress={() => setOwn(true)} />
    </View>
  );
  return (
    <Modal animationType={reduceMotion ? 'none' : 'slide'} presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
          <ScreenTitle>{t('programEditor.addMove')}</ScreenTitle>
          <Text style={[styles.text, { color: color.textSecondary }]}>{t('programEditor.sheetTo', { day: day.name, sets: P.programNewMoveSets })}</Text>
          {body}
          <Button label={t('programEditor.close')} variant="ghost" onPress={onClose} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  editor: { gap: tokens.space.lg },
  safe: { flex: 1 },
  sheet: { padding: tokens.space.lg, gap: tokens.space.md },
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
  snackbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space.sm, padding: tokens.space.sm, borderRadius: tokens.radius.card },
  add: { gap: tokens.space.sm },
  found: { padding: tokens.space.sm, borderRadius: tokens.radius.button, gap: tokens.space.xs },
  name: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold, flexShrink: 1 },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
