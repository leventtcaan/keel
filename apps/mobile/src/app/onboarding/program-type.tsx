import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { ProblemText } from '@/components/ProblemText';
import { t } from '@/copy';
import { StepFrame } from '@/onboarding/StepFrame';
import { useSendOwnProgram } from '@/onboarding/useSendOwnProgram';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { ProgramEditor } from '@/train/ProgramEditor';
import { type EditedDay, newDay, ownProgramOf, pendingIn, pendingMove } from '@/train/programEdit';
import type { Move } from '@/train/trainData';

type Schemas = components['schemas'];

/**
 * #ob-own's "Type it in" (K-968, ADR-073 #1b): the user writes their program in the program editor, starting from one
 * empty day. An own move they make waits on the phone (pending) with its answers and one clientId; "Use this program"
 * makes the own moves the program still names, then sends the program naming them (PUT /v1/program), as the import does
 * (ADR-073 Ek 2: a program not confirmed leaves nothing behind). Then the walk goes on.
 */
export default function ProgramTypeStep() {
  const { api, training } = useAppServices();
  const { color } = useTheme();
  const { send, saving, problem, occurrence } = useSendOwnProgram();
  const [days, setDays] = useState<EditedDay[]>(() => newDay([]));
  // The own moves answered, by their pending id: made only with the program.
  const [pending, setPending] = useState<ReadonlyMap<string, Schemas['NewCustomExercise']>>(new Map());
  // The catalog and the user's own moves, from the server or the copy kept on the phone (K-405, K-416).
  const [moves, setMoves] = useState<Move[] | 'failed' | null>(null);
  useEffect(() => {
    void Promise.all([training.read(api), training.own(api)]).then(
      ([data, own]) => setMoves(data.exercises.state === 'ready' ? [...data.exercises.value, ...own] : 'failed'),
      () => setMoves('failed'),
    );
  }, [api, training]);

  const makeOwn = async (body: Schemas['NewCustomExercise']): Promise<Move> => {
    const move = pendingMove(body);
    setPending((before) => new Map(before).set(move.id, body));
    setMoves((before) => [...(Array.isArray(before) ? before : []), move]);
    return move;
  };
  const used = pendingIn(days);
  const ready = ownProgramOf(days, new Map(used.map((id) => [id, id]))) !== null;
  const confirm = () => {
    if (!ready) return;
    void send(
      used.map((id) => pending.get(id)!),
      (ids) => ownProgramOf(days, new Map(used.map((id, i) => [id, ids[i]]))),
    );
  };

  const note = (key: string) => <Text style={[styles.text, { color: color.textSecondary }]}>{t(key)}</Text>;
  const catalogNote = moves === null ? note('import.loadingMoves') : moves === 'failed' ? note('import.noMoves') : null;
  const editor = Array.isArray(moves) ? <ProgramEditor days={days} onChange={setDays} moves={moves} makeOwn={makeOwn} /> : null;
  const shown =
    problem === null ? null : (
      <ProblemText occurrence={occurrence} style={[styles.text, { color: color.text }]}>
        {problem}
      </ProblemText>
    );
  const actions = (
    <View style={styles.actions}>
      {shown}
      {saving && note('onboarding.programImport.saving')}
      {!ready && note('onboarding.typeProgram.waiting')}
      <Button label={t('onboarding.typeProgram.confirm')} disabled={!ready || saving} onPress={confirm} />
    </View>
  );

  return (
    <StepFrame step="ownProgram" title={t('onboarding.typeProgram.title')} why={t('onboarding.typeProgram.why')} chosen actions={actions} backDisabled={saving}>
      {catalogNote}
      {editor}
    </StepFrame>
  );
}

const styles = StyleSheet.create({
  actions: { gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
});
