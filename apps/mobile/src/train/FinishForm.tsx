import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { exerciseName } from './program';

type Props = {
  /** The moves with a set done this session. */
  moves: string[];
  unclean: Set<string>;
  onMark: (exerciseId: string, clean: boolean) => void;
  onFinish: () => void;
  onBack: () => void;
  busy: boolean;
};

/**
 * Before the workout ends: was each move's form clean? A move that was not keeps its weight and reps next time (G6 K-31,
 * K-217). Clean is the default: the question is asked, never assumed against the user.
 */
export function FinishForm({ moves, unclean, onMark, onFinish, onBack, busy }: Props) {
  const { color } = useTheme();
  return (
    <View style={styles.form}>
      <Text style={[styles.heading, { color: color.text }]}>{t('workout.form.title')}</Text>
      <Text style={[styles.text, { color: color.textSecondary }]}>{t('workout.form.note')}</Text>
      {moves.map((id) => (
        <View key={id} style={styles.move}>
          <Text style={[styles.text, styles.name, { color: color.text }]}>{exerciseName(id)}</Text>
          <Chip
            label={t('workout.form.clean')}
            accessibilityLabel={`${exerciseName(id)}: ${t('workout.form.clean')}`}
            selected={!unclean.has(id)}
            onPress={() => onMark(id, true)}
          />
          <Chip
            label={t('workout.form.unclean')}
            accessibilityLabel={`${exerciseName(id)}: ${t('workout.form.unclean')}`}
            selected={unclean.has(id)}
            onPress={() => onMark(id, false)}
          />
        </View>
      ))}
      <Button label={t('workout.finishNow')} onPress={onFinish} disabled={busy} />
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
