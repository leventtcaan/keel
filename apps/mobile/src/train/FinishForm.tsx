import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { workoutParams } from './params';
import { exerciseName } from './program';
import type { Move } from './trainData';

type Props = {
  /** The moves with a set done this session that were left before their last set: a move done was asked on its card (9b, FormCheck). */
  moves: string[];
  /** The catalog's moves and the user's own: an own move by the name they gave it. */
  named: ReadonlyMap<string, Move>;
  unclean: Set<string>;
  onMark: (exerciseId: string, clean: boolean) => void;
  /** The session's note (K-422), optional. */
  note: string;
  onNote: (text: string) => void;
  onFinish: () => void;
  onBack: () => void;
  busy: boolean;
  /** The finish is being kept: its button says so. */
  saving?: boolean;
};

/**
 * Before the workout ends: the session's note, and, for a move left before its last set (the others were asked on their card, 9b;
 * ADR-094 Ek 2 › Uygulama #5), was its form clean? A move that was not keeps its weight and reps next time (G6 K-31, K-217). Clean is
 * the default: the question is asked, never assumed against the user.
 */
export function FinishForm({ moves, named, unclean, onMark, note, onNote, onFinish, onBack, busy, saving = false }: Props) {
  const { color } = useTheme();
  return (
    <View testID="finish-form" style={styles.form}>
      {moves.length === 0 ? null : <Text style={[styles.heading, { color: color.text }]}>{t('workout.form.title')}</Text>}
      {moves.map((id) => (
        <View key={id} style={styles.move}>
          <Text style={[styles.text, styles.name, { color: color.text }]}>{exerciseName(id, named)}</Text>
          <Chip
            label={t('workout.form.clean')}
            accessibilityLabel={`${exerciseName(id, named)}: ${t('workout.form.clean')}`}
            selected={!unclean.has(id)}
            onPress={() => onMark(id, true)}
          />
          <Chip
            label={t('workout.form.unclean')}
            accessibilityLabel={`${exerciseName(id, named)}: ${t('workout.form.unclean')}`}
            selected={unclean.has(id)}
            onPress={() => onMark(id, false)}
          />
        </View>
      ))}
      <TextField label={t('workout.note.session')} value={note} onChangeText={onNote} maxLength={workoutParams.noteMaxChars} multiline />
      <Button label={t(saving ? 'workout.saving' : 'workout.finishNow')} onPress={onFinish} disabled={busy} busy={saving} />
      <Button label={t('workout.keepGoing')} variant="ghost" onPress={onBack} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: tokens.space.md },
  move: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  name: { flex: 1 },
  heading: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
});
