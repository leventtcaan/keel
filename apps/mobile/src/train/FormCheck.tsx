import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Props = {
  /** The move's name as the card shows it. */
  name: string;
  clean: boolean;
  onMark: (clean: boolean) => void;
};

/**
 * A move's form, asked on its card once its last set is done (9b; ADR-094 Ek 2 › Uygulama #5), while the move is fresh: clean is picked,
 * so the way on (Next, in the dock) is one tap as before; a move whose form was not clean keeps its weight and reps next time (G6 K-31,
 * K-217). The question is asked, never assumed against the person.
 */
export function FormCheck({ name, clean, onMark }: Props) {
  const { color } = useTheme();
  return (
    <View testID="form-check" accessibilityHint={t('workout.form.note')} style={[styles.box, { backgroundColor: color.surface }]}>
      <Text style={[styles.title, { color: color.text }]}>{t('workout.form.title')}</Text>
      <View style={styles.choices}>
        <View style={styles.grow}>
          <Chip touch label={t('workout.form.clean')} accessibilityLabel={`${name}: ${t('workout.form.clean')}`} selected={clean} onPress={() => onMark(true)} />
        </View>
        <View style={styles.grow}>
          <Chip touch label={t('workout.form.unclean')} accessibilityLabel={`${name}: ${t('workout.form.unclean')}`} selected={!clean} onPress={() => onMark(false)} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: tokens.space.sm, padding: tokens.space.md, borderRadius: tokens.radius.card },
  title: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  choices: { flexDirection: 'row', gap: tokens.space.sm },
  grow: { flex: 1 },
});
