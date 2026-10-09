import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { workoutParams } from './params';
import { restText } from './session';

/**
 * Rest since the last set, counting up, with the band to aim for (G1 K-49: 2-3 minutes), and a way to end it. It runs
 * while the screen is open; the timer in the background and on the lock screen are K-411. The session puts it at the top,
 * above the page and never over it (ADR-075 #1).
 */
export function RestTimer({ since, onEnd }: { since: number; onEnd: () => void }) {
  const { color } = useTheme();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);
  const seconds = Math.max(0, Math.floor((now - since) / 1000));
  return (
    <View testID="rest" accessibilityRole="timer" style={[styles.rest, { backgroundColor: color.surface }]}>
      <Text style={[styles.time, { color: color.text }]}>{restText(seconds)}</Text>
      <Text style={[styles.label, { color: color.muted }]}>
        {t('workout.rest.label', { min: restText(workoutParams.restSecondsMin), max: restText(workoutParams.restSecondsMax) })}
      </Text>
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
  rest: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md, padding: tokens.space.sm, borderRadius: tokens.radius.card },
  time: { fontFamily: tokens.font.display, fontSize: tokens.type.decisionTitle },
  label: { flex: 1, fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
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
