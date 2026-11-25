import { useEffect, useRef, useState } from 'react';
import { type AccessibilityActionEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { haptics } from './haptics';
import { workoutParams } from './params';
import type { RestBand } from './restBand';
import { bandText, restText } from './session';

const ACTIONS = [{ name: 'increment' }, { name: 'decrement' }];

/**
 * The rest after a set, counting DOWN to its end (Evre 7 C2; it counted up before), and since K-1207 the one big thing on the screen
 * while it runs: the clock and nothing else of its own. From the low end of the band to aim for (G1 K-49, 2 minutes; or the user's own value, K-1214), with the band (2-3 min) said quietly under the clock. It runs from a
 * timestamp, so it is right again whenever the app comes back to the front. The last seconds are felt, not read: a light tick on each
 * of the last `rest_tick_last_seconds`, a stronger one at zero. Past its end it says so, calmly, in the accent (the clock is what the
 * accent is for), and waits: nothing blames a longer rest. A tap on the minus or plus beside it, or a press and hold on the clock, makes this rest 15 seconds shorter or longer
 * (`onAdjust` moves the timer in the background with it); a minus and a plus beside the clock do the same with a tap; a screen reader swipes it up or down. Ending the rest is the screen's Ready.
 */
export function RestTimer({ since, band, onAdjust, shift }: { since: number; band: RestBand; onAdjust?: (seconds: number) => void; shift?: number }) {
  const { color } = useTheme();
  const [now, setNow] = useState(() => Date.now());
  // The change the user made to this rest, in seconds: a new rest starts from the band again.
  const [adjusted, setAdjusted] = useState<{ since: number; seconds: number }>({ since, seconds: 0 });
  const [adjusting, setAdjusting] = useState(false);
  // `shift` is the change as the screen holds it (K-1215: the lock screen's -15/+15 move the same rest); without it the timer keeps its own.
  const change = shift ?? (adjusted.since === since ? adjusted.seconds : 0);
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);
  const elapsed = Math.floor((now - since) / 1000);
  const left = band.low + change - elapsed;
  const over = left <= 0;
  // Past the band's upper end (a fixed value has none): said once, plainly. The band moves with the user's 15 s changes.
  const past = band.high !== null && elapsed >= band.high + change;
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
  // Visible next to the clock (review of K-1207): 15 seconds either way is a tap; the press and hold on the clock stays as the other way.
  const step15 = (by: number, key: 'less' | 'more') => (
    <Button
      label={t(`workout.rest.${key}`, { seconds: step })}
      accessibilityLabel={t(`workout.rest.${key}Label`, { seconds: step })}
      variant="secondary"
      size="touch"
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
  // One quiet line under the clock: the band while it counts, then what the clock has reached (no word of blame, U7).
  const line =
    past && band.high !== null ? (
      <Text style={[styles.label, { color: color.muted }]}>{t('workout.rest.past', { high: restText(band.high + change) })}</Text>
    ) : over ? (
      <Text style={[styles.label, { color: color.muted }]}>{t('workout.rest.over')}</Text>
    ) : band.high !== null ? (
      <Text testID="rest-band" style={[styles.label, { color: color.muted }]}>
        {bandText(band.low + change, band.high + change)}
      </Text>
    ) : null;
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
        <Text style={[styles.time, { color: over ? color.accent : color.text }]}>
          {time}
        </Text>
      </Pressable>
      {line}
      {/* One centred row under the clock, never over its digits (simulator check of K-1207). */}
      <View testID="rest-steps" style={styles.line}>
        {step15(-step, 'less')}
        {step15(step, 'more')}
      </View>
      {sheet}
    </View>
  );
}

const styles = StyleSheet.create({
  rest: { alignItems: 'center', gap: tokens.space.sm, paddingVertical: tokens.space.xl },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: tokens.space.md },
  time: { flexShrink: 1, fontFamily: tokens.font.display, fontSize: tokens.type.restClock, fontVariant: ['tabular-nums'], textAlign: 'center' },
  label: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  title: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  pair: { flexDirection: 'row', gap: tokens.space.sm },
  grow: { flex: 1 },
});
