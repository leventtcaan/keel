import { Pressable, StyleSheet, Text, View } from 'react-native';

import { announce } from '@/components/ProblemText';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { canStepMinutes, steppedMinutes } from './cardio';

/**
 * The cardio minutes, a step at a time (Edit › Cardio, K-970; "+ > Cardio", K-980): less, the number, more. The step and the
 * bounds are the program parameters (`cardio_minutes_step`, `cardio_minutes_max`); a button is off where it would not move
 * the number. One adjustable element for VoiceOver (swipe up or down), and the new number is said.
 */
export function MinutesStepper({ minutes, onChange }: { minutes: number; onChange: (minutes: number) => void }) {
  const { color } = useTheme();
  const draft = { minutes, sessions: [] };
  const text = t('train.cardioMinutes', { minutes });
  const stepTo = (by: number) => {
    const next = steppedMinutes(draft, by).minutes;
    onChange(next);
    announce(t('train.cardioMinutes', { minutes: next }));
  };
  const step = (by: number, which: 'less' | 'more') => {
    const can = canStepMinutes(draft, by);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(`programEditor.${which}Label`, { what: t('editProgram.cardio.minutesLabel') })}
        accessibilityState={{ disabled: !can }}
        disabled={!can}
        onPress={() => stepTo(by)}
        style={[styles.step, !can && styles.dim]}>
        <Text style={[styles.text, styles.bold, { color: color.text }]}>{t(`programEditor.${which}`)}</Text>
      </Pressable>
    );
  };
  return (
    <View style={[styles.minutes, { backgroundColor: color.surface }]}>
      {step(-1, 'less')}
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={t('editProgram.cardio.minutesLabel')}
        accessibilityValue={{ text }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          const by = event.nativeEvent.actionName === 'increment' ? 1 : -1;
          if (canStepMinutes(draft, by)) stepTo(by);
        }}>
        <Text style={[styles.text, styles.bold, { color: color.text }]}>{text}</Text>
      </View>
      {step(1, 'more')}
    </View>
  );
}

const styles = StyleSheet.create({
  minutes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: tokens.radius.button },
  step: { minWidth: tokens.size.touch, minHeight: tokens.size.touch, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: tokens.type.body },
  bold: { fontWeight: tokens.weight.semibold },
  dim: { opacity: tokens.opacity.dim },
});
