import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { workoutParams } from './params';
import { restText } from './session';

/**
 * The rest after a set, counting DOWN to its end (Evre 7 C2; it counted up before): from the low end of the band to aim for (G1 K-49,
 * 2 minutes), made shorter or longer by 15 seconds a tap (`onAdjust` moves the timer in the background with it), with a way to end
 * it. It runs from a timestamp, so it is right again whenever the app comes back to the front. Past its end it says so, calmly,
 * and waits: nothing blames a longer rest. The session puts it at the foot, in the dock above Log set (the card above it never
 * moves).
 */
export function RestTimer({ since, onEnd, onAdjust }: { since: number; onEnd: () => void; onAdjust?: (seconds: number) => void }) {
  const { color } = useTheme();
  const [now, setNow] = useState(() => Date.now());
  // The change the user made to this rest, in seconds: a new rest starts from the band again.
  const [adjusted, setAdjusted] = useState<{ since: number; seconds: number }>({ since, seconds: 0 });
  const change = adjusted.since === since ? adjusted.seconds : 0;
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);
  const left = workoutParams.restSecondsMin + change - Math.floor((now - since) / 1000);
  const over = left <= 0;
  const step = workoutParams.restAdjustSeconds;
  const adjust = (by: number) => {
    setAdjusted({ since, seconds: change + by });
    onAdjust?.(change + by);
  };
  const stepper = (by: number, key: 'less' | 'more') => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(`workout.rest.${key}Label`, { seconds: step })}
      onPress={() => adjust(by)}
      style={({ pressed }) => [styles.step, { backgroundColor: color.background }, pressed && styles.dim]}>
      <Text style={[styles.endText, { color: color.text }]}>{t(`workout.rest.${key}`, { seconds: step })}</Text>
    </Pressable>
  );
  return (
    <View testID="rest" accessibilityRole="timer" style={[styles.rest, { backgroundColor: color.surface }]}>
      {stepper(-step, 'less')}
      <View style={styles.middle}>
        <Text style={[styles.time, { color: over ? color.accent : color.text }]}>{restText(Math.max(0, left))}</Text>
        <Text style={[styles.label, { color: color.muted }]}>{t(over ? 'workout.rest.over' : 'workout.rest.label')}</Text>
      </View>
      {stepper(step, 'more')}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('workout.rest.endLabel')}
        onPress={onEnd}
        style={({ pressed }) => [styles.end, { backgroundColor: color.background }, pressed && styles.dim]}>
        <Text style={[styles.endText, { color: color.text }]}>{t('workout.rest.end')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  rest: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, padding: tokens.space.sm, borderRadius: tokens.radius.card },
  middle: { flex: 1, alignItems: 'center' },
  time: { fontFamily: tokens.font.display, fontSize: tokens.type.decisionTitle, fontVariant: ['tabular-nums'] },
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
  step: { minHeight: tokens.size.touch, minWidth: tokens.size.touch, paddingHorizontal: tokens.space.sm, borderRadius: tokens.radius.button, alignItems: 'center', justifyContent: 'center' },
  end: {
    minHeight: tokens.size.touch,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endText: { fontSize: tokens.type.buttonSmall, fontWeight: tokens.weight.bold },
  dim: { opacity: tokens.opacity.dim },
});
