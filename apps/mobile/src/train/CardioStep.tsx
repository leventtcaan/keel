import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { InsightLine } from './InsightLine';

type Props = {
  /** The program's minutes for today, as the server sent them (the coach's default or the person's own). */
  minutes: number;
  /** The short version of today's workout: the cardio is optional (ADR-073 #5). */
  optional: boolean;
  /** What was chosen, said; null before a choice. */
  said: string | null;
};

/**
 * The session's last step (ADR-074 #3, ADR-075 #6, prototype `cardioScreen`): the cardio the program plans after the weights,
 * in minutes and an easy pace (the talk test, G2 K-33; no sprints, K-34). Never a calorie number: that is the watch's
 * alone (ADR-074 #5) and the session's end shows it. The buttons are the screen's dock, so they never move.
 */
export function CardioStep({ minutes, optional, said }: Props) {
  const { color } = useTheme();
  return (
    <View testID="cardio-step" style={styles.step}>
      <View style={styles.head}>
        <View style={[styles.thumb, { backgroundColor: color.surface }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <SymbolView name="figure.run" size={tokens.type.heading} tintColor={color.text} />
        </View>
        <View style={styles.grow}>
          <Text accessibilityRole="header" style={[styles.name, { color: color.text }]}>
            {t('workout.cardio.title')}
          </Text>
          <Text style={[styles.small, { color: color.textSecondary }]}>{t('workout.cardio.length', { minutes })}</Text>
          {optional && <Text style={[styles.small, { color: color.muted }]}>{t('workout.cardio.optional')}</Text>}
        </View>
      </View>
      <View style={[styles.pace, { backgroundColor: color.surface }]}>
        <View style={styles.grow}>
          <Text style={[styles.kicker, { color: color.textSecondary }]}>{t('workout.cardio.pace')}</Text>
          <Text style={[styles.value, { color: color.text }]}>{t('workout.cardio.talk')}</Text>
        </View>
        <Text style={[styles.kicker, styles.note, { color: color.textSecondary }]}>{t('workout.cardio.talkNote')}</Text>
      </View>
      <Text style={[styles.small, { color: color.textSecondary }]}>{t('workout.cardio.after')}</Text>
      <Text style={[styles.small, { color: color.textSecondary }]}>{t('workout.cardio.forms')}</Text>
      {said !== null && <InsightLine text={said} />}
    </View>
  );
}

const styles = StyleSheet.create({
  step: { gap: tokens.space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md },
  thumb: { width: tokens.size.primaryButton, height: tokens.size.primaryButton, borderRadius: tokens.radius.card, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1, gap: tokens.space.xs },
  name: { fontFamily: tokens.font.display, fontSize: tokens.type.heading },
  small: { fontSize: tokens.type.bodySmall },
  pace: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, padding: tokens.space.sm, borderRadius: tokens.radius.card },
  kicker: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.bold },
  value: { fontFamily: tokens.font.display, fontSize: tokens.type.heading },
  note: { flexShrink: 1, maxWidth: '55%', textAlign: 'right' },
});
