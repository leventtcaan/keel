import { useEffect, useRef, useState } from 'react';
import { type AccessibilityActionEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { haptics } from './haptics';
import { workoutParams } from './params';
import { restText } from './session';

const ACTIONS = [{ name: 'increment' }, { name: 'decrement' }];

/**
 * The rest after a set, counting DOWN to its end (Evre 7 C2; it counted up before), and since K-1207 the one big thing on the screen
 * while it runs: the clock and nothing else of its own. From the low end of the band to aim for (G1 K-49, 2 minutes). It runs from a
 * timestamp, so it is right again whenever the app comes back to the front. The last seconds are felt, not read: a light tick on each
 * of the last `rest_tick_last_seconds`, a stronger one at zero. Past its end it says so, calmly, in the accent (the clock is what the
 * accent is for), and waits: nothing blames a longer rest. A press and hold on the clock makes this rest 15 seconds shorter or longer
 * (`onAdjust` moves the timer in the background with it); a screen reader swipes it up or down. Ending the rest is the screen's Ready.
 */
export function RestTimer({ since, onAdjust }: { since: number; onAdjust?: (seconds: number) => void }) {
  const { color } = useTheme();
  const [now, setNow] = useState(() => Date.now());
  // The change the user made to this rest, in seconds: a new rest starts from the band again.
  const [adjusted, setAdjusted] = useState<{ since: number; seconds: number }>({ since, seconds: 0 });
  const [adjusting, setAdjusting] = useState(false);
  const change = adjusted.since === since ? adjusted.seconds : 0;
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);
  const left = workoutParams.restSecondsMin + change - Math.floor((now - since) / 1000);
  const over = left <= 0;
  const step = workoutParams.restAdjustSeconds;
  // The last seconds, once each: the clock is read once a second, and a second already felt is not felt again.
  const felt = useRef<number | null>(null);
  useEffect(() => {
    if (felt.current === left) return;
    felt.current = left;
    if (left === 0) haptics.restEnd();
    else if (left > 0 && left <= workoutParams.restTickLastSeconds) haptics.restTick();
  }, [left]);
  const adjust = (by: number) => {
    setAdjusted({ since, seconds: change + by });
    onAdjust?.(change + by);
  };
  const time = restText(Math.max(0, left));
  const spoken = ({ nativeEvent: { actionName } }: AccessibilityActionEvent) => {
    if (actionName === 'increment') adjust(step);
    else if (actionName === 'decrement') adjust(-step);
  };
  const row = (by: number, key: 'less' | 'more') => (
    <Button
      label={t(`workout.rest.${key}`, { seconds: step })}
      accessibilityLabel={t(`workout.rest.${key}Label`, { seconds: step })}
      variant="secondary"
      onPress={() => adjust(by)}
    />
  );
  const sheet = !adjusting ? null : (
    <BottomSheet onClose={() => setAdjusting(false)} testID="rest-adjust">
      <Text style={[styles.title, { color: color.text }]}>{t('workout.rest.adjustTitle')}</Text>
      <View style={styles.pair}>
        <View style={styles.grow}>{row(-step, 'less')}</View>
        <View style={styles.grow}>{row(step, 'more')}</View>
      </View>
    </BottomSheet>
  );
  return (
    <View testID="rest" accessibilityRole="timer" style={styles.rest}>
      <Pressable
        testID="rest-clock"
        accessibilityRole="adjustable"
        accessibilityLabel={t('workout.rest.label')}
        accessibilityValue={{ text: time }}
        accessibilityHint={t('workout.rest.adjustHint')}
        accessibilityActions={ACTIONS}
        onAccessibilityAction={spoken}
        onLongPress={() => setAdjusting(true)}
        delayLongPress={400}>
        <Text style={[styles.time, { color: over ? color.accent : color.text }]}>{time}</Text>
      </Pressable>
      {over ? <Text style={[styles.label, { color: color.muted }]}>{t('workout.rest.over')}</Text> : null}
      {sheet}
    </View>
  );
}

const styles = StyleSheet.create({
  rest: { alignItems: 'center', gap: tokens.space.sm, paddingVertical: tokens.space.xl },
  time: { fontFamily: tokens.font.display, fontSize: tokens.type.restClock, fontVariant: ['tabular-nums'], textAlign: 'center' },
  label: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  title: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  pair: { flexDirection: 'row', gap: tokens.space.sm },
  grow: { flex: 1 },
});
