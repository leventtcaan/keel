import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { newClientId } from '@/sync/send';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { findMoves } from './moves';
import { type OwnAnswers, ownMoveBody } from './ownMove';
import { workoutParams } from './params';
import { exerciseName } from './program';
import type { Move } from './trainData';

type Schemas = components['schemas'];
export type SaveOutcome = 'saved' | 'offline' | 'refused';

type Props = {
  /** What was typed in the search: the name to start from. */
  name: string;
  /** The catalog's moves not in the session yet: the matches offered before anything is created. */
  catalog: Move[];
  onPick: (exerciseId: string) => void;
  onSave: (body: Schemas['NewCustomExercise']) => Promise<SaveOutcome>;
  onBack: () => void;
};

const KINDS: Schemas['NewCustomExercise']['kind'][] = ['COMPOUND', 'ISOLATION'];
const EQUIPMENT: Schemas['Equipment'][] = ['BARBELL', 'DUMBBELL', 'MACHINE', 'CABLE', 'PLATE_LOADED', 'BODYWEIGHT'];

/**
 * A move the catalog does not have (K-416, ADR-035): the catalog's matches for the name first — a move already there is
 * picked, not made again — then the engine's questions, each answered by the user (U1). Saved on the server, online:
 * one clientId until it is kept, so a second try after a lost answer is the same move (ADR-024).
 */
export function OwnMoveForm({ name: typed, catalog, onPick, onSave, onBack }: Props) {
  const { color } = useTheme();
  const [answers, setAnswers] = useState<OwnAnswers>({ name: typed, kind: null, equipment: null, added: null, unilateral: null });
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const clientId = useRef<string | null>(null);
  const body = ownMoveBody(answers, '');
  const similar = findMoves(answers.name, catalog);
  const set = (change: Partial<OwnAnswers>) => setAnswers((before) => ({ ...before, ...change }));

  const save = async () => {
    if (body === null || busy) return;
    setBusy(true);
    const id = (clientId.current ??= newClientId());
    const outcome = await onSave({ ...body, clientId: id });
    setBusy(false);
    setProblem(outcome === 'saved' ? null : t(`ownMove.${outcome}`));
  };

  const question = (key: string, choices: { label: string; on: boolean; pick: () => void }[]) => (
    <View style={styles.question}>
      <Text style={[styles.text, { color: color.text }]}>{t(key)}</Text>
      <View style={styles.chips}>
        {choices.map((c) => (
          <Chip key={c.label} label={c.label} accessibilityLabel={`${t(key)} ${c.label}`} selected={c.on} onPress={c.pick} />
        ))}
      </View>
    </View>
  );

  // Asked only when the body is the equipment: the server pairs a bodyweight load with it, and only with it.
  const bodyweight = answers.equipment === 'BODYWEIGHT';
  const addedQuestion = bodyweight
    ? question('ownMove.added', [
        { label: t('ownMove.addedYes'), on: answers.added === true, pick: () => set({ added: true }) },
        { label: t('ownMove.no'), on: answers.added === false, pick: () => set({ added: false }) },
      ])
    : null;

  return (
    <View style={styles.form}>
      <Text style={[styles.heading, { color: color.text }]}>{t('ownMove.title')}</Text>
      <TextField label={t('ownMove.name')} value={answers.name} onChangeText={(name) => set({ name })} maxLength={workoutParams.ownMoveNameMaxChars} />
      {similar.length > 0 && <Text style={[styles.small, { color: color.muted }]}>{t('ownMove.similar')}</Text>}
      {similar.map((m) => (
        <Pressable
          key={m.id}
          accessibilityRole="button"
          accessibilityLabel={t('workout.add.pick', { name: exerciseName(m.id) })}
          onPress={() => onPick(m.id)}
          style={styles.match}>
          <Text style={[styles.text, { color: color.text }]}>{exerciseName(m.id)}</Text>
        </Pressable>
      ))}
      {question(
        'ownMove.kind',
        KINDS.map((kind) => ({ label: t(`ownMove.kinds.${kind}`), on: answers.kind === kind, pick: () => set({ kind }) })),
      )}
      {question(
        'ownMove.equipment',
        EQUIPMENT.map((equipment) => ({ label: t(`ownMove.equipments.${equipment}`), on: answers.equipment === equipment, pick: () => set({ equipment }) })),
      )}
      {addedQuestion}
      {question('ownMove.unilateral', [
        { label: t('ownMove.yes'), on: answers.unilateral === true, pick: () => set({ unilateral: true }) },
        { label: t('ownMove.no'), on: answers.unilateral === false, pick: () => set({ unilateral: false }) },
      ])}
      {problem !== null && <Text style={[styles.text, { color: color.text }]}>{problem}</Text>}
      <Button label={t('ownMove.save')} onPress={() => void save()} disabled={body === null || busy} />
      <Button label={t('ownMove.back')} variant="ghost" size="sm" onPress={onBack} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: tokens.space.md },
  question: { gap: tokens.space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  match: { padding: tokens.space.sm, borderRadius: tokens.radius.button },
  heading: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
