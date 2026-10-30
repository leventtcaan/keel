/**
 * "Add a move" (Evre 7 B2, plan/evre-7-inceleme.md §12; replaces the flat A to Z sheet). A search on top, five muscle chips (each a
 * small body with the group's area lit) and the equipment chips under it; "Popular for <group>" first, then the rest. A row is the
 * move's equipment icon, its name and "Chest · Barbell"; tapping it opens a short preview in place (the muscles, the equipment, its
 * three cues) with "Add to <day>", and the "+" at the row's end adds it at once for someone who knows the name. Not knowing move
 * names is the normal case here; the user's own move (OwnMoveForm) is still one button away.
 */
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { ModalClose } from '@/components/ModalClose';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { useReduceMotion } from '@/theme/useReduceMotion';

import { tipsFor } from './demo';
import { type Group, type Section, groupsOf, pickerSections, subtitleOf } from './pickerSections';
import { MoveThumb } from './MoveThumb';
import { MuscleGlyph } from './MuscleGlyph';
import { OwnMoveForm, type SaveOutcome } from './OwnMoveForm';
import { workoutParams as P } from './params';
import { exerciseName } from './program';
import type { EditedDay } from './programEdit';
import { repsText } from './reps';
import type { Move } from './trainData';

type Schemas = components['schemas'];
type Equipment = Schemas['Equipment'];

/** The equipment chips, in the order shown (the catalog's classes). */
const EQUIPMENT: readonly Equipment[] = ['BARBELL', 'DUMBBELL', 'MACHINE', 'CABLE', 'PLATE_LOADED', 'BODYWEIGHT'];

type Props = {
  /** The day the move goes to: its name is said, and its own moves tell which groups it is about. */
  day: EditedDay;
  /** The catalog's moves and the user's own. */
  moves: Move[];
  byId: ReadonlyMap<string, Move>;
  makeOwn: (body: Schemas['NewCustomExercise']) => Promise<Move | Exclude<SaveOutcome, 'saved'>>;
  onAdd: (move: Move) => void;
  onClose: () => void;
};

const groupName = (group: Group) => t(`movePicker.group.${group}`);

function titleOf(section: Section): string | null {
  switch (section.kind) {
    case 'popular':
      return t('movePicker.popularFor', { group: groupName(section.group ?? '').toLocaleLowerCase('en') });
    case 'popularMix':
      return t('movePicker.popular');
    case 'more':
      return t('movePicker.moreFor', { group: groupName(section.group ?? '').toLocaleLowerCase('en') });
    case 'all':
      return t('movePicker.all');
    case 'results':
      return null;
  }
}

