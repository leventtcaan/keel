import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ProblemText } from '@/components/ProblemText';
import { t } from '@/copy';
import { StepFrame } from '@/onboarding/StepFrame';
import { useSendOwnProgram } from '@/onboarding/useSendOwnProgram';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { ProgramEditor } from '@/train/ProgramEditor';
import { type EditedDay, newDay, ownProgramOf } from '@/train/programEdit';
import type { Move } from '@/train/trainData';

/**
 * #ob-own's "Type it in" (K-968, ADR-073 #1b): the user writes their program in the program editor, starting from one
 * empty day. "Use this program" sends it (PUT /v1/program) once every day has a name and a move, and the walk goes on as
 * from the import. Nothing is sent before; an own move goes when the user saves it.
 */
export default function ProgramTypeStep() {
  const { api, training } = useAppServices();
  const { color } = useTheme();
  const { send, saving, problem, occurrence } = useSendOwnProgram();
  const [days, setDays] = useState<EditedDay[]>(() => newDay([]));
  // The catalog and the user's own moves, from the server or the copy kept on the phone (K-405, K-416).
  const [moves, setMoves] = useState<Move[] | 'failed' | null>(null);
  useEffect(() => {
    void Promise.all([training.read(api), training.own(api)]).then(
      ([data, own]) => setMoves(data.exercises.state === 'ready' ? [...data.exercises.value, ...own] : 'failed'),
      () => setMoves('failed'),
    );
  }, [api, training]);

  const program = ownProgramOf(days);
  const note = (key: string) => <Text style={[styles.text, { color: color.textSecondary }]}>{t(key)}</Text>;
  const catalogNote = moves === null ? note('import.loadingMoves') : moves === 'failed' ? note('import.noMoves') : null;
  const editor = Array.isArray(moves) ? (
    <ProgramEditor
      days={days}
      onChange={setDays}
      moves={moves}
      onSavedOwn={(own) => setMoves((before) => [...(Array.isArray(before) ? before : []).filter((m) => m.id !== own.id), own])}
    />
  ) : null;
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
      {program === null && note('onboarding.typeProgram.waiting')}
      <Button label={t('onboarding.typeProgram.confirm')} disabled={program === null || saving} onPress={() => program !== null && void send([], () => program)} />
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