export function MovePicker({ day, moves, byId, makeOwn, onAdd, onClose }: Props) {
  const { color } = useTheme();
  const reduceMotion = useReduceMotion();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<Group | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [own, setOwn] = useState(false);
  // The moves the day does not have: what is offered, in the lists and in the own-move form's "Is it one of these?".
  const offered = useMemo(() => {
    const has = new Set(day.moves.map((m) => m.exerciseId));
    return moves.filter((m) => !has.has(m.id));
  }, [day.moves, moves]);
  const dayMoves = useMemo(() => day.moves.flatMap((m) => (byId.has(m.exerciseId) ? [byId.get(m.exerciseId) as Move] : [])), [day.moves, byId]);
  const sections = useMemo(() => pickerSections({ offered, day: dayMoves, query, group, equipment }), [offered, dayMoves, query, group, equipment]);
  const full = day.moves.length >= P.programDayMovesMax;
  const save = async (body: Schemas['NewCustomExercise']): Promise<SaveOutcome> => {
    const made = await makeOwn(body);
    if (typeof made === 'string') return made;
    onAdd(made);
    return 'saved';
  };
  const filtered = group !== null || equipment !== null;
  const clear = () => {
    setGroup(null);
    setEquipment(null);
    setQuery('');
  };

  const chips = (
    <View style={styles.filters}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} keyboardShouldPersistTaps="handled">
        {groupsOf().map((g) => {
          const on = group === g;
          return (
            <Pressable
              key={g}
              accessibilityRole="button"
              accessibilityLabel={groupName(g)}
              accessibilityState={{ selected: on }}
              onPress={() => setGroup(on ? null : g)}
              style={[styles.groupChip, on ? { backgroundColor: color.text, borderColor: color.text } : { backgroundColor: color.surface, borderColor: color.edge }]}>
              <MuscleGlyph group={g} tone={on ? color.edge : undefined} />
              <Text style={[styles.chipText, { color: on ? color.background : color.text }]}>{groupName(g)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} keyboardShouldPersistTaps="handled">
        {EQUIPMENT.map((e) => {
          const on = equipment === e;
          return (
            <Pressable
              key={e}
              accessibilityRole="button"
              accessibilityLabel={t(`ownMove.equipments.${e}`)}
              accessibilityState={{ selected: on }}
              onPress={() => setEquipment(on ? null : e)}
              style={[styles.equipChip, on ? { backgroundColor: color.text, borderColor: color.text } : { backgroundColor: color.surface, borderColor: color.edge }]}>
              <Text style={[styles.chipText, { color: on ? color.background : color.text }]}>{t(`ownMove.equipments.${e}`)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const row = (move: Move) => {
    const name = exerciseName(move.id, byId);
    const range = repsText(P.programNewMoveReps[move.kind]);
    const expanded = open === move.id;
    const preview = !expanded ? null : (
      <View style={styles.preview}>
        <View style={styles.pills}>
          {move.muscles.map((m) => (
            <View key={m} style={[styles.pill, { backgroundColor: color.raise }]}>
              <Text style={[styles.pillText, { color: color.text }]}>{t(`demo.muscle.${m}`)}</Text>
            </View>
          ))}
          <View style={[styles.pill, { backgroundColor: color.raise }]}>
            <Text style={[styles.pillText, { color: color.text }]}>{t(`ownMove.equipments.${move.equipment}`)}</Text>
          </View>
        </View>
        {tipsFor(move).map((key) => (
          <View key={key} style={styles.cue}>
            <View style={[styles.dot, { backgroundColor: color.accent }]} />
            <Text style={[styles.cueText, { color: color.text }]}>{t(key)}</Text>
          </View>
        ))}
        <Button
          label={t('movePicker.add', { day: day.name })}
          accessibilityLabel={t('movePicker.addLabel', { name, day: day.name })}
          disabled={full}
          onPress={() => onAdd(move)}
        />
      </View>
    );
    return (
      <View key={move.id} style={[styles.card, { backgroundColor: color.surface }]}>
        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('movePicker.rowLabel', { name, about: subtitleOf(move) })}
            accessibilityState={{ expanded }}
            onPress={() => setOpen(expanded ? null : move.id)}
            style={styles.rowMain}>
            <MoveThumb equipment={move.equipment} />
            <View style={styles.texts}>
              <Text style={[styles.name, { color: color.text }]}>{name}</Text>
              <Text style={[styles.sub, { color: color.muted }]}>{subtitleOf(move)}</Text>
            </View>
            <Text style={[styles.sub, { color: color.muted }]}>{range}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('programEditor.pickLabel', { name, range })}
            accessibilityState={{ disabled: full }}
            disabled={full}
            onPress={() => onAdd(move)}
            hitSlop={tokens.space.xs}
            style={({ pressed }) => [styles.plus, pressed && styles.dim, full && styles.dim]}>
            <Icon name="plus.circle.fill" tone="accent" />
          </Pressable>
        </View>
        {preview}
      </View>
    );
  };

  const list = sections.map((section, index) => {
    const title = titleOf(section);
    // Built outside the JSX children (the raw-text guard reads them).
    const heading =
      title === null ? null : (
        <Text accessibilityRole="header" style={[styles.heading, { color: color.text }]}>
          {title}
        </Text>
      );
    return (
      <View key={`${section.kind}-${section.group ?? index}`} style={styles.section}>
        {heading}
        {section.moves.map(row)}
      </View>
    );
  });
  const clearButton = filtered ? <Button label={t('movePicker.clear')} variant="secondary" size="touch" onPress={clear} /> : null;
  const none =
    sections.length > 0 ? null : (
      <View style={styles.section}>
        <Text style={[styles.sub, { color: color.muted }]}>{query.trim() !== '' ? t('programEditor.none') : t('movePicker.empty')}</Text>
        {clearButton}
      </View>
    );

  const body = own ? (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
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
    </ScrollView>
  ) : (
    <>
      <View style={styles.top}>
        <View style={[styles.search, { backgroundColor: color.surface, borderColor: color.edge }]}>
          <Icon name="magnifyingglass" size="small" tone="muted" />
          <TextInput
            accessibilityLabel={t('programEditor.search')}
            placeholder={t('programEditor.search')}
            placeholderTextColor={color.muted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={[styles.input, { color: color.text }]}
          />
        </View>
        {chips}
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {list}
        {none}
        <Button label={t('programEditor.addOwn')} variant="secondary" onPress={() => setOwn(true)} />
      </ScrollView>
    </>
  );
  return (
    <Modal animationType={reduceMotion ? 'none' : 'slide'} presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
        <ModalClose title={t('programEditor.addMove')} label={t('programEditor.close')} onPress={onClose} />
        <Text style={[styles.to, { color: color.textSecondary }]}>{t('programEditor.sheetTo', { day: day.name, sets: P.programNewMoveSets })}</Text>
        {body}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  to: { fontSize: tokens.type.bodySmall, paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.sm },
  top: { gap: tokens.space.sm, paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.sm },
  search: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, minHeight: tokens.size.touch, paddingHorizontal: tokens.space.md, borderRadius: tokens.radius.button, borderWidth: tokens.border.hairline },
  input: { flex: 1, minHeight: tokens.size.touch, fontSize: tokens.type.body },
  filters: { gap: tokens.space.sm, marginHorizontal: -tokens.space.lg },
  chipRow: { gap: tokens.space.sm, paddingHorizontal: tokens.space.lg },
  groupChip: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs, minHeight: tokens.size.touch, paddingHorizontal: tokens.space.md, borderRadius: tokens.radius.chip, borderWidth: tokens.border.hairline },
  equipChip: { justifyContent: 'center', minHeight: tokens.size.touch, paddingHorizontal: tokens.space.md, borderRadius: tokens.radius.chip, borderWidth: tokens.border.hairline },
  chipText: { fontSize: tokens.type.bodySmall },
  scroll: { padding: tokens.space.lg, gap: tokens.space.lg },
  section: { gap: tokens.space.sm },
  heading: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  card: { borderRadius: tokens.radius.card, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: tokens.space.md, minHeight: tokens.size.row, padding: tokens.space.sm },
  texts: { flex: 1, gap: tokens.space.xs },
  name: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  sub: { fontSize: tokens.type.bodySmall },
  plus: { minWidth: tokens.size.touch, minHeight: tokens.size.touch, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: tokens.opacity.dim },
  preview: { gap: tokens.space.sm, padding: tokens.space.md, paddingTop: tokens.space.xs },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  pill: { borderRadius: tokens.radius.chip, paddingHorizontal: tokens.space.md, paddingVertical: tokens.space.xs },
  pillText: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold },
  cue: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  cueText: { flex: 1, fontSize: tokens.type.bodySmall },
  dot: { width: tokens.size.swatch, height: tokens.size.swatch, borderRadius: tokens.size.swatch / 2 },
});
